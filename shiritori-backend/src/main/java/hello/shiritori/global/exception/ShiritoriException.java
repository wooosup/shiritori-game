package hello.shiritori.global.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class ShiritoriException extends RuntimeException{

    private final HttpStatus status;
    private final String errorCode;

    public ShiritoriException(String message, HttpStatus status) {
        this(message, status, null);
    }

    public ShiritoriException(String message, HttpStatus status, String errorCode) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
    }

}
