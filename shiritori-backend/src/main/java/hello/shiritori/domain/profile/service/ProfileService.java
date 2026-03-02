package hello.shiritori.domain.profile.service;

import hello.shiritori.domain.game.repository.GameActionIdempotencyRepository;
import hello.shiritori.domain.game.repository.GameRepository;
import hello.shiritori.domain.profile.port.AuthIdentityRemover;
import hello.shiritori.domain.profile.dto.ProfileResponse;
import hello.shiritori.domain.profile.entity.Profile;
import hello.shiritori.domain.profile.policy.NicknameValidator;
import hello.shiritori.domain.gameTurn.repository.GameTurnRepository;
import hello.shiritori.domain.session.repository.UserSessionRepository;
import hello.shiritori.domain.wordBook.repository.WordBookRepository;
import hello.shiritori.global.exception.UserException;
import hello.shiritori.global.exception.UserNotFound;
import hello.shiritori.domain.profile.repository.ProfileRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@Slf4j
@RequiredArgsConstructor
public class ProfileService {

    private final ProfileRepository profileRepository;
    private final WordBookRepository wordBookRepository;
    private final GameTurnRepository gameTurnRepository;
    private final GameRepository gameRepository;
    private final GameActionIdempotencyRepository gameActionIdempotencyRepository;
    private final UserSessionRepository userSessionRepository;
    private final AuthIdentityRemover authIdentityRemover;
    private final NicknameValidator nicknameValidator;

    public ProfileResponse getMyProfile(UUID userId) {
        Profile profile = findOrCreateProfile(userId);
        return ProfileResponse.of(profile);
    }

    public void updateProfile(UUID userId, String nickname) {
        Profile profile = findOrCreateProfile(userId);
        String normalizedNickname = normalizeNickname(nickname);
        validateNicknameNotDuplicate(profile, normalizedNickname);
        profile.updateNickname(normalizedNickname, nicknameValidator);
    }

    public void deleteMyAccount(UUID userId) {
        // Child tables first, then owner rows.
        gameTurnRepository.deleteAllByUserId(userId);
        gameRepository.deleteAllByUserId(userId);
        wordBookRepository.deleteAllByUserId(userId);
        gameActionIdempotencyRepository.deleteAllByUserId(userId);
        userSessionRepository.deleteAllByUserId(userId);
        profileRepository.deleteByUserId(userId);
        try {
            authIdentityRemover.deleteIdentity(userId);
        } catch (RuntimeException e) {
            log.warn("외부 인증 계정 삭제 실패(userId={}) - 로컬 계정 삭제는 완료", userId, e);
        }
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

    private String normalizeNickname(String nickname) {
        if (nickname == null || nickname.trim().isEmpty()) {
            throw new UserException("닉네임을 입력해주세요.");
        }
        return nickname.trim();
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
