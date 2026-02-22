package hello.shiritori.domain.game.service;

import static org.assertj.core.api.Assertions.assertThat;

import hello.shiritori.domain.gameTurn.dto.TurnRequest;
import hello.shiritori.domain.gameTurn.dto.TurnResponse;
import hello.shiritori.domain.game.entity.Game;
import hello.shiritori.domain.gameTurn.entity.GameTurn;
import hello.shiritori.domain.game.entity.JlptLevel;
import hello.shiritori.domain.word.entity.Word;
import hello.shiritori.domain.game.repository.GameRepository;
import hello.shiritori.domain.gameTurn.repository.GameTurnRepository;
import hello.shiritori.domain.word.repository.WordRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
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

    @Test
    @DisplayName("플레이어가 올바른 단어를 입력했을 때, AI가 응답 단어를 반환해야 한다.")
    void playTurn() {
        // given
        wordRepository.deleteAll();

        Game game = Game.create(null, JlptLevel.N5);
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
        TurnResponse response = gameService.playTurn(game.getId(), request);

        // then
        assertThat(response.getStatus()).isEqualTo("PLAYING");
        assertThat(response.getUserWord()).isEqualTo("雲");
        assertThat(response.getAiWord()).isEqualTo("森");
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

    private void saveTempWordIfNotExist(String word, String reading, String meaning) {
        if (!wordRepository.existsByWord((word))) {
            wordRepository.save(Word.of(JlptLevel.N5, word, reading, meaning));
        }
    }

}
