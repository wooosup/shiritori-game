package hello.shiritori.domain.session.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
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
        name = "user_sessions",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_user_sessions_user_session",
                        columnNames = {"user_id", "session_id"}
                )
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "session_id", nullable = false, length = 128)
    private String sessionId;

    @Column(name = "device_id", nullable = false, length = 128)
    private String deviceId;

    @Column(name = "platform", nullable = false, length = 32)
    private String platform;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "last_seen_at", nullable = false)
    private LocalDateTime lastSeenAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    @Builder
    private UserSession(UUID userId,
                        String sessionId,
                        String deviceId,
                        String platform,
                        LocalDateTime createdAt,
                        LocalDateTime lastSeenAt,
                        LocalDateTime revokedAt) {
        this.userId = userId;
        this.sessionId = sessionId;
        this.deviceId = deviceId;
        this.platform = platform;
        this.createdAt = createdAt;
        this.lastSeenAt = lastSeenAt;
        this.revokedAt = revokedAt;
    }

    public static UserSession create(UUID userId, String sessionId, String deviceId, String platform, LocalDateTime now) {
        return UserSession.builder()
                .userId(userId)
                .sessionId(sessionId)
                .deviceId(deviceId)
                .platform(platform)
                .createdAt(now)
                .lastSeenAt(now)
                .build();
    }

    public void touch(LocalDateTime now, String deviceId, String platform) {
        this.lastSeenAt = now;
        this.deviceId = deviceId;
        this.platform = platform;
    }

    public void revoke(LocalDateTime now) {
        this.revokedAt = now;
        this.lastSeenAt = now;
    }

    public boolean isRevoked() {
        return revokedAt != null;
    }
}
