package hello.shiritori.domain.wordBook.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class AddWordRequest {

    private String word;

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
