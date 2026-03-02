package hello.shiritori.domain.game.controller;

import static hello.shiritori.domain.game.entity.JlptLevel.N5;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
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
class GameControllerTimeoutTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private GameService gameService;

    @Test
    void timeout_endpoint_finishes_game_as_game_over_response() throws Exception {
        Game game = Game.create(null, N5);
        game.finish(hello.shiritori.domain.game.entity.GameStatus.TIME_OVER);
        TurnResponse timeoutResponse = TurnResponse.ofUserLose(game, null, "시간 초과! 게임이 종료되었습니다.");

        when(gameService.timeoutGame(any(), org.mockito.ArgumentMatchers.eq(1L))).thenReturn(timeoutResponse);

        mockMvc.perform(post("/api/games/1/timeout")
                        .with(jwt().jwt(jwt -> jwt.subject(UUID.randomUUID().toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.status").value("GAME_OVER"))
                .andExpect(jsonPath("$.data.message").value("시간 초과! 게임이 종료되었습니다."));
    }
}
