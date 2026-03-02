package hello.shiritori.domain.ranking.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class RankingRecalculationScheduler {

    private final RankingService rankingService;

    @Scheduled(
            fixedDelayString = "${app.ranking.recalc.fixed-delay-ms:300000}",
            initialDelayString = "${app.ranking.recalc.initial-delay-ms:45000}"
    )
    public void refreshRankingSnapshot() {
        rankingService.refreshRankingSnapshot();
        log.debug("랭킹 스냅샷 재계산 완료");
    }
}
