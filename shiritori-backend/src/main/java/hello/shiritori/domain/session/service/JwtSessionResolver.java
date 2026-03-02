package hello.shiritori.domain.session.service;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class JwtSessionResolver {

    public String resolveSessionId(Jwt jwt) {
        String sessionId = firstClaim(jwt, "session_id", "sid", "jti");
        if (StringUtils.hasText(sessionId)) {
            return sessionId;
        }
        if (StringUtils.hasText(jwt.getId())) {
            return jwt.getId();
        }

        Instant issuedAt = Objects.requireNonNullElse(jwt.getIssuedAt(), Instant.EPOCH);
        return "fallback-" + UUID.nameUUIDFromBytes((jwt.getSubject() + "|" + issuedAt).getBytes());
    }

    private String firstClaim(Jwt jwt, String... claimNames) {
        for (String claimName : claimNames) {
            Object value = jwt.getClaim(claimName);
            if (value != null && StringUtils.hasText(value.toString())) {
                return value.toString();
            }
        }
        return null;
    }
}
