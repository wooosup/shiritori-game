package hello.shiritori.domain.session.dto;

import java.time.LocalDateTime;

public record SessionResponse(
        String sessionId,
        String deviceId,
        String platform,
        LocalDateTime createdAt,
        LocalDateTime lastSeenAt,
        boolean revoked,
        boolean current
) {
}
