package hello.shiritori.domain.game.controller;

import hello.shiritori.domain.game.dto.GameStartRequest;
import hello.shiritori.domain.game.dto.GameStartResponse;
import hello.shiritori.domain.gamTurn.dto.TurnRequest;
import hello.shiritori.domain.gamTurn.dto.TurnResponse;
import hello.shiritori.global.api.ApiResponse;
import hello.shiritori.domain.game.service.GameService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/games")
@RequiredArgsConstructor
public class GameController {

    private final GameService gameService;

    @PostMapping("/start")
    public ApiResponse<GameStartResponse> startGame(@AuthenticationPrincipal Jwt jwt,
                                                    @RequestBody GameStartRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        GameStartResponse response = gameService.start(userId, request);
        return ApiResponse.ok("게임이 시작되었습니다.", response);
    }

    @PostMapping("/{gameId}/turn")
    public ApiResponse<TurnResponse> playTurn(@PathVariable Long gameId, @RequestBody TurnRequest request) {
        TurnResponse response = gameService.playTurn(gameId, request);
        return ApiResponse.ok(response);
    }

    @PostMapping("/{gameId}/pass")
    public ApiResponse<TurnResponse> passTurn(@PathVariable Long gameId) {
        TurnResponse response = gameService.passTurn(gameId);
        return ApiResponse.ok(response);
    }

    @PostMapping("/{gameId}/quit")
    public ApiResponse<Void> quitGame(@PathVariable Long gameId) {
        gameService.quitGame(gameId);
        return ApiResponse.ok(null);
    }

}
