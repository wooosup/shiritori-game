package hello.shiritori.global.exception;

import static org.springframework.http.HttpStatus.NOT_FOUND;

public class WordNotFound extends ShiritoriException{

    private static final String MESSAGE = "사전에 없는 단어입니다.";

    public WordNotFound() {
        super(MESSAGE, NOT_FOUND);
    }
}
