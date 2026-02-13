package hello.shiritori.domain.profile.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import hello.shiritori.domain.profile.entity.Profile;
import hello.shiritori.domain.profile.repository.ProfileRepository;
import hello.shiritori.global.exception.UserException;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class ProfileServiceTest {

    @Autowired
    private ProfileService profileService;

    @Autowired
    private ProfileRepository profileRepository;

    @Test
    @DisplayName("닉네임 저장 시 앞뒤 공백을 제거한다.")
    void updateProfileTrimNickname() {
        UUID userId = UUID.randomUUID();
        profileRepository.save(Profile.of(userId));

        profileService.updateProfile(userId, "  neko  ");

        Profile profile = profileRepository.findById(userId).orElseThrow();
        assertThat(profile.getNickname()).isEqualTo("neko");
    }

    @Test
    @DisplayName("공백 차이만 있는 닉네임은 중복으로 처리한다.")
    void updateProfileDuplicateNicknameWithWhitespace() {
        UUID userA = UUID.randomUUID();
        UUID userB = UUID.randomUUID();
        profileRepository.save(Profile.of(userA));
        profileRepository.save(Profile.of(userB));

        profileService.updateProfile(userA, "neko");

        assertThatThrownBy(() -> profileService.updateProfile(userB, "  neko  "))
                .isInstanceOf(UserException.class)
                .hasMessage("이미 존재하는 닉네임입니다.");
    }
}
