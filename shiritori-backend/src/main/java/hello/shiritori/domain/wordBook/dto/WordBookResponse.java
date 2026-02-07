package hello.shiritori.domain.wordBook.dto;

import hello.shiritori.domain.wordBook.entity.WordBook;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
public class WordBookResponse {

    private final Long id;
    private final Long wordId;
    private final String word;
    private final String reading;
    private final String meaning;
    private final LocalDateTime createdAt;

    @Builder
    private WordBookResponse(Long id, Long wordId, String word, String reading, String meaning, LocalDateTime createdAt) {
        this.id = id;
        this.wordId = wordId;
        this.word = word;
        this.reading = reading;
        this.meaning = meaning;
        this.createdAt = createdAt;
    }

    public static WordBookResponse of(WordBook wordBook) {
        return WordBookResponse.builder()
                .id(wordBook.getId())
                .wordId(wordBook.getWord().getId())
                .word(wordBook.getWord().getWord())
                .reading(wordBook.getWord().getReading())
                .meaning(wordBook.getWord().getMeaning())
                .createdAt(wordBook.getCreatedAt())
                .build();
    }

}
