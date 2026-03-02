package hello.shiritori.domain.session.repository;

import hello.shiritori.domain.session.entity.UserSession;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserSessionRepository extends JpaRepository<UserSession, Long> {

    Optional<UserSession> findByUserIdAndSessionId(UUID userId, String sessionId);

    List<UserSession> findByUserIdOrderByLastSeenAtDesc(UUID userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from UserSession s where s.userId = :userId and s.lastSeenAt < :expireBefore")
    int deleteExpiredByUserId(@Param("userId") UUID userId, @Param("expireBefore") LocalDateTime expireBefore);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from UserSession s where s.userId = :userId")
    int deleteAllByUserId(@Param("userId") UUID userId);
}
