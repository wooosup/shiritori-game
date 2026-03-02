package hello.shiritori.domain.profile.repository;

import hello.shiritori.domain.profile.entity.Profile;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProfileRepository extends JpaRepository<Profile, UUID> {

    boolean existsByNickname(String nickname);

    @Query("select p.nickname from Profile p where p.id = :userId")
    Optional<String> findNicknameById(UUID userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from Profile p where p.id = :userId")
    int deleteByUserId(@Param("userId") UUID userId);

}
