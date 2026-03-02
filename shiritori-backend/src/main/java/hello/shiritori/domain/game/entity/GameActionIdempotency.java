package hello.shiritori.domain.game.entity;

import hello.shiritori.domain.game.service.GameActionType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "game_action_idempotency",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_game_action_idempotency_unique",
                        columnNames = {"user_id", "game_id", "action_type", "idempotency_key"}
                )
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GameActionIdempotency {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "game_id", nullable = false)
    private Long gameId;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false, length = 16)
    private GameActionType actionType;

    @Column(name = "idempotency_key", nullable = false, length = 128)
    private String idempotencyKey;

    @Lob
    @Column(name = "response_payload")
    private String responsePayload;

    @Column(name = "expire_at", nullable = false)
    private LocalDateTime expireAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    private GameActionIdempotency(UUID userId,
                                  Long gameId,
                                  GameActionType actionType,
                                  String idempotencyKey,
                                  String responsePayload,
                                  LocalDateTime expireAt,
                                  LocalDateTime createdAt,
                                  LocalDateTime updatedAt) {
        this.userId = userId;
        this.gameId = gameId;
        this.actionType = actionType;
        this.idempotencyKey = idempotencyKey;
        this.responsePayload = responsePayload;
        this.expireAt = expireAt;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static GameActionIdempotency claim(UUID userId,
                                              Long gameId,
                                              GameActionType actionType,
                                              String idempotencyKey,
                                              LocalDateTime now,
                                              LocalDateTime expireAt) {
        return GameActionIdempotency.builder()
                .userId(userId)
                .gameId(gameId)
                .actionType(actionType)
                .idempotencyKey(idempotencyKey)
                .responsePayload(null)
                .createdAt(now)
                .updatedAt(now)
                .expireAt(expireAt)
                .build();
    }

    public void complete(String responsePayload, LocalDateTime now, LocalDateTime expireAt) {
        this.responsePayload = responsePayload;
        this.updatedAt = now;
        this.expireAt = expireAt;
    }

    public boolean hasResponsePayload() {
        return responsePayload != null && !responsePayload.isBlank();
    }
}
