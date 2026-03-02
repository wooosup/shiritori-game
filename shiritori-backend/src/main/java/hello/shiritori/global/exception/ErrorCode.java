package hello.shiritori.global.exception;

public final class ErrorCode {

    public static final String AUTH_TOKEN_EXPIRED = "AUTH_TOKEN_EXPIRED";
    public static final String AUTH_TOKEN_INVALID = "AUTH_TOKEN_INVALID";
    public static final String AUTH_FORBIDDEN = "AUTH_FORBIDDEN";
    public static final String SESSION_REVOKED = "SESSION_REVOKED";
    public static final String AUTH_PROVIDER_DELETE_FAILED = "AUTH_PROVIDER_DELETE_FAILED";

    public static final String VALIDATION_ERROR = "VALIDATION_ERROR";
    public static final String RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED";
    public static final String INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR";

    public static final String GAME_ALREADY_FINISHED = "GAME_ALREADY_FINISHED";
    public static final String GAME_NOT_FOUND = "GAME_NOT_FOUND";
    public static final String GAME_ACCESS_DENIED = "GAME_ACCESS_DENIED";
    public static final String GAME_BAD_REQUEST = "GAME_BAD_REQUEST";
    public static final String IDEMPOTENCY_IN_PROGRESS = "IDEMPOTENCY_IN_PROGRESS";

    private ErrorCode() {
    }
}
