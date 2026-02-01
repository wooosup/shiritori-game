package hello.shiritori.entity;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class WordTest {

    @Test
    @DisplayName("단어 생성 시 시작/끝 글자가 자동으로 계산되어야 한다.")
    void calculateChars() throws Exception {
        //given
        String reading = "かぞく";

        //when
        Word word = Word.of(JlptLevel.N5, "家族", reading, "가족");

        //then
        assertThat(word.getWord()).isEqualTo("家族");
        assertThat(word.getReading()).isEqualTo("かぞく");
        assertThat(word.getMeaning()).isEqualTo("가족");
        assertThat(word.getStartsWith()).isEqualTo("か");
        assertThat(word.getEndsWith()).isEqualTo("く");
    }

    @Test
    @DisplayName("'ん'으로 끝나면 true를 반환한다.")
    void endsWithN_True() throws Exception {
        //given
        Word word = Word.of(JlptLevel.N5, "人間", "にんげん", "인간");

        //then
        assertThat(word.endsWithN()).isTrue();
    }

    @Test
    @DisplayName("'ん'으로 끝나지 않으면 false를 반환한다.")
    void endsWithN_False() {
        // given
        Word word = Word.of(JlptLevel.N5, "曇", "くも", "구름");

        // then
        assertThat(word.endsWithN()).isFalse();
    }

    @ParameterizedTest
    @CsvSource({
            "タクシー, シ",
            "コーヒー, ヒ",
            "スキー, キ"
    })
    @DisplayName("장음으로 끝나면 그 앞 글자를 끝 글자로 반환해야 한다.")
    void effectiveEndChar_Long(String reading, String endChar) throws Exception {
        //given
        Word word = Word.of(JlptLevel.N5, "Test", reading, "Meaning");

        //then
        assertThat(word.getEndsWith()).isEqualTo(endChar);
    }

    @Test
    @DisplayName("일반적인 경우 마지막 글자를 끝 글자로 반환해야 한다.")
    void effectiveEndChar_Normal() throws Exception {
        //given
        Word word = Word.of(JlptLevel.N5, "猫", "ねこ", "고양이");

        //then
        assertThat(word.getEndsWith()).isEqualTo("こ");
    }

}