package hello.shiritori.domain.ranking.dto;

import hello.shiritori.domain.game.entity.Game;
import hello.shiritori.domain.game.entity.JlptLevel;
import java.time.LocalDateTime;

public record MyBestRankResponse(
        String nickname,
        Integer maxCombo,
        Integer score,
        JlptLevel level,
        LocalDateTime endedAt
) {

    public static MyBestRankResponse of(String nickname, Game game) {
        return new MyBestRankResponse(
                nickname,
                game.getMaxCombo(),
                game.getScore(),
                game.getLevel(),
                game.getEndedAt()
        );
    }
}
