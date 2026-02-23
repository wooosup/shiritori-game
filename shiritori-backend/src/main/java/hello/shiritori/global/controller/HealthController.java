package hello.shiritori.global.controller;

import hello.shiritori.global.api.ApiResponse;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class HealthController {

    private final JdbcTemplate jdbcTemplate;

    @GetMapping("/healthz")
    public ApiResponse<Map<String, String>> healthz() {
        return ApiResponse.ok(Map.of("status", "ok"));
    }

    @GetMapping("/healthz/db")
    public ResponseEntity<ApiResponse<Map<String, String>>> healthzDb() {
        try {
            Integer result = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            if (result == null || result != 1) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .body(ApiResponse.fail(HttpStatus.SERVICE_UNAVAILABLE, "DB health check failed"));
            }

            return ResponseEntity.ok(ApiResponse.ok(Map.of("status", "ok", "db", "ok")));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(ApiResponse.fail(HttpStatus.SERVICE_UNAVAILABLE, "DB unavailable"));
        }
    }
}
