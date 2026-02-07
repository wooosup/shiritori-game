package hello.shiritori.domain.wordBook.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
public class AddWordRequest {

    private final String word;

    @Builder
    private AddWordRequest(String word) {
        this.word = word;
    }

    public static AddWordRequest of(String word) {
        return AddWordRequest.builder()
                .word(word)
                .build();
    }

}
