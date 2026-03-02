package hello.shiritori.domain.gameTurn.repository;

import hello.shiritori.domain.game.entity.Game;
import hello.shiritori.domain.gameTurn.entity.GameTurn;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GameTurnRepository extends JpaRepository<GameTurn, Long> {

    boolean existsByGameAndWordText(Game game, String wordText);

    Optional<GameTurn> findFirstByGameOrderByCreatedAtDesc(Game game);

    Optional<GameTurn> findTopByGameOrderByTurnNumberDesc(Game game);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from GameTurn gt where gt.game.user.id = :userId")
    int deleteAllByUserId(@Param("userId") UUID userId);
}
