package hello.shiritori.domain.session.service;

import hello.shiritori.domain.session.dto.SessionResponse;
import hello.shiritori.domain.session.entity.UserSession;
import hello.shiritori.domain.session.repository.UserSessionRepository;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class SessionService {

    private final long maxIdleDays;
    private final UserSessionRepository userSessionRepository;

    public SessionService(@Value("${app.session.max-idle-days:30}") long maxIdleDays,
                          UserSessionRepository userSessionRepository) {
        this.maxIdleDays = maxIdleDays;
        this.userSessionRepository = userSessionRepository;
    }

    public void touchSession(UUID userId, String sessionId, String deviceId, String platform) {
        LocalDateTime now = LocalDateTime.now();
        purgeExpired(userId, now);
        UserSession session = userSessionRepository.findByUserIdAndSessionId(userId, sessionId)
                .orElseGet(() -> UserSession.create(userId, sessionId, normalize(deviceId), normalize(platform), now));
        session.touch(now, normalize(deviceId), normalize(platform));
        userSessionRepository.save(session);
    }

    @Transactional(readOnly = true)
    public boolean isRevoked(UUID userId, String sessionId) {
        return userSessionRepository.findByUserIdAndSessionId(userId, sessionId)
                .map(UserSession::isRevoked)
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public List<SessionResponse> getSessions(UUID userId, String currentSessionId) {
        return userSessionRepository.findByUserIdOrderByLastSeenAtDesc(userId)
                .stream()
                .sorted(Comparator.comparing(UserSession::getLastSeenAt).reversed())
                .map(session -> new SessionResponse(
                        session.getSessionId(),
                        session.getDeviceId(),
                        session.getPlatform(),
                        session.getCreatedAt(),
                        session.getLastSeenAt(),
                        session.isRevoked(),
                        session.getSessionId().equals(currentSessionId)
                ))
                .toList();
    }

    public void revokeSession(UUID userId, String sessionId) {
        LocalDateTime now = LocalDateTime.now();
        userSessionRepository.findByUserIdAndSessionId(userId, sessionId)
                .ifPresent(session -> {
                    session.revoke(now);
                    userSessionRepository.save(session);
                });
    }

    private void purgeExpired(UUID userId, LocalDateTime now) {
        LocalDateTime expireBefore = now.minusDays(maxIdleDays);
        userSessionRepository.deleteExpiredByUserId(userId, expireBefore);
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return "unknown";
        }
        return value.trim();
    }

}
