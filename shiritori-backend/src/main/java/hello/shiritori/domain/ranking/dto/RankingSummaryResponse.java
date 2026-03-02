package hello.shiritori.domain.ranking.dto;

import hello.shiritori.domain.game.entity.JlptLevel;
import hello.shiritori.domain.ranking.entity.Ranking;
import hello.shiritori.domain.ranking.repository.RankingRepository.RecalculatedRankingProjection;
import java.time.LocalDateTime;

public record RankingSummaryResponse(
        String nickname,
        Integer maxCombo,
        Integer score,
        JlptLevel level,
        LocalDateTime endedAt
) {
    public static RankingSummaryResponse fromRankingEntity(Ranking ranking) {
        return new RankingSummaryResponse(
                ranking.getNickname(),
                ranking.getMaxCombo(),
                ranking.getScore(),
                ranking.getLevel(),
                ranking.getEndedAt()
        );
    }

    public static RankingSummaryResponse fromProjection(RecalculatedRankingProjection projection) {
        JlptLevel parsedLevel = projection.getLevel() == null ? null : JlptLevel.valueOf(projection.getLevel());
        return new RankingSummaryResponse(
                projection.getNickname(),
                projection.getMaxCombo(),
                projection.getScore(),
                parsedLevel,
                projection.getEndedAt()
        );
    }
}
