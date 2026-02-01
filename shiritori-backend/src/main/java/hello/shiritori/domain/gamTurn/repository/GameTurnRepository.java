package hello.shiritori.domain.gamTurn.repository;

import hello.shiritori.domain.game.entity.Game;
import hello.shiritori.domain.gamTurn.entity.GameTurn;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameTurnRepository extends JpaRepository<GameTurn, Long> {

    boolean existsByGameAndWordText(Game game, String wordText);

    Optional<GameTurn> findFirstByGameOrderByCreatedAtDesc(Game game);

     long countByGame(Game game);
}
