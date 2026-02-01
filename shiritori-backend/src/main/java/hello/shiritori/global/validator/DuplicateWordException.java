package hello.shiritori.global.validator;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

public class DuplicateWordException extends ShiritoriException {

    public DuplicateWordException(String message) {
        super(message, BAD_REQUEST);
    }

}
