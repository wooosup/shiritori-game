package hello.shiritori.domain.game.controller;

import static hello.shiritori.domain.game.entity.JlptLevel.N5;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
class GameControllerIdempotencyTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private GameService gameService;

    @Test
    void duplicate_pass_request_with_same_idempotency_key_is_applied_once() throws Exception {
        Game game = Game.create(null, N5);
        TurnResponse passResponse = TurnResponse.ofUserLose(game, null, "ok");

        when(gameService.passTurn(any(), org.mockito.ArgumentMatchers.eq(1L)))
                .thenReturn(passResponse);

        UUID userId = UUID.randomUUID();

        mockMvc.perform(post("/api/games/1/pass")
                        .header("Idempotency-Key", "pass-key-1")
                        .with(jwt().jwt(jwt -> jwt.subject(userId.toString()))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/games/1/pass")
                        .header("Idempotency-Key", "pass-key-1")
                        .with(jwt().jwt(jwt -> jwt.subject(userId.toString()))))
                .andExpect(status().isOk());

        verify(gameService, times(1)).passTurn(any(), org.mockito.ArgumentMatchers.eq(1L));
    }
}
