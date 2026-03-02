package hello.shiritori.domain.game.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;

import hello.shiritori.domain.gameTurn.dto.TurnRequest;
import hello.shiritori.domain.gameTurn.dto.TurnResponse;
import hello.shiritori.domain.game.entity.Game;
import hello.shiritori.domain.gameTurn.entity.GameTurn;
import hello.shiritori.domain.game.entity.JlptLevel;
import hello.shiritori.domain.profile.entity.Profile;
import hello.shiritori.domain.profile.repository.ProfileRepository;
import hello.shiritori.domain.word.entity.Word;
import hello.shiritori.domain.game.repository.GameRepository;
import hello.shiritori.domain.gameTurn.repository.GameTurnRepository;
import hello.shiritori.domain.word.repository.WordRepository;
import hello.shiritori.domain.ranking.service.RankingService;
import hello.shiritori.global.exception.GameAccessDeniedException;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class GameServiceTest {

    @Autowired
    GameService gameService;

    @Autowired
    GameRepository gameRepository;

    @Autowired
    GameTurnRepository gameTurnRepository;

    @Autowired
    WordRepository wordRepository;

    @Autowired
    ProfileRepository profileRepository;

    @MockitoBean
    RankingService rankingService;

    @Test
    @DisplayName("플레이어가 올바른 단어를 입력했을 때, AI가 응답 단어를 반환해야 한다.")
    void playTurn() {
        // given
        wordRepository.deleteAll();
        UUID userId = UUID.randomUUID();
        Profile profile = profileRepository.save(Profile.of(userId));

        Game game = Game.create(profile, JlptLevel.N5);
        gameRepository.save(game);

        saveTempWordIfNotExist("家族", "かぞく", "가족");
        saveTempWordIfNotExist("雲", "くも", "구름");
        saveTempWordIfNotExist("森", "もり", "숲");

        GameTurn lastTurn = GameTurn.builder()
                .game(game)
                .wordText("家族")
                .speaker("AI")
                .turnNumber(1)
                .build();
        gameTurnRepository.save(lastTurn);

        // when
        TurnRequest request = TurnRequest.of("くも");
        TurnResponse response = gameService.playTurn(userId, game.getId(), request);

        // then
        assertThat(response.getStatus()).isEqualTo("PLAYING");
        assertThat(response.getUserWord()).isEqualTo("雲");
        assertThat(response.getAiWord()).isEqualTo("森");
        assertThat(response.getCurrentScore()).isGreaterThan(0);
        assertThat(response.getCurrentCombo()).isEqualTo(1);
    }

    @Test
    @DisplayName("ALL 레벨에서는 레벨 조건 없이 시작 단어를 찾는다.")
    void findRandomStartWordWithAllLevel() {
        // given
        wordRepository.deleteAll();
        wordRepository.save(Word.of(JlptLevel.N1, "経済", "けいざい", "경제"));
        wordRepository.save(Word.of(JlptLevel.N5, "雲", "くも", "구름"));
        wordRepository.save(Word.of(null, "家族", "かぞく", "가족"));

        // when
        var result = wordRepository.findRandomStartWord(null);

        // then
        assertThat(result).isPresent();
    }

    @Test
    @DisplayName("다른 사용자 게임에 접근하면 예외가 발생한다.")
    void playTurnRejectsDifferentUser() {
        UUID ownerId = UUID.randomUUID();
        UUID attackerId = UUID.randomUUID();
        Profile owner = profileRepository.save(Profile.of(ownerId));
        Game game = gameRepository.save(Game.create(owner, JlptLevel.N5));

        assertThatThrownBy(() -> gameService.playTurn(attackerId, game.getId(), TurnRequest.of("くも")))
                .isInstanceOf(GameAccessDeniedException.class);
    }

    @Test
    @DisplayName("타임아웃 종료 시 랭킹 스냅샷을 즉시 갱신한다.")
    void timeoutGameRefreshesRankingSnapshot() {
        UUID userId = UUID.randomUUID();
        Profile profile = profileRepository.save(Profile.of(userId));
        Game game = gameRepository.save(Game.create(profile, JlptLevel.N5));

        gameService.timeoutGame(userId, game.getId());

        verify(rankingService).refreshRankingSnapshot();
    }

    private void saveTempWordIfNotExist(String word, String reading, String meaning) {
        if (!wordRepository.existsByWord((word))) {
            wordRepository.save(Word.of(JlptLevel.N5, word, reading, meaning));
        }
    }

}
