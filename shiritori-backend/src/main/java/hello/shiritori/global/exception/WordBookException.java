package hello.shiritori.global.exception;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

public class WordBookException extends ShiritoriException{

    public WordBookException(String message) {
        super(message, BAD_REQUEST);
    }

}
