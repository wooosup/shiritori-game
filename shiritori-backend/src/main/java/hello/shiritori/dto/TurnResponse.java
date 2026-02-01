package hello.shiritori.dto;

import static hello.shiritori.entity.GameStatus.GAME_OVER;
import static hello.shiritori.entity.GameStatus.PLAYING;

import hello.shiritori.entity.Game;
import hello.shiritori.entity.Word;
import lombok.Builder;
import lombok.Getter;

@Getter
public class TurnResponse {

    private final String status;
    private final String userWord;
    private final String userReading;
    private final String aiWord;
    private final String aiReading;
    private final String aiMeaning;
    private final int currentScore;
    private final int currentCombo;
    private final String message;

    @Builder
    private TurnResponse(String status, String userWord, String userReading, String aiWord, String aiReading, String aiMeaning,
                         int currentScore, int currentCombo, String message) {
        this.status = status;
        this.userWord = userWord;
        this.userReading = userReading;
        this.aiWord = aiWord;
        this.aiReading = aiReading;
        this.aiMeaning = aiMeaning;
        this.currentScore = currentScore;
        this.currentCombo = currentCombo;
        this.message = message;
    }

    public static TurnResponse ofSuccess(Game game, Word userWord, Word aiWord) {
        return TurnResponse.builder()
                .status(PLAYING.name())
                .userWord(userWord.getWord())
                .userReading(userWord.getReading())
                .aiWord(aiWord.getWord())
                .aiReading(aiWord.getReading())
                .aiMeaning(aiWord.getMeaning())
                .currentScore(game.getScore())
                .currentCombo(game.getMaxCombo())
                .message("AI가 '" + aiWord.getWord() + "'(으)로 받아쳤습니다!")
                .build();
    }

    public static TurnResponse ofUserLose(Game game, String userWordText, String message) {
        return TurnResponse.builder()
                .status(GAME_OVER.name())
                .userWord(userWordText)
                .userReading(null)
                .aiWord(null)
                .currentScore(game.getScore())
                .currentCombo(game.getMaxCombo())
                .message(message)
                .build();
    }

    public static TurnResponse ofUserWin(Game game, Word userWordEntity) {
        return TurnResponse.builder()
                .status("WIN")
                .userWord(userWordEntity.getWord())
                .userReading(userWordEntity.getReading())
                .aiWord(null)
                .currentScore(game.getScore())
                .currentCombo(game.getMaxCombo())
                .message("AI가 항복했습니다! 당신의 승리입니다! 🎉")
                .build();
    }
}
