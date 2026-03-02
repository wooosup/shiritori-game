package hello.shiritori.global.exception;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

import org.springframework.http.HttpStatus;

public class GameException extends ShiritoriException {

    public GameException(String message) {
        super(message, BAD_REQUEST, ErrorCode.GAME_BAD_REQUEST);
    }

    public GameException(String message, HttpStatus status, String errorCode) {
        super(message, status, errorCode);
    }

}
