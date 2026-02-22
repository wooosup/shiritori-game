package hello.shiritori.global.init;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.db-warmup.enabled", havingValue = "true", matchIfMissing = true)
public class DatabaseWarmupScheduler {

    private final JdbcTemplate jdbcTemplate;

    @Scheduled(
            fixedDelayString = "${app.db-warmup.fixed-delay-ms:240000}",
            initialDelayString = "${app.db-warmup.initial-delay-ms:60000}"
    )
    public void warmup() {
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            log.debug("DB warm-up success");
        } catch (Exception e) {
            log.warn("DB warm-up failed: {}", e.getMessage());
        }
    }
}
