package hello.shiritori.domain.ranking.repository;

import hello.shiritori.domain.ranking.entity.Ranking;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RankingRepository extends JpaRepository<Ranking, String> {

    @Query(value = """
        SELECT * FROM (
            SELECT *,
                   ROW_NUMBER() OVER (PARTITION BY nickname ORDER BY score DESC, ended_at DESC) as rn
            FROM ranking_board
        ) t
        WHERE t.rn = 1
        ORDER BY score DESC
        LIMIT 10
        """, nativeQuery = true)
    List<Ranking> findTop10UniqueRankings();

    interface RecalculatedRankingProjection {
        String getNickname();
        Integer getMaxCombo();
        Integer getScore();
        String getLevel();
        LocalDateTime getEndedAt();
    }

    @Query(value = """
        SELECT nickname, max_combo AS maxCombo, score, level, ended_at AS endedAt
        FROM (
            SELECT p.nickname,
                   g.max_combo,
                   g.score,
                   g.level,
                   g.ended_at,
                   ROW_NUMBER() OVER (PARTITION BY g.user_id ORDER BY g.score DESC, g.ended_at DESC) rn
            FROM games g
            JOIN profiles p ON p.id = g.user_id
            WHERE g.status <> 'PLAYING'
              AND p.nickname IS NOT NULL
        ) ranked
        WHERE ranked.rn = 1
        ORDER BY score DESC, ended_at DESC
        LIMIT 10
        """, nativeQuery = true)
    List<RecalculatedRankingProjection> recalculateTop10FromGames();


}
