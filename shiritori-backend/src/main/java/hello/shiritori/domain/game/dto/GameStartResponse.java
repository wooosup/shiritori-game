package hello.shiritori.domain.game.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
public class GameStartResponse {

    private final Long id;
    private final String word;
    private final String startReading;
    private final String message;

    @Builder
    private GameStartResponse(Long id, String word, String startReading, String message) {
        this.id = id;
        this.word = word;
        this.startReading = startReading;
        this.message = message;
    }

    public static GameStartResponse of(Long id, String word, String reading) {
        return GameStartResponse.builder()
                .id(id)
                .word(word)
                .startReading(reading)
                .message("게임이 시작되었습니다! 첫 단어는" + word + "입니다.")
                .build();
    }

}
