package hello.shiritori.global.exception;

import static org.springframework.http.HttpStatus.BAD_GATEWAY;
import static org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR;

import org.springframework.http.HttpStatus;

public class AuthProviderException extends ShiritoriException {

    private static final String DELETE_FAILED_MESSAGE = "인증 계정 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.";
    private static final String MISCONFIGURED_MESSAGE = "계정 탈퇴 설정이 완료되지 않았습니다. 관리자에게 문의해주세요.";

    private AuthProviderException(String message, HttpStatus status) {
        super(message, status, ErrorCode.AUTH_PROVIDER_DELETE_FAILED);
    }

    public static AuthProviderException deleteFailed() {
        return new AuthProviderException(DELETE_FAILED_MESSAGE, BAD_GATEWAY);
    }

    public static AuthProviderException misconfigured() {
        return new AuthProviderException(MISCONFIGURED_MESSAGE, INTERNAL_SERVER_ERROR);
    }
}

