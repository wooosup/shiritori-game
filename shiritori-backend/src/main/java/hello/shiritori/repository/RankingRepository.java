package hello.shiritori.repository;

import hello.shiritori.entity.Ranking;
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

}
