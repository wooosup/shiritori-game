package hello.shiritori.repository;

import hello.shiritori.entity.Word;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WordRepository extends JpaRepository<Word, Long> {

    Optional<Word> findFirstByWord(String word);

    Optional<Word> findTopByReadingOrderByLevelDesc(String reading);

    @Query(value = """
            SELECT w.* FROM game_words w
            WHERE (w.starts_with = :hira OR w.starts_with = :kata)
              AND w.level = :level
              AND w.word NOT IN (
                  SELECT gt.word_text
                  FROM game_turns gt
                  WHERE gt.game_id = :gameId
              )
              AND w.reading NOT LIKE '%ん'
            ORDER BY RANDOM()
            LIMIT 1
            """, nativeQuery = true)
    Optional<Word> findAiWord(@Param("gameId") Long gameId,
                              @Param("hira") String hira,
                              @Param("kata") String kata,
                              @Param("level") String level);

    boolean existsByWord(String word);

}