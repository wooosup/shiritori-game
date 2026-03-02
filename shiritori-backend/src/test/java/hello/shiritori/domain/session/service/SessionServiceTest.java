package hello.shiritori.domain.session.service;

import static org.assertj.core.api.Assertions.assertThat;

import hello.shiritori.domain.session.dto.SessionResponse;
import hello.shiritori.domain.session.repository.UserSessionRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class SessionServiceTest {

    @Autowired
    private SessionService sessionService;

    @Autowired
    private UserSessionRepository userSessionRepository;

    @BeforeEach
    void clear() {
        userSessionRepository.deleteAll();
    }

    @Test
    void list_sessions_marks_current_session() {
        UUID userId = UUID.randomUUID();

        sessionService.touchSession(userId, "session-A", "device-A", "ios");
        sessionService.touchSession(userId, "session-B", "device-B", "android");

        List<SessionResponse> sessions = sessionService.getSessions(userId, "session-B");

        assertThat(sessions).hasSize(2);
        assertThat(sessionService.getSessions(userId, "session-B").stream().anyMatch(SessionResponse::current)).isTrue();
    }

    @Test
    void revoked_session_is_detected() {
        UUID userId = UUID.randomUUID();

        sessionService.touchSession(userId, "session-1", "device-1", "ios");
        sessionService.revokeSession(userId, "session-1");

        assertThat(sessionService.isRevoked(userId, "session-1")).isTrue();
    }
}
