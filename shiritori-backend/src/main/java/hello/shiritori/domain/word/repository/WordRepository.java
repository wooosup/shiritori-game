package hello.shiritori.domain.word.repository;

import hello.shiritori.domain.word.entity.Word;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WordRepository extends JpaRepository<Word, Long> {

    Optional<Word> findFirstByWord(String word);

    Optional<Word> findByWord(String word);

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
              AND w.reading NOT LIKE '%ン'
            ORDER BY RANDOM()
            LIMIT 1
            """, nativeQuery = true)
    Optional<Word> findAiWord(@Param("gameId") Long gameId,
                              @Param("hira") String hira,
                              @Param("kata") String kata,
                              @Param("level") String level);

    boolean existsByWord(String word);

    @Query(value = "SELECT * FROM game_words ORDER BY RANDOM() LIMIT :limit", nativeQuery = true)
    List<Word> findRandomWords(@Param("limit") int limit);

    @Query("SELECT w.word FROM Word w")
    Set<String> findAllWordsInSet();

}