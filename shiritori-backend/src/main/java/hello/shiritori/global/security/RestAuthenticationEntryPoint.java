package hello.shiritori.global.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import hello.shiritori.global.api.ApiResponse;
import hello.shiritori.global.exception.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        HttpStatus status = HttpStatus.UNAUTHORIZED;
        String errorCode = ErrorCode.AUTH_TOKEN_INVALID;
        String message = "인증 토큰이 필요합니다.";

        if (isExpiredToken(authException)) {
            errorCode = ErrorCode.AUTH_TOKEN_EXPIRED;
            message = "인증 토큰이 만료되었습니다. 다시 로그인해주세요.";
        } else if (authException instanceof BadCredentialsException || authException instanceof OAuth2AuthenticationException) {
            message = "유효하지 않은 인증 토큰입니다.";
        }

        log.warn("인증 실패: path={}, message={}", request.getRequestURI(), authException.getMessage());
        writeResponse(response, status, ApiResponse.fail(status, errorCode, message));
    }

    private boolean isExpiredToken(AuthenticationException authException) {
        if (authException instanceof InvalidBearerTokenException && authException.getMessage() != null) {
            return authException.getMessage().toLowerCase().contains("expired");
        }
        Throwable cause = authException.getCause();
        return cause != null && cause.getMessage() != null && cause.getMessage().toLowerCase().contains("expired");
    }

    private void writeResponse(HttpServletResponse response, HttpStatus status, ApiResponse<Void> body) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
