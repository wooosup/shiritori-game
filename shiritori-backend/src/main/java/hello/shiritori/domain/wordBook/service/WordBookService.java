package hello.shiritori.domain.wordBook.service;

import hello.shiritori.domain.profile.entity.Profile;
import hello.shiritori.domain.profile.repository.ProfileRepository;
import hello.shiritori.domain.word.entity.Word;
import hello.shiritori.domain.word.repository.WordRepository;
import hello.shiritori.domain.wordBook.dto.WordBookResponse;
import hello.shiritori.domain.wordBook.entity.WordBook;
import hello.shiritori.domain.wordBook.repository.WordBookRepository;
import hello.shiritori.global.exception.DuplicateWordException;
import hello.shiritori.global.exception.UserNotFound;
import hello.shiritori.global.exception.WordBookException;
import hello.shiritori.global.exception.WordNotFound;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
public class WordBookService {

    private final WordBookRepository wordBookRepository;
    private final ProfileRepository profileRepository;
    private final WordRepository wordRepository;

    public WordBookResponse save(UUID userId, String wordText) {
        Profile profile = profileRepository.findById(userId)
                .orElseThrow(UserNotFound::new);

        Word word = wordRepository.findByWord(wordText)
                .orElseThrow(WordNotFound::new);

        if (wordBookRepository.existsByProfileAndWord(profile, word)) {
            throw new DuplicateWordException("이미 단어장에 등록된 단어입니다.");
        }

        WordBook wordBook = WordBook.create(profile, word);
        return WordBookResponse.of(wordBookRepository.save(wordBook));
    }

    @Transactional(readOnly = true)
    public List<WordBookResponse> getWordBook(UUID userId) {
        return wordBookRepository.findAllByUserId(userId).stream()
                .map(WordBookResponse::of)
                .toList();
    }

    public void delete(UUID userId, Long wordBookId) {
        WordBook wordBook = wordBookRepository.findById(wordBookId)
                .orElseThrow(WordNotFound::new);

        if (wordBook.notValidateOf(userId)) {
            throw new WordBookException("삭제 권한이 없습니다.");
        }

        wordBookRepository.delete(wordBook);
    }

}
