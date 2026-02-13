package hello.shiritori.global.exception;

import static org.springframework.http.HttpStatus.NOT_FOUND;

public class WordBookNotFound extends ShiritoriException {

    private static final String MESSAGE = "단어장 항목을 찾을 수 없습니다.";

    public WordBookNotFound() {
        super(MESSAGE, NOT_FOUND);
    }
}
