package hello.shiritori.global.validator;

import org.springframework.http.HttpStatus;

public class GameException extends ShiritoriException {

    public GameException(String message, HttpStatus status) {
        super(message, status);
    }

}
