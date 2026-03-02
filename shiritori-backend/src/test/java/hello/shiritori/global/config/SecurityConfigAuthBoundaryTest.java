package hello.shiritori.global.config;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import hello.shiritori.domain.session.service.SessionService;
import hello.shiritori.domain.profile.service.ProfileService;
import hello.shiritori.domain.wordBook.service.WordBookService;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class SecurityConfigAuthBoundaryTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProfileService profileService;

    @MockitoBean
    private WordBookService wordBookService;

    @Autowired
    private SessionService sessionService;

    @Test
    void unauthenticated_profile_me_returns_401() throws Exception {
        mockMvc.perform(get("/api/profiles/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().exists("X-Request-Id"))
                .andExpect(jsonPath("$.errorCode").value("AUTH_TOKEN_INVALID"));
    }

    @Test
    void unauthenticated_wordbooks_returns_401() throws Exception {
        mockMvc.perform(get("/api/wordBooks"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("AUTH_TOKEN_INVALID"));
    }

    @Test
    void unauthenticated_wordbooks_quiz_returns_401() throws Exception {
        mockMvc.perform(get("/api/wordBooks/quiz"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("AUTH_TOKEN_INVALID"));
    }

    @Test
    void unauthenticated_ranks_me_returns_401() throws Exception {
        mockMvc.perform(get("/api/ranks/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("AUTH_TOKEN_INVALID"));
    }

    @Test
    void unauthenticated_sessions_returns_401() throws Exception {
        mockMvc.perform(get("/api/sessions"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("AUTH_TOKEN_INVALID"));
    }

    @Test
    void revoked_session_returns_401() throws Exception {
        UUID userId = UUID.randomUUID();
        String sessionId = "session-revoked-1";
        sessionService.touchSession(userId, sessionId, "device-1", "ios");
        sessionService.revokeSession(userId, sessionId);

        mockMvc.perform(get("/api/profiles/me")
                        .with(jwt().jwt(jwt -> jwt
                                .subject(userId.toString())
                                .claim("jti", sessionId))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("SESSION_REVOKED"));
    }

    @Test
    void authenticated_profile_nickname_returns_200() throws Exception {
        mockMvc.perform(post("/api/profiles/nickname")
                        .with(jwt().jwt(jwt -> jwt.subject(UUID.randomUUID().toString())))
                        .contentType(APPLICATION_JSON)
                        .content("{\"nickname\":\"shiritori\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void preflight_from_capacitor_origin_is_allowed() throws Exception {
        mockMvc.perform(options("/api/healthz")
                        .header("Origin", "capacitor://localhost")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "capacitor://localhost"));
    }

    @Test
    void preflight_from_ionic_origin_is_allowed() throws Exception {
        mockMvc.perform(options("/api/healthz")
                        .header("Origin", "ionic://localhost")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "ionic://localhost"));
    }

    @Test
    void preflight_from_https_localhost_origin_is_allowed() throws Exception {
        mockMvc.perform(options("/api/healthz")
                        .header("Origin", "https://localhost")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "https://localhost"));
    }
}
