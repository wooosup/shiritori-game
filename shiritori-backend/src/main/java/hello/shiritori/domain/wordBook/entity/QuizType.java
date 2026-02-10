package hello.shiritori.domain.wordBook.entity;

import hello.shiritori.domain.word.entity.Word;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum QuizType {
    MEANING("뜻 맞추기") {
        @Override
        public String makeQuestion(Word word) {
            return word.getWord();
        }

        @Override
        public String extractOptionText(Word word) {
            return word.getMeaning();
        }
    },
    WORD("단어 맞추기") {
        @Override
        public String makeQuestion(Word word) {
            return word.getMeaning();
        }

        @Override
        public String extractOptionText(Word word) {
            return word.getWord();
        }
    };

    private final String description;
    private static final Random RANDOM = new Random();

    public abstract String makeQuestion(Word word);
    public abstract String extractOptionText(Word word);

    public static QuizType random() {
        QuizType[] types = QuizType.values();
        return types[RANDOM.nextInt(types.length)];
    }

    public List<String> generateOptions(Word corrcetWord, List<Word> incorrectWords) {
        List<String> options = new ArrayList<>();

        options.add(extractOptionText(corrcetWord));
        incorrectWords.forEach(word -> options.add(extractOptionText(word)));

        Collections.shuffle(options);
        return options;
    }

}
