package hello.shiritori.global.validator;

import org.springframework.http.HttpStatus;

public class UserException extends ShiritoriException{

    public UserException(String message) {
        super(message, HttpStatus.BAD_REQUEST);
    }

}
