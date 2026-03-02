package hello.shiritori.domain.session.controller;

import hello.shiritori.domain.session.dto.SessionResponse;
import hello.shiritori.domain.session.service.JwtSessionResolver;
import hello.shiritori.domain.session.service.SessionService;
import hello.shiritori.global.api.ApiResponse;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
public class SessionController {

    private final SessionService sessionService;
    private final JwtSessionResolver jwtSessionResolver;

    @GetMapping
    public ApiResponse<List<SessionResponse>> getMySessions(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        String currentSessionId = jwtSessionResolver.resolveSessionId(jwt);
        return ApiResponse.ok("세션 목록 조회 성공", sessionService.getSessions(userId, currentSessionId));
    }

    @DeleteMapping("/me")
    public ApiResponse<Void> revokeCurrentSession(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        String currentSessionId = jwtSessionResolver.resolveSessionId(jwt);
        sessionService.revokeSession(userId, currentSessionId);
        return ApiResponse.ok("현재 세션이 로그아웃 처리되었습니다.", null);
    }

    @DeleteMapping("/{sessionId}")
    public ApiResponse<Void> revokeSession(@AuthenticationPrincipal Jwt jwt, @PathVariable String sessionId) {
        UUID userId = UUID.fromString(jwt.getSubject());
        sessionService.revokeSession(userId, sessionId);
        return ApiResponse.ok("요청한 세션을 로그아웃 처리했습니다.", null);
    }
}
