package hello.shiritori.global.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import hello.shiritori.domain.session.service.JwtSessionResolver;
import hello.shiritori.domain.session.service.SessionService;
import hello.shiritori.global.api.ApiResponse;
import hello.shiritori.global.exception.ErrorCode;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Slf4j
@Component
@RequiredArgsConstructor
public class SessionTrackingFilter extends OncePerRequestFilter {

    private static final String DEVICE_ID_HEADER = "X-Device-Id";
    private static final String PLATFORM_HEADER = "X-Client-Platform";

    private final SessionService sessionService;
    private final JwtSessionResolver jwtSessionResolver;
    private final ObjectMapper objectMapper;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication instanceof JwtAuthenticationToken jwtAuthenticationToken) {
            String subject = jwtAuthenticationToken.getToken().getSubject();
            if (subject != null) {
                UUID userId;
                try {
                    userId = UUID.fromString(subject);
                } catch (IllegalArgumentException e) {
                    log.warn("세션 추적 실패: UUID 형식이 아닌 subject={}, path={}", subject, request.getRequestURI());
                    filterChain.doFilter(request, response);
                    return;
                }
                String sessionId = jwtSessionResolver.resolveSessionId(jwtAuthenticationToken.getToken());

                if (sessionService.isRevoked(userId, sessionId)) {
                    log.warn("취소된 세션 접근 차단: userId={}, sessionId={}, path={}", userId, sessionId, request.getRequestURI());
                    writeRevokedSessionResponse(response);
                    return;
                }

                String deviceId = request.getHeader(DEVICE_ID_HEADER);
                String platform = request.getHeader(PLATFORM_HEADER);
                sessionService.touchSession(userId, sessionId, deviceId, platform);
            }
        }

        filterChain.doFilter(request, response);
    }

    private void writeRevokedSessionResponse(HttpServletResponse response) throws IOException {
        HttpStatus status = HttpStatus.UNAUTHORIZED;
        ApiResponse<Void> body = ApiResponse.fail(
                status,
                ErrorCode.SESSION_REVOKED,
                "세션이 만료되었거나 로그아웃되었습니다. 다시 로그인해주세요."
        );
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
