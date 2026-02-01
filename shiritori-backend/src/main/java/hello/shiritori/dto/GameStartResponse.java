package hello.shiritori.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
public class GameStartResponse {

    private final Long gameId;
    private final String word;
    private final String startReading;
    private final String message;

    @Builder
    private GameStartResponse(Long gameId, String word, String startReading, String message) {
        this.gameId = gameId;
        this.word = word;
        this.startReading = startReading;
        this.message = message;
    }

    public static GameStartResponse of(Long gameId) {
        return GameStartResponse.builder()
                .gameId(gameId)
                .word("しりとり")
                .startReading("しりとり")
                .message("게임이 시작되었습니다! 첫 단어는 しりとり 입니다.")
                .build();
    }

}
