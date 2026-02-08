package hello.shiritori.domain.game.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Getter;

@Getter
public class GameStartResponse {

    @JsonProperty("gameId")
    private final Long id;
    private final String word;
    private final String startReading;
    private final String meaning;

    @Builder
    private GameStartResponse(Long id, String word, String startReading, String meaning) {
        this.id = id;
        this.word = word;
        this.startReading = startReading;
        this.meaning = meaning;
    }

    public static GameStartResponse of(Long id, String word, String reading, String meaning) {
        return GameStartResponse.builder()
                .id(id)
                .word(word)
                .startReading(reading)
                .meaning(meaning)
                .build();
    }

}
