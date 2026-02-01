package hello.shiritori.repository;

import hello.shiritori.entity.Profile;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfileRepository extends JpaRepository<Profile, UUID> {

    boolean existsByNickname(String nickname);

}
