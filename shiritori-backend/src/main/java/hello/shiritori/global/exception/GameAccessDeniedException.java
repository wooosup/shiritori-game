package hello.shiritori.global.exception;

import static org.springframework.http.HttpStatus.FORBIDDEN;

public class GameAccessDeniedException extends ShiritoriException {

    private static final String MESSAGE = "게임 접근 권한이 없습니다.";

    public GameAccessDeniedException() {
        super(MESSAGE, FORBIDDEN, ErrorCode.GAME_ACCESS_DENIED);
    }
}
