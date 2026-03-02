package hello.shiritori.domain.game.controller;

import hello.shiritori.domain.game.dto.GameStartRequest;
import hello.shiritori.domain.game.dto.GameStartResponse;
import hello.shiritori.domain.game.service.GameActionIdempotencyService;
import hello.shiritori.domain.game.service.GameActionType;
import hello.shiritori.domain.gameTurn.dto.TurnRequest;
import hello.shiritori.domain.gameTurn.dto.TurnResponse;
import hello.shiritori.global.api.ApiResponse;
import hello.shiritori.domain.game.service.GameService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/games")
@RequiredArgsConstructor
public class GameController {

    private final GameService gameService;
    private final GameActionIdempotencyService gameActionIdempotencyService;

    @PostMapping("/start")
    public ApiResponse<GameStartResponse> startGame(@AuthenticationPrincipal Jwt jwt,
                                                    @RequestBody GameStartRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        GameStartResponse response = gameService.start(userId, request);
        return ApiResponse.ok("게임이 시작되었습니다.", response);
    }

    @PostMapping("/{gameId}/turn")
    public ApiResponse<TurnResponse> playTurn(@AuthenticationPrincipal Jwt jwt,
                                              @PathVariable Long gameId,
                                              @RequestBody TurnRequest request,
                                              @RequestHeader(
                                                      value = "Idempotency-Key",
                                                      required = false
                                              ) String idempotencyKey) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return gameActionIdempotencyService.execute(
                userId,
                gameId,
                GameActionType.TURN,
                idempotencyKey,
                () -> ApiResponse.ok(gameService.playTurn(userId, gameId, request))
        );
    }

    @PostMapping("/{gameId}/pass")
    public ApiResponse<TurnResponse> passTurn(@AuthenticationPrincipal Jwt jwt,
                                              @PathVariable Long gameId,
                                              @RequestHeader(
                                                      value = "Idempotency-Key",
                                                      required = false
                                              ) String idempotencyKey) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return gameActionIdempotencyService.execute(
                userId,
                gameId,
                GameActionType.PASS,
                idempotencyKey,
                () -> ApiResponse.ok(gameService.passTurn(userId, gameId))
        );
    }

    @PostMapping("/{gameId}/timeout")
    public ApiResponse<TurnResponse> timeoutGame(@AuthenticationPrincipal Jwt jwt,
                                                 @PathVariable Long gameId,
                                                 @RequestHeader(
                                                         value = "Idempotency-Key",
                                                         required = false
                                                 ) String idempotencyKey) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return gameActionIdempotencyService.execute(
                userId,
                gameId,
                GameActionType.TIMEOUT,
                idempotencyKey,
                () -> ApiResponse.ok(gameService.timeoutGame(userId, gameId))
        );
    }

    @PostMapping("/{gameId}/quit")
    public ApiResponse<Void> quitGame(@AuthenticationPrincipal Jwt jwt,
                                      @PathVariable Long gameId,
                                      @RequestHeader(
                                              value = "Idempotency-Key",
                                              required = false
                                      ) String idempotencyKey) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return gameActionIdempotencyService.execute(
                userId,
                gameId,
                GameActionType.QUIT,
                idempotencyKey,
                () -> {
                    gameService.quitGame(userId, gameId);
                    return ApiResponse.ok(null);
                }
        );
    }

}
