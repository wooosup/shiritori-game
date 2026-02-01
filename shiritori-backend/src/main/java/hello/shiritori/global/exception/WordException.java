package hello.shiritori.global.exception;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

public class WordException extends ShiritoriException {

    public WordException(String message) {
        super(message, BAD_REQUEST);
    }

}
