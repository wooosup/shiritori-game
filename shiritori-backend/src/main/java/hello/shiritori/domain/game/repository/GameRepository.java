package hello.shiritori.domain.game.repository;

import hello.shiritori.domain.game.entity.Game;
import hello.shiritori.domain.game.entity.GameStatus;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GameRepository extends JpaRepository<Game, Long> {

    Optional<Game> findTopByUser_IdAndStatusNotOrderByScoreDescEndedAtDesc(UUID userId, GameStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select g from Game g where g.id = :id")
    Optional<Game> findByIdForUpdate(Long id);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from Game g where g.user.id = :userId")
    int deleteAllByUserId(@Param("userId") UUID userId);
}
