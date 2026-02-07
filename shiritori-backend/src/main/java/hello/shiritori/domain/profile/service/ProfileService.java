package hello.shiritori.domain.profile.service;

import hello.shiritori.domain.profile.dto.ProfileResponse;
import hello.shiritori.domain.profile.entity.Profile;
import hello.shiritori.global.exception.UserException;
import hello.shiritori.global.exception.UserNotFound;
import hello.shiritori.domain.profile.repository.ProfileRepository;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
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

        validateCoolTime(profile);
        validateDuplicateNickname(profile, nickname);

        profile.update(nickname);
        repository.save(profile);
    }

    private void validateCoolTime(Profile profile) {
        if (profile.getNickname() == null) {
            return;
        }

        if (profile.getNicknameUpdatedAt() != null) {
            long days = ChronoUnit.DAYS.between(profile.getNicknameUpdatedAt(), LocalDateTime.now());

            if (days < 7) {
                long remainingDays = 7 - days;
                throw new UserException("닉네임은 7일에 한 번만 변경할 수 있습니다. (" + remainingDays + "일 남음)");
            }
        }
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
