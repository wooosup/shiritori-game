package hello.shiritori.global.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class ShiritoriException extends RuntimeException{

    private final HttpStatus status;

    public ShiritoriException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

}
