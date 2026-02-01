package hello.shiritori.global.validator;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

public class GameAlreadyException extends ShiritoriException{

    private static final String MESSAGE = "이미 종료된 게임입니다.";

    public GameAlreadyException() {
        super(MESSAGE, BAD_REQUEST);
    }

}
