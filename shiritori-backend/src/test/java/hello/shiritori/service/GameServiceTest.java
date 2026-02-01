package hello.shiritori.service;

import static org.assertj.core.api.Assertions.assertThat;

import hello.shiritori.dto.TurnRequest;
import hello.shiritori.dto.TurnResponse;
import hello.shiritori.entity.Game;
import hello.shiritori.entity.GameTurn;
import hello.shiritori.entity.JlptLevel;
import hello.shiritori.entity.Word;
import hello.shiritori.repository.GameRepository;
import hello.shiritori.repository.GameTurnRepository;
import hello.shiritori.repository.WordRepository;
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
    void playTurn_Real_Success() {
        // given
        Game game = Game.create(null, JlptLevel.N5);
        gameRepository.save(game);

        saveTempWordIfNotExist("家族", "かぞく", "가족");
        saveTempWordIfNotExist("曇", "くも", "구름");
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
        assertThat(response.getUserWord()).isEqualTo("曇");
        assertThat(response.getAiWord()).isEqualTo("森");
    }

    private void saveTempWordIfNotExist(String word, String reading, String meaning) {
        if (!wordRepository.existsByWord((word))) {
            wordRepository.save(Word.of(JlptLevel.N5, word, reading, meaning));
        }
    }

}