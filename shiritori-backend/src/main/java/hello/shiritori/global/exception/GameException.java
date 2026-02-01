package hello.shiritori.global.exception;

import org.springframework.http.HttpStatus;

public class GameException extends ShiritoriException {

    public GameException(String message, HttpStatus status) {
        super(message, status);
    }

}
