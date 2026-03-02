package hello.shiritori.domain.game.entity;

import static hello.shiritori.domain.game.entity.JlptLevel.N5;
import static hello.shiritori.domain.game.entity.JlptLevel.ALL;
import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class GameTest {
    
    @Test
    @DisplayName("콤보를 적용하고 점수를 계산한다.")
    void applyCorrectAnswer() throws Exception {
        //given
        Game game = Game.create(null, N5);

        //when
        game.applyCorrectAnswer(N5);
        
        //then
        assertThat(game.getMaxCombo()).isEqualTo(1);
        assertThat(game.getScore()).isEqualTo(26);
    }

    @Test
    @DisplayName("레벨이 null이어도 기본 점수로 계산한다.")
    void applyCorrectAnswerWithNullLevel() {
        // given
        Game game = Game.create(null, N5);

        // when
        game.applyCorrectAnswer(null);

        // then
        assertThat(game.getScore()).isEqualTo(26);
        assertThat(game.getMaxCombo()).isEqualTo(1);
    }

    @Test
    @DisplayName("ALL 레벨도 기본 점수로 계산한다.")
    void applyCorrectAnswerWithAllLevel() {
        // given
        Game game = Game.create(null, ALL);

        // when
        game.applyCorrectAnswer(ALL);

        // then
        assertThat(game.getScore()).isEqualTo(30);
        assertThat(game.getMaxCombo()).isEqualTo(1);
    }

    @Test
    @DisplayName("ALL 레벨에서는 단어 난이도가 점수에 반영되지만 격차는 완만하다.")
    void applyCorrectAnswerWithAllLevelAndWordDifficulty() {
        // given
        Game easyWordGame = Game.create(null, ALL);
        Game hardWordGame = Game.create(null, ALL);

        // when
        easyWordGame.applyCorrectAnswer(N5);
        hardWordGame.applyCorrectAnswer(JlptLevel.N1);

        // then
        assertThat(hardWordGame.getScore()).isGreaterThan(easyWordGame.getScore());
        assertThat(hardWordGame.getScore() - easyWordGame.getScore()).isEqualTo(16);
    }

    @Test
    @DisplayName("게임 상태를 종료로 변경한다.")
    void finish() throws Exception {
        //given
        Game game = Game.create(null, N5);

        //when
        game.finish(GameStatus.GAME_OVER);

        //then
        assertThat(game.getStatus()).isEqualTo(GameStatus.GAME_OVER);
    }

    @Test
    @DisplayName("제한 시간을 초과하면 true를 반환한다")
    void isTimeOut() throws Exception {
        //given
        Game game = Game.create(null, N5);
        game.updateLastTurnTime();
        Thread.sleep(2000);

        //when
        boolean result = game.isTimeOut(1);

        //then
        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("제한 시간 내이면 false를 반환한다")
    void isTimeOutFalse() throws Exception {
        //given
        Game game = Game.create(null, N5);
        game.updateLastTurnTime();

        //when
        boolean result = game.isTimeOut(10);

        //then
        assertThat(result).isFalse();
    }

}
