package hello.shiritori.domain.word.entity;

import hello.shiritori.domain.game.entity.JlptLevel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "game_words", indexes = {
        @Index(name = "idx_words_starts_with", columnList = "starts_with"),
        @Index(name = "idx_words_level", columnList = "level")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Word {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private JlptLevel level;

    @Column(nullable = false)
    private String word;

    @Column(nullable = false)
    private String reading;

    @Column(columnDefinition = "TEXT")
    private String meaning;

    @Column(name = "starts_with", length = 1, nullable = false)
    private String startsWith;

    @Column(name = "ends_with", length = 1, nullable = false)
    private String endsWith;

    @Builder
    private Word(JlptLevel level, String word, String reading, String meaning) {
        this.level = level;
        this.word = word;
        this.reading = reading;
        this.meaning = meaning;
        this.startsWith = getEffectiveStartChar();
        this.endsWith = getEffectiveEndChar();
    }

    public static Word of(JlptLevel level, String word, String reading, String meaning) {
        return Word.builder()
                .level(level)
                .word(word)
                .reading(reading)
                .meaning(meaning)
                .build();
    }

    public void updateFromImport(JlptLevel level, String reading, String meaning) {
        this.level = level;
        this.reading = reading;
        this.meaning = meaning;
        this.startsWith = getEffectiveStartChar();
        this.endsWith = getEffectiveEndChar();
    }

    public boolean endsWithN() {
        return reading.endsWith("ん");
    }

    public String getEffectiveEndChar() {
        if (reading == null || reading.isEmpty()) return "";

        char lastChar = reading.charAt(reading.length() - 1);

        if (lastChar == 'ー' && reading.length() > 1) {
            return String.valueOf(reading.charAt(reading.length() - 2));
        }
        return String.valueOf(lastChar);
    }

    public String getEffectiveStartChar() {
        if (reading == null || reading.isEmpty()) return "";

        char firstChar = reading.charAt(0);

        if (firstChar == 'ー' && reading.length() > 1) {
            return String.valueOf(reading.charAt(1));
        }
        return String.valueOf(firstChar);
    }

}
