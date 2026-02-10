package hello.shiritori.domain.wordBook.dto;

import hello.shiritori.domain.word.entity.Word;
import hello.shiritori.domain.wordBook.entity.QuizType;
import hello.shiritori.domain.wordBook.entity.WordBook;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
public class QuizResponse {

    private final Long id;
    private final String type;
    private final String question;
    private final String answer;
    private final List<String> options;

    @Builder
    private QuizResponse(Long id, String type, String question, String answer, List<String> options) {
        this.id = id;
        this.type = type;
        this.question = question;
        this.answer = answer;
        this.options = options;
    }

    public static QuizResponse of(WordBook wordBook, QuizType type, List<Word> options) {
        Word word = wordBook.getWord();

        return QuizResponse.builder()
                .id(wordBook.getId())
                .type(type.getDescription())
                .question(type.makeQuestion(word))
                .answer(type.extractOptionText(word))
                .options(type.generateOptions(word, options))
                .build();
    }

}
