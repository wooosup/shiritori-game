package hello.shiritori.domain.ranking.service;

import static hello.shiritori.domain.game.entity.GameStatus.GAME_OVER;
import static hello.shiritori.domain.game.entity.GameStatus.WIN;
import static org.assertj.core.api.Assertions.assertThat;

import hello.shiritori.domain.game.entity.Game;
import hello.shiritori.domain.game.entity.JlptLevel;
import hello.shiritori.domain.game.repository.GameRepository;
import hello.shiritori.domain.profile.entity.Profile;
import hello.shiritori.domain.profile.policy.NicknameValidator;
import hello.shiritori.domain.profile.repository.ProfileRepository;
import hello.shiritori.domain.ranking.dto.MyBestRankResponse;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class RankingServiceTest {

    private static final NicknameValidator NOOP_NICKNAME_VALIDATOR = nickname -> {
    };

    @Autowired
    private RankingService rankingService;

    @Autowired
    private GameRepository gameRepository;

    @Autowired
    private ProfileRepository profileRepository;

    @Test
    @DisplayName("진행 중 게임은 제외하고 가장 높은 점수의 종료 게임을 반환한다.")
    void getMyBestRankExcludesPlayingGame() {
        UUID userId = UUID.randomUUID();
        Profile profile = profileRepository.save(Profile.of(userId));
        profile.updateNickname("neko", NOOP_NICKNAME_VALIDATOR);

        Game playingGame = gameRepository.save(Game.create(profile, JlptLevel.N1));
        Game finishedLowScore = gameRepository.save(Game.create(profile, JlptLevel.N5));
        Game finishedHighScore = gameRepository.save(Game.create(profile, JlptLevel.N3));

        applyCorrectAnswer(playingGame, 4, JlptLevel.N1);
        applyCorrectAnswer(finishedLowScore, 3, JlptLevel.N5);
        applyCorrectAnswer(finishedHighScore, 4, JlptLevel.N3);

        finishedLowScore.finish(WIN);
        finishedHighScore.finish(GAME_OVER);
        gameRepository.flush();

        MyBestRankResponse response = rankingService.getMyBestRank(userId);

        assertThat(response).isNotNull();
        assertThat(response.nickname()).isEqualTo("neko");
        assertThat(response.score()).isEqualTo(finishedHighScore.getScore());
        assertThat(response.maxCombo()).isEqualTo(4);
        assertThat(response.level()).isEqualTo(JlptLevel.N3);
    }

    @Test
    @DisplayName("종료된 게임이 없으면 최고 기록은 null을 반환한다.")
    void getMyBestRankWithNoFinishedGame() {
        UUID userId = UUID.randomUUID();
        Profile profile = profileRepository.save(Profile.of(userId));

        Game playingGame = gameRepository.save(Game.create(profile, JlptLevel.N2));
        applyCorrectAnswer(playingGame, 2, JlptLevel.N2);

        MyBestRankResponse response = rankingService.getMyBestRank(userId);

        assertThat(response).isNull();
    }

    private void applyCorrectAnswer(Game game, int count, JlptLevel level) {
        for (int i = 0; i < count; i++) {
            game.applyCorrectAnswer(level);
        }
    }
}
