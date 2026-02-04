package hello.shiritori.domain.word.dto;

import hello.shiritori.domain.game.entity.JlptLevel;
import hello.shiritori.domain.word.entity.Word;
import lombok.Builder;
import lombok.Getter;

@Getter
public class WordResponse {

    private final String word;
    private final String reading;
    private final String meaning;
    private final JlptLevel level;

    @Builder
    private WordResponse(String word, String reading, String meaning, JlptLevel level) {
        this.word = word;
        this.reading = reading;
        this.meaning = meaning;
        this.level = level;
    }

    public static WordResponse of(Word word) {
        return WordResponse.builder()
                .word(word.getWord())
                .reading(word.getReading())
                .meaning(word.getMeaning())
                .level(word.getLevel())
                .build();
    }

}
