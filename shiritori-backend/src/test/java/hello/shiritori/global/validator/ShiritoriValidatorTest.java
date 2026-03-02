package hello.shiritori.global.validator;

import static hello.shiritori.domain.game.entity.JlptLevel.N5;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import hello.shiritori.domain.word.entity.Word;
import hello.shiritori.global.exception.WordException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ShiritoriValidatorTest {

    private ShiritoriValidator shiritoriValidator;

    @BeforeEach
    void setUp() {
        shiritoriValidator = new ShiritoriValidator();
    }

    @Test
    @DisplayName("기본 끝말잇기 연결은 통과한다.")
    void validateConnection_basicConnection() {
        Word previous = Word.of(N5, "雲", "くも", "구름");
        Word current = Word.of(N5, "森", "もり", "숲");

        assertThatCode(() -> shiritoriValidator.validateConnection(previous, current))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("요음 연결(청음화 포함)은 통과한다.")
    void validateConnection_specialSmallKanaConnection() {
        Word previous = Word.of(N5, "樹", "じゅ", "나무");
        Word current = Word.of(N5, "趣味", "しゅみ", "취미");

        assertThatCode(() -> shiritoriValidator.validateConnection(previous, current))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("장음 끝 처리 후 연결되는 단어는 통과한다.")
    void validateConnection_longVowelMarkConnection() {
        Word previous = Word.of(N5, "スーパー", "すーぱー", "슈퍼");
        Word current = Word.of(N5, "花", "はな", "꽃");

        assertThatCode(() -> shiritoriValidator.validateConnection(previous, current))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("연결 규칙을 만족하지 않으면 예외를 던진다.")
    void validateConnection_invalidConnection() {
        Word previous = Word.of(N5, "樹", "じゅ", "나무");
        Word current = Word.of(N5, "中", "ちゅう", "중앙");

        assertThatThrownBy(() -> shiritoriValidator.validateConnection(previous, current))
                .isInstanceOf(WordException.class);
    }
}
