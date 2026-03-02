package hello.shiritori.global.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Slf4j
@Component
@RequiredArgsConstructor
public class RequestContextLoggingFilter extends OncePerRequestFilter {

    private static final Pattern GAME_PATH_PATTERN = Pattern.compile("/api/games/(\\d+).*");
    private static final String REQUEST_ID_HEADER = "X-Request-Id";

    @Value("${app.logging.slow-request-ms:800}")
    private long slowRequestThresholdMs;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        long start = System.currentTimeMillis();

        String requestId = request.getHeader(REQUEST_ID_HEADER);
        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }
        response.setHeader(REQUEST_ID_HEADER, requestId);

        String userId = extractUserId();
        String gameId = extractGameId(request.getRequestURI());

        MDC.put("requestId", requestId);
        MDC.put("userId", userId);
        MDC.put("gameId", gameId);
        MDC.put("path", request.getRequestURI());
        MDC.put("method", request.getMethod());

        try {
            filterChain.doFilter(request, response);
        } finally {
            long elapsedMs = System.currentTimeMillis() - start;
            int status = response.getStatus();

            if (status >= 500) {
                log.error(
                        "ALERT_5XX requestId={} userId={} gameId={} method={} path={} status={} elapsedMs={}",
                        requestId, userId, gameId, request.getMethod(), request.getRequestURI(), status, elapsedMs
                );
            }

            if (elapsedMs >= slowRequestThresholdMs) {
                log.warn(
                        "SLOW_REQUEST requestId={} userId={} gameId={} method={} path={} status={} elapsedMs={}",
                        requestId, userId, gameId, request.getMethod(), request.getRequestURI(), status, elapsedMs
                );
            }

            MDC.remove("requestId");
            MDC.remove("userId");
            MDC.remove("gameId");
            MDC.remove("path");
            MDC.remove("method");
        }
    }

    private String extractUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication instanceof JwtAuthenticationToken jwtAuthenticationToken) {
            return jwtAuthenticationToken.getToken().getSubject();
        }
        return "anonymous";
    }

    private String extractGameId(String path) {
        Matcher matcher = GAME_PATH_PATTERN.matcher(path);
        if (!matcher.matches()) {
            return "n/a";
        }
        return matcher.group(1);
    }
}
