package hello.shiritori.global.exception;

import org.springframework.http.HttpStatus;

public class UserException extends ShiritoriException {

    public UserException(String message) {
        super(message, HttpStatus.BAD_REQUEST);
    }

}
