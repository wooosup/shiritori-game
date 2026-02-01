package hello.shiritori.global.validator;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

public class GameLevelException extends ShiritoriException{

    private static final String MESSAGE = "유효하지 않은 난이도입니다.";

    public GameLevelException() {
        super(MESSAGE, BAD_REQUEST);
    }

}
