package hello.shiritori.domain.game.dto;

import hello.shiritori.domain.game.entity.JlptLevel;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class GameStartRequest {

    @NotNull(message = "레벨은 필수입니다.")
    private JlptLevel level;

    @Builder
    private GameStartRequest(JlptLevel level) {
        this.level = level;
    }

    public static GameStartRequest of(JlptLevel level) {
        return GameStartRequest.builder()
                .level(level)
                .build();
    }

}
