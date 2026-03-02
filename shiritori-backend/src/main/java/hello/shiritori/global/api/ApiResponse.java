package hello.shiritori.global.api;

import static com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL;
import static org.springframework.http.HttpStatus.*;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@JsonPropertyOrder({"code", "status", "errorCode", "message", "data"})
@JsonInclude(NON_NULL)
public class ApiResponse<T> {

    private final int code;
    private final String status;
    private final String errorCode;
    private final String message;
    private final T data;

    private ApiResponse(HttpStatus status, String message, String errorCode, T data) {
        this.code = status.value();
        this.status = status.name();
        this.errorCode = errorCode;
        this.message = message;
        this.data = data;
    }

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(OK, OK.name(), null, data);
    }

    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(OK, message, null, data);
    }

    public static <T> ApiResponse<T> fail(HttpStatus status, String message) {
        return new ApiResponse<>(status, message, null, null);
    }

    public static <T> ApiResponse<T> fail(HttpStatus status, String errorCode, String message) {
        return new ApiResponse<>(status, message, errorCode, null);
    }

    public static <T> ApiResponse<T> fail(HttpStatus status, String message, T data) {
        return new ApiResponse<>(status, message, null, data);
    }

    public static <T> ApiResponse<T> fail(HttpStatus status, String errorCode, String message, T data) {
        return new ApiResponse<>(status, message, errorCode, data);
    }

    public static ApiResponse<Void> error(String message) {
        return new ApiResponse<>(INTERNAL_SERVER_ERROR, message, null, null);
    }

    public static <T> ApiResponse<T> fromCached(int code, String status, String errorCode, String message, T data) {
        HttpStatus resolved = HttpStatus.resolve(code);
        if (resolved == null) {
            resolved = INTERNAL_SERVER_ERROR;
        }
        return new ApiResponse<>(resolved, message != null ? message : status, errorCode, data);
    }

}
