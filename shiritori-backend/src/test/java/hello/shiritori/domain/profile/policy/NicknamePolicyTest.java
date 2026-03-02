package hello.shiritori.domain.profile.policy;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import hello.shiritori.global.exception.UserException;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class NicknamePolicyTest {

    @Test
    @DisplayName("설정된 욕설 키워드를 차단한다.")
    void blocksConfiguredProfanity() {
        NicknamePolicyProperties properties = new NicknamePolicyProperties();
        properties.setProfanityKeywords(List.of("시발"));
        NicknamePolicy policy = new NicknamePolicy(properties);

        assertThatThrownBy(() -> policy.validate("시발왕"))
                .isInstanceOf(UserException.class)
                .hasMessage("사용할 수 없는 닉네임입니다.");
    }

    @Test
    @DisplayName("설정 기반 키워드로 차단 규칙을 교체할 수 있다.")
    void canOverrideKeywords() {
        NicknamePolicyProperties properties = new NicknamePolicyProperties();
        properties.setProfanityKeywords(List.of("foobar"));
        properties.setSexualKeywords(List.of("sexy"));
        NicknamePolicy policy = new NicknamePolicy(properties);

        assertThatThrownBy(() -> policy.validate("foobarking"))
                .isInstanceOf(UserException.class)
                .hasMessage("사용할 수 없는 닉네임입니다.");

        assertThatCode(() -> policy.validate("시발왕"))
                .doesNotThrowAnyException();
    }
}
