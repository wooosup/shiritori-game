package hello.shiritori.domain.ranking.service;

import static hello.shiritori.domain.game.entity.GameStatus.PLAYING;

import hello.shiritori.domain.game.entity.Game;
import hello.shiritori.domain.game.repository.GameRepository;
import hello.shiritori.domain.profile.repository.ProfileRepository;
import hello.shiritori.domain.ranking.dto.MyBestRankResponse;
import hello.shiritori.domain.ranking.dto.RankingSummaryResponse;
import hello.shiritori.domain.ranking.repository.RankingRepository;
import jakarta.annotation.PostConstruct;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@Transactional(readOnly = true)
public class RankingService {

    private final RankingRepository rankingRepository;
    private final GameRepository gameRepository;
    private final ProfileRepository profileRepository;
    private final AtomicReference<List<RankingSummaryResponse>> rankingSnapshot = new AtomicReference<>(List.of());

    public RankingService(RankingRepository rankingRepository,
                          GameRepository gameRepository,
                          ProfileRepository profileRepository) {
        this.rankingRepository = rankingRepository;
        this.gameRepository = gameRepository;
        this.profileRepository = profileRepository;
    }

    @PostConstruct
    public void initializeSnapshot() {
        refreshRankingSnapshot();
    }

    public MyBestRankResponse getMyBestRank(UUID userId) {
        Game game = gameRepository.findTopByUser_IdAndStatusNotOrderByScoreDescEndedAtDesc(userId, PLAYING)
                .orElse(null);
        if (game == null) {
            return null;
        }

        String nickname = profileRepository.findNicknameById(userId).orElse(null);
        return MyBestRankResponse.of(nickname, game);
    }

    public List<RankingSummaryResponse> getTopRanks() {
        List<RankingSummaryResponse> cached = rankingSnapshot.get();
        if (!cached.isEmpty()) {
            return cached;
        }
        return rankingRepository.findTop10UniqueRankings()
                .stream()
                .map(RankingSummaryResponse::fromRankingEntity)
                .toList();
    }

    public void refreshRankingSnapshot() {
        try {
            List<RankingSummaryResponse> recalculated = rankingRepository.recalculateTop10FromGames()
                    .stream()
                    .map(RankingSummaryResponse::fromProjection)
                    .toList();
            rankingSnapshot.set(recalculated);
        } catch (Exception e) {
            log.error("랭킹 스냅샷 재계산 실패", e);
        }
    }
}
