package hello.shiritori.global.validator;

import static org.springframework.http.HttpStatus.*;

public class GameNotFound extends ShiritoriException{

    private static final String MESSAGE = "존재하지 않는 게임 세션입니다.";

    public GameNotFound() {
        super(MESSAGE, NOT_FOUND);
    }

}
