package hello.shiritori.global.utils;

import hello.shiritori.domain.word.entity.Word;
import hello.shiritori.global.exception.WordException;
import hello.shiritori.domain.word.repository.WordRepository;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class WordFinder {

    private final WordRepository wordRepository;

    public Word findOrThrow(String input) {
        return findOptional(input)
                .orElseThrow(() -> new WordException("사전에 없는 단어입니다: " + input));
    }

    private Optional<Word> findOptional(String input) {
        Optional<Word> exactMatch = wordRepository.findFirstByWord(input);
        if (exactMatch.isPresent()) return exactMatch;

        String hira = JapaneseUtils.toHiragana(input);
        return wordRepository.findTopByReadingOrderByLevelDesc(hira)
                .or(() -> wordRepository.findTopByReadingOrderByLevelDesc(JapaneseUtils.toKatakana(input)));
    }

}
