package hello.shiritori.global.exception;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

public class GameException extends ShiritoriException {

    public GameException(String message) {
        super(message, BAD_REQUEST);
    }

}
