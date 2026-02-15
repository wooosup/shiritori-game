package hello.shiritori.domain.gameTurn.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class TurnRequest {

    @NotNull(message = "게임 ID는 필수입니다.")
    private Long gameId;

    @NotBlank(message = "단어를 입력해주세요.")
    private String word;

    @Builder
    private TurnRequest(Long gameId, String word) {
        this.gameId = gameId;
        this.word = word;
    }

    public static TurnRequest of(String word) {
        return TurnRequest.builder()
                .word(word)
                .build();
    }
}
