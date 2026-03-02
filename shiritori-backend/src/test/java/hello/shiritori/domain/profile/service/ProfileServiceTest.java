package hello.shiritori.domain.profile.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;

import hello.shiritori.domain.game.entity.Game;
import hello.shiritori.domain.game.entity.GameActionIdempotency;
import hello.shiritori.domain.game.entity.JlptLevel;
import hello.shiritori.domain.game.repository.GameActionIdempotencyRepository;
import hello.shiritori.domain.game.repository.GameRepository;
import hello.shiritori.domain.game.service.GameActionType;
import hello.shiritori.domain.gameTurn.entity.GameTurn;
import hello.shiritori.domain.gameTurn.repository.GameTurnRepository;
import hello.shiritori.domain.profile.port.AuthIdentityRemover;
import hello.shiritori.domain.profile.entity.Profile;
import hello.shiritori.domain.profile.policy.NicknameValidator;
import hello.shiritori.domain.profile.repository.ProfileRepository;
import hello.shiritori.domain.session.entity.UserSession;
import hello.shiritori.domain.session.repository.UserSessionRepository;
import java.time.LocalDateTime;
import hello.shiritori.global.exception.AuthProviderException;
import hello.shiritori.global.exception.UserException;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class ProfileServiceTest {

    @Autowired
    private ProfileService profileService;

    @Autowired
    private ProfileRepository profileRepository;

    @Autowired
    private GameRepository gameRepository;

    @Autowired
    private GameTurnRepository gameTurnRepository;

    @Autowired
    private GameActionIdempotencyRepository gameActionIdempotencyRepository;

    @Autowired
    private UserSessionRepository userSessionRepository;

    @Autowired
    private NicknameValidator nicknameValidator;

    @MockitoBean
    private AuthIdentityRemover authIdentityRemover;

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
    @DisplayName("신규 유저가 닉네임을 처음 설정하면 프로필을 생성한다.")
    void updateProfileCreatesProfileForNewUser() {
        UUID userId = UUID.randomUUID();

        profileService.updateProfile(userId, "newbie");

        Profile profile = profileRepository.findById(userId).orElseThrow();
        assertThat(profile.getNickname()).isEqualTo("newbie");
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    @DisplayName("신규 유저가 내 프로필 조회를 하면 프로필이 영속화된다.")
    void getMyProfilePersistsProfileForNewUser() {
        UUID userId = UUID.randomUUID();

        profileService.getMyProfile(userId);

        assertThat(profileRepository.findById(userId)).isPresent();
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

    @Test
    @DisplayName("욕설이 포함된 닉네임은 차단한다.")
    void updateProfileRejectsProfanityNickname() {
        UUID userId = UUID.randomUUID();
        profileRepository.save(Profile.of(userId));

        assertThatThrownBy(() -> profileService.updateProfile(userId, "시발왕"))
                .isInstanceOf(UserException.class)
                .hasMessage("사용할 수 없는 닉네임입니다.");
    }

    @Test
    @DisplayName("닉네임 정책 빈은 욕설을 차단한다.")
    void nicknameValidatorBlocksProfanity() {
        assertThatThrownBy(() -> nicknameValidator.validate("시발왕"))
                .isInstanceOf(UserException.class)
                .hasMessage("사용할 수 없는 닉네임입니다.");
    }

    @Test
    @DisplayName("성적인 표현이 포함된 닉네임은 차단한다.")
    void updateProfileRejectsSexualNickname() {
        UUID userId = UUID.randomUUID();
        profileRepository.save(Profile.of(userId));

        assertThatThrownBy(() -> profileService.updateProfile(userId, "sexmaster"))
                .isInstanceOf(UserException.class)
                .hasMessage("사용할 수 없는 닉네임입니다.");
    }

    @Test
    @DisplayName("의미 없는 자모 반복 닉네임은 차단한다.")
    void updateProfileRejectsOnlyJamoNickname() {
        UUID userId = UUID.randomUUID();
        profileRepository.save(Profile.of(userId));

        assertThatThrownBy(() -> profileService.updateProfile(userId, "ㅇㅇㅇ"))
                .isInstanceOf(UserException.class)
                .hasMessage("사용할 수 없는 닉네임입니다.");
    }

    @Test
    @DisplayName("한 글자 자모 닉네임도 차단한다.")
    void updateProfileRejectsSingleJamoNickname() {
        UUID userId = UUID.randomUUID();
        profileRepository.save(Profile.of(userId));

        assertThatThrownBy(() -> profileService.updateProfile(userId, "ㅇ"))
                .isInstanceOf(UserException.class)
                .hasMessage("사용할 수 없는 닉네임입니다.");
    }

    @Test
    @DisplayName("계정 삭제 시 사용자 관련 데이터가 함께 정리된다.")
    void deleteMyAccountRemovesOwnedData() {
        UUID userId = UUID.randomUUID();
        Profile profile = profileRepository.save(Profile.of(userId));

        Game game = gameRepository.save(Game.create(profile, JlptLevel.N5));
        gameTurnRepository.save(GameTurn.of(game, 1, "USER", "ねこ"));
        userSessionRepository.save(UserSession.create(userId, "session-1", "device-1", "ios", LocalDateTime.now()));
        gameActionIdempotencyRepository.save(
                GameActionIdempotency.claim(
                        userId,
                        999L,
                        GameActionType.TURN,
                        "idem-1",
                        LocalDateTime.now(),
                        LocalDateTime.now().plusMinutes(5)
                )
        );

        profileService.deleteMyAccount(userId);

        assertThat(profileRepository.findById(userId)).isEmpty();
        assertThat(gameRepository.findById(game.getId())).isEmpty();
        assertThat(gameTurnRepository.findAll()).isEmpty();
        assertThat(userSessionRepository.findByUserIdOrderByLastSeenAtDesc(userId)).isEmpty();
        assertThat(gameActionIdempotencyRepository.findAll())
                .noneMatch(record -> userId.equals(record.getUserId()));
        verify(authIdentityRemover).deleteIdentity(userId);
    }

    @Test
    @DisplayName("외부 인증 계정 삭제가 실패해도 로컬 계정 삭제는 완료된다.")
    void deleteMyAccountStillSucceedsWhenAuthProviderFails() {
        UUID userId = UUID.randomUUID();
        Profile profile = profileRepository.save(Profile.of(userId));
        Game game = gameRepository.save(Game.create(profile, JlptLevel.N5));
        gameTurnRepository.save(GameTurn.of(game, 1, "USER", "ねこ"));

        doThrow(AuthProviderException.deleteFailed()).when(authIdentityRemover).deleteIdentity(userId);

        profileService.deleteMyAccount(userId);

        assertThat(profileRepository.findById(userId)).isEmpty();
        assertThat(gameRepository.findById(game.getId())).isEmpty();
        assertThat(gameTurnRepository.findAll()).isEmpty();
        verify(authIdentityRemover).deleteIdentity(userId);
    }

    @Test
    @DisplayName("외부 인증 삭제에서 런타임 예외가 나도 로컬 계정 삭제는 완료된다.")
    void deleteMyAccountStillSucceedsWhenAuthProviderThrowsRuntimeException() {
        UUID userId = UUID.randomUUID();
        Profile profile = profileRepository.save(Profile.of(userId));
        Game game = gameRepository.save(Game.create(profile, JlptLevel.N5));
        gameTurnRepository.save(GameTurn.of(game, 1, "USER", "ねこ"));

        doThrow(new IllegalStateException("unexpected failure")).when(authIdentityRemover).deleteIdentity(userId);

        profileService.deleteMyAccount(userId);

        assertThat(profileRepository.findById(userId)).isEmpty();
        assertThat(gameRepository.findById(game.getId())).isEmpty();
        assertThat(gameTurnRepository.findAll()).isEmpty();
        verify(authIdentityRemover).deleteIdentity(userId);
    }
}
