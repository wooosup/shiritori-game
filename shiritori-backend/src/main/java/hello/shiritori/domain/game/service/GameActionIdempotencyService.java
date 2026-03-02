package hello.shiritori.domain.game.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import hello.shiritori.domain.game.entity.GameActionIdempotency;
import hello.shiritori.domain.game.repository.GameActionIdempotencyRepository;
import hello.shiritori.global.api.ApiResponse;
import hello.shiritori.global.exception.ErrorCode;
import hello.shiritori.global.exception.GameException;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.UnexpectedRollbackException;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class GameActionIdempotencyService {

    private final long ttlSeconds;
    private final GameActionIdempotencyRepository repository;
    private final ObjectMapper objectMapper;
    private final TransactionTemplate writeTxTemplate;

    public GameActionIdempotencyService(@Value("${app.idempotency.ttl-seconds:180}") long ttlSeconds,
                                        GameActionIdempotencyRepository repository,
                                        ObjectMapper objectMapper,
                                        PlatformTransactionManager transactionManager) {
        this.ttlSeconds = ttlSeconds;
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.writeTxTemplate = new TransactionTemplate(transactionManager);
        this.writeTxTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public <T> ApiResponse<T> execute(UUID userId,
                                      Long gameId,
                                      GameActionType actionType,
                                      String idempotencyKey,
                                      Supplier<ApiResponse<T>> action) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return action.get();
        }

        LocalDateTime now = LocalDateTime.now();
        String normalizedKey = idempotencyKey.trim();
        purgeExpired(now);

        ApiResponse<T> cached = findCompletedResponse(userId, gameId, actionType, normalizedKey);
        if (cached != null) {
            return cached;
        }

        GameActionIdempotency claim = claimOrGetExisting(userId, gameId, actionType, normalizedKey, now);
        if (claim.hasResponsePayload()) {
            return deserializeResponse(claim.getResponsePayload());
        }

        try {
            ApiResponse<T> result = action.get();
            completeClaim(claim.getId(), result);
            return result;
        } catch (RuntimeException e) {
            releaseClaim(claim.getId());
            throw e;
        }
    }

    protected void completeClaim(Long claimId, ApiResponse<?> result) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expireAt = now.plusSeconds(ttlSeconds);
        writeTxTemplate.executeWithoutResult(status -> repository.findById(claimId).ifPresent(claim -> {
            claim.complete(serializeResponse(result), now, expireAt);
            repository.save(claim);
        }));
    }

    protected void releaseClaim(Long claimId) {
        writeTxTemplate.executeWithoutResult(status -> repository.deleteById(claimId));
    }

    @SuppressWarnings("unchecked")
    protected <T> ApiResponse<T> findCompletedResponse(UUID userId,
                                                       Long gameId,
                                                       GameActionType actionType,
                                                       String idempotencyKey) {
        return repository.findByUserIdAndGameIdAndActionTypeAndIdempotencyKey(userId, gameId, actionType, idempotencyKey)
                .filter(GameActionIdempotency::hasResponsePayload)
                .map(record -> (ApiResponse<T>) deserializeResponse(record.getResponsePayload()))
                .orElse(null);
    }

    protected GameActionIdempotency claimOrGetExisting(UUID userId,
                                                       Long gameId,
                                                       GameActionType actionType,
                                                       String idempotencyKey,
                                                       LocalDateTime now) {
        LocalDateTime expireAt = now.plusSeconds(ttlSeconds);
        GameActionIdempotency claimed;
        try {
            claimed = writeTxTemplate.execute(status -> {
                try {
                    GameActionIdempotency claim = GameActionIdempotency.claim(
                            userId,
                            gameId,
                            actionType,
                            idempotencyKey,
                            now,
                            expireAt
                    );
                    return repository.saveAndFlush(claim);
                } catch (DataIntegrityViolationException duplicate) {
                    status.setRollbackOnly();
                    return null;
                }
            });
        } catch (UnexpectedRollbackException ignored) {
            claimed = null;
        }
        if (claimed == null) {
            return waitForExistingRecord(userId, gameId, actionType, idempotencyKey);
        }
        return claimed;
    }

    private GameActionIdempotency waitForExistingRecord(UUID userId,
                                                        Long gameId,
                                                        GameActionType actionType,
                                                        String idempotencyKey) {
        for (int i = 0; i < 20; i++) {
            GameActionIdempotency existing = repository.findByUserIdAndGameIdAndActionTypeAndIdempotencyKey(
                    userId, gameId, actionType, idempotencyKey
            ).orElse(null);

            if (existing == null) {
                break;
            }

            if (existing.hasResponsePayload()) {
                return existing;
            }

            try {
                Thread.sleep(30L);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        throw new GameException(
                "동일 요청이 처리 중입니다. 잠시 후 다시 시도해주세요.",
                org.springframework.http.HttpStatus.CONFLICT,
                ErrorCode.IDEMPOTENCY_IN_PROGRESS
        );
    }

    protected void purgeExpired(LocalDateTime now) {
        writeTxTemplate.executeWithoutResult(status -> repository.deleteExpired(now));
    }

    private String serializeResponse(ApiResponse<?> response) {
        try {
            CachedApiResponse payload = new CachedApiResponse(
                    response.getCode(),
                    response.getStatus(),
                    response.getErrorCode(),
                    response.getMessage(),
                    response.getData()
            );
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("멱등 응답 직렬화에 실패했습니다.", e);
        }
    }

    @SuppressWarnings("unchecked")
    private <T> ApiResponse<T> deserializeResponse(String payload) {
        try {
            CachedApiResponse cached = objectMapper.readValue(payload, CachedApiResponse.class);
            return (ApiResponse<T>) ApiResponse.fromCached(
                    cached.code(),
                    cached.status(),
                    cached.errorCode(),
                    cached.message(),
                    cached.data()
            );
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("멱등 응답 역직렬화에 실패했습니다.", e);
        }
    }

    private record CachedApiResponse(
            int code,
            String status,
            String errorCode,
            String message,
            Object data
    ) {
    }
}
