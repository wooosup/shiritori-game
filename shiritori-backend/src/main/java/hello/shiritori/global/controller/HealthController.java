package hello.shiritori.global.controller;

import hello.shiritori.global.api.ApiResponse;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class HealthController {

    @GetMapping("/healthz")
    public ApiResponse<Map<String, String>> healthz() {
        return ApiResponse.ok(Map.of("status", "ok"));
    }
}
