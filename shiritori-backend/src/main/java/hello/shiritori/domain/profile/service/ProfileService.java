package hello.shiritori.domain.profile.service;

import hello.shiritori.domain.profile.dto.ProfileResponse;
import hello.shiritori.domain.profile.entity.Profile;
import hello.shiritori.global.exception.UserException;
import hello.shiritori.global.exception.UserNotFound;
import hello.shiritori.domain.profile.repository.ProfileRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
public class ProfileService {

    private final ProfileRepository profileRepository;

    @Transactional(readOnly = true)
    public ProfileResponse getMyProfile(UUID userId) {
        Profile profile = findOrCreateProfile(userId);
        return ProfileResponse.of(profile);
    }

    public void updateProfile(UUID userId, String nickname) {
        Profile profile = findProfileOrThrow(userId);

        validateNicknameNotEmpty(nickname);
        validateNicknameNotDuplicate(profile, nickname);

        profile.updateNickname(nickname.trim());
    }

    private Profile findOrCreateProfile(UUID userId) {
        return profileRepository.findById(userId)
                .orElseGet(() -> createAndSaveProfile(userId));
    }

    private Profile findProfileOrThrow(UUID userId) {
        return profileRepository.findById(userId)
                .orElseThrow(UserNotFound::new);
    }

    private Profile createAndSaveProfile(UUID userId) {
        Profile newProfile = Profile.of(userId);
        return profileRepository.save(newProfile);
    }

    private void validateNicknameNotEmpty(String nickname) {
        if (nickname == null || nickname.trim().isEmpty()) {
            throw new UserException("닉네임을 입력해주세요.");
        }
    }

    private void validateNicknameNotDuplicate(Profile profile, String nickname) {
        if (profile.isSameNickname(nickname)) {
            return;
        }

        if (profileRepository.existsByNickname(nickname)) {
            throw new UserException("이미 존재하는 닉네임입니다.");
        }
    }

}
