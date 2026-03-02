package hello.shiritori.global.controller;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR;
import static org.springframework.http.HttpStatus.NOT_FOUND;

import hello.shiritori.global.api.ApiResponse;
import hello.shiritori.global.exception.ErrorCode;
import hello.shiritori.global.exception.ShiritoriException;
import java.util.HashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class ExceptionController {

    @ResponseStatus(BAD_REQUEST)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ApiResponse<Map<String, String>> invalidRequestHandler(MethodArgumentNotValidException e) {
        log.warn("잘못된 요청: {}", e.getMessage());

        Map<String, String> validationErrors = new HashMap<>();
        for (FieldError fieldError : e.getFieldErrors()) {
            validationErrors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }

        return ApiResponse.fail(BAD_REQUEST, ErrorCode.VALIDATION_ERROR, "입력값이 올바르지 않습니다.", validationErrors);
    }

    @ExceptionHandler(ShiritoriException.class)
    public ResponseEntity<ApiResponse<Void>> shiritoriException(ShiritoriException e) {
        log.error("비즈니스 오류: {}", e.getMessage());
        ApiResponse<Void> response = ApiResponse.fail(e.getStatus(), e.getErrorCode(), e.getMessage());
        return ResponseEntity.status(e.getStatus()).body(response);
    }

    @ResponseStatus(INTERNAL_SERVER_ERROR)
    @ExceptionHandler(Exception.class)
    public ApiResponse<Void> generalServerError(Exception e) {
        log.error("서버 오류: {}", e.getMessage(), e);
        return ApiResponse.fail(INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_SERVER_ERROR, "서버에 오류가 발생했습니다.");
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(NOT_FOUND)
    public ApiResponse<Void> handleIllegalArgumentException(IllegalArgumentException e) {
        log.error("잘못된 인자 오류: {}", e.getMessage(), e);
        return ApiResponse.fail(NOT_FOUND, ErrorCode.GAME_NOT_FOUND, e.getMessage());
    }

}
