package hello.shiritori.domain.word.service;

import hello.shiritori.domain.word.dto.WordResponse;
import hello.shiritori.domain.word.repository.WordRepository;
import hello.shiritori.global.exception.WordNotFound;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class WordService {

    private final WordRepository wordRepository;

    public long getTotalWordCount() {
        return wordRepository.count();
    }

    public List<WordResponse> getRandomWordsForBanner() {
        return wordRepository.findRandomWords(10).stream()
                .map(WordResponse::of)
                .toList();
    }

    public WordResponse searchWord(String keyword) {
        return wordRepository.findByWord(keyword)
                .map(WordResponse::of)
                .orElseThrow(WordNotFound::new);
    }

}
