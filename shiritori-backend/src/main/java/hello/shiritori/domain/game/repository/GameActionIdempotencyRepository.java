package hello.shiritori.domain.game.repository;

import hello.shiritori.domain.game.entity.GameActionIdempotency;
import hello.shiritori.domain.game.service.GameActionType;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GameActionIdempotencyRepository extends JpaRepository<GameActionIdempotency, Long> {

    Optional<GameActionIdempotency> findByUserIdAndGameIdAndActionTypeAndIdempotencyKey(
            UUID userId,
            Long gameId,
            GameActionType actionType,
            String idempotencyKey
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from GameActionIdempotency r where r.expireAt < :now")
    int deleteExpired(@Param("now") LocalDateTime now);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from GameActionIdempotency r where r.userId = :userId")
    int deleteAllByUserId(@Param("userId") UUID userId);
}
