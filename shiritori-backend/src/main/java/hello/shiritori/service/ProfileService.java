package hello.shiritori.service;

import hello.shiritori.dto.ProfileResponse;
import hello.shiritori.entity.Profile;
import hello.shiritori.global.validator.UserException;
import hello.shiritori.global.validator.UserNotFound;
import hello.shiritori.repository.ProfileRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
public class ProfileService {

    private final ProfileRepository repository;

    public ProfileResponse getMyProfile(UUID userId) {
        Profile profile = repository.findById(userId)
                .orElseGet(() -> {
                    Profile newProfile = Profile.of(userId);
                    return repository.save(newProfile);
                });
        return ProfileResponse.of(profile);
    }

    public void updateProfile(UUID userId, String nickname) {
        if (nickname == null || nickname.trim().isEmpty()) {
            throw new UserException("닉네임을 입력해주세요.");
        }

        Profile profile = repository.findById(userId)
                .orElseThrow(UserNotFound::new);

        validateDuplicateNickname(profile, nickname);

        profile.update(nickname);
        repository.save(profile);
    }

    private void validateDuplicateNickname(Profile profile, String nickname) {
        if (nickname.equals(profile.getNickname())) {
            return;
        }
        if (repository.existsByNickname(nickname)) {
            throw new UserException("이미 존재하는 닉네임입니다.");
        }
    }

}
