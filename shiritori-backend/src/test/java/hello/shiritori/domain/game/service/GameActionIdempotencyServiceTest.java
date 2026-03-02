package hello.shiritori.domain.game.service;

import static org.assertj.core.api.Assertions.assertThat;

import hello.shiritori.domain.game.repository.GameActionIdempotencyRepository;
import hello.shiritori.global.api.ApiResponse;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class GameActionIdempotencyServiceTest {

    @Autowired
    private GameActionIdempotencyService service;

    @Autowired
    private GameActionIdempotencyRepository repository;

    @BeforeEach
    void clear() {
        repository.deleteAll();
    }

    @Test
    void duplicate_request_with_same_key_executes_once() throws Exception {
        UUID userId = UUID.randomUUID();
        AtomicInteger executionCount = new AtomicInteger(0);
        CountDownLatch startLatch = new CountDownLatch(1);

        var executor = Executors.newFixedThreadPool(2);
        try {
            Future<ApiResponse<String>> first = executor.submit(() -> {
                startLatch.await(2, TimeUnit.SECONDS);
                return service.execute(userId, 1L, GameActionType.TURN, "k-1", () -> {
                    executionCount.incrementAndGet();
                    sleep(100);
                    return ApiResponse.ok("ok");
                });
            });

            Future<ApiResponse<String>> second = executor.submit(() -> {
                startLatch.await(2, TimeUnit.SECONDS);
                return service.execute(userId, 1L, GameActionType.TURN, "k-1", () -> {
                    executionCount.incrementAndGet();
                    return ApiResponse.ok("ok");
                });
            });

            startLatch.countDown();

            ApiResponse<String> firstResponse = first.get(2, TimeUnit.SECONDS);
            ApiResponse<String> secondResponse = second.get(2, TimeUnit.SECONDS);

            assertThat(executionCount.get()).isEqualTo(1);
            assertThat(firstResponse.getData()).isEqualTo("ok");
            assertThat(secondResponse.getData()).isEqualTo("ok");
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    void request_without_idempotency_key_executes_every_time() {
        UUID userId = UUID.randomUUID();
        AtomicInteger executionCount = new AtomicInteger(0);

        service.execute(userId, 1L, GameActionType.PASS, null, () -> {
            executionCount.incrementAndGet();
            return ApiResponse.ok("ok");
        });

        service.execute(userId, 1L, GameActionType.PASS, null, () -> {
            executionCount.incrementAndGet();
            return ApiResponse.ok("ok");
        });

        assertThat(executionCount.get()).isEqualTo(2);
    }

    private void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException ignored) {
            Thread.currentThread().interrupt();
        }
    }
}
