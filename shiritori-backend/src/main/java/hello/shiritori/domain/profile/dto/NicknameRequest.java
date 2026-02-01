package hello.shiritori.domain.profile.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class NicknameRequest {

    @NotBlank(message = "닉네임은 필수입니다.")
    private String nickname;
}
