package hello.shiritori.global.interceptor;

import static hello.shiritori.domain.game.entity.JlptLevel.N5;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import hello.shiritori.domain.game.entity.Game;
import hello.shiritori.domain.game.service.GameService;
import hello.shiritori.domain.gameTurn.dto.TurnResponse;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class RateLimitInterceptorTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private GameService gameService;

    @Test
    void rate_limit_exceeded_returns_api_response_json() throws Exception {
        Game game = Game.create(null, N5);
        TurnResponse response = TurnResponse.ofUserLose(game, null, "테스트");
        when(gameService.playTurn(any(), anyLong(), any())).thenReturn(response);

        for (int i = 0; i < 10; i++) {
            mockMvc.perform(post("/api/games/1/turn")
                            .with(jwt().jwt(jwt -> jwt.subject(UUID.randomUUID().toString())))
                            .with(request -> {
                                request.setRemoteAddr("10.8.0.1");
                                return request;
                            })
                            .contentType(APPLICATION_JSON)
                            .content("{\"word\":\"くも\"}"))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(post("/api/games/1/turn")
                        .with(jwt().jwt(jwt -> jwt.subject(UUID.randomUUID().toString())))
                        .with(request -> {
                            request.setRemoteAddr("10.8.0.1");
                            return request;
                        })
                        .contentType(APPLICATION_JSON)
                        .content("{\"word\":\"くも\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value(429))
                .andExpect(jsonPath("$.status").value("TOO_MANY_REQUESTS"));
    }
}
