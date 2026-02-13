package hello.shiritori.domain.wordBook.service;

import hello.shiritori.domain.profile.entity.Profile;
import hello.shiritori.domain.profile.repository.ProfileRepository;
import hello.shiritori.domain.word.entity.Word;
import hello.shiritori.domain.word.repository.WordRepository;
import hello.shiritori.domain.wordBook.dto.QuizResponse;
import hello.shiritori.domain.wordBook.dto.WordBookResponse;
import hello.shiritori.domain.wordBook.entity.QuizType;
import hello.shiritori.domain.wordBook.entity.WordBook;
import hello.shiritori.domain.wordBook.repository.WordBookRepository;
import hello.shiritori.global.exception.DuplicateWordException;
import hello.shiritori.global.exception.UserNotFound;
import hello.shiritori.global.exception.WordBookException;
import hello.shiritori.global.exception.WordBookNotFound;
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
        Profile profile = findProfileOrThrow(userId);
        Word word = findWordOrThrow(wordText);
        validateNotDuplicate(profile, word);

        WordBook wordBook = WordBook.create(profile, word);
        WordBook savedWordBook = wordBookRepository.save(wordBook);

        return WordBookResponse.of(savedWordBook);
    }

    @Transactional(readOnly = true)
    public List<WordBookResponse> getWordBook(UUID userId) {
        List<WordBook> wordBooks = wordBookRepository.findAllByUserId(userId);
        return convertToWordBookResponses(wordBooks);
    }

    @Transactional(readOnly = true)
    public List<QuizResponse> quiz(UUID userId) {
        List<WordBook> myWords = wordBookRepository.findTop10ByProfileIdOrderByCreatedAtDesc(userId);
        validateWordBookNotEmpty(myWords);

        return myWords.stream()
                .map(this::generateRandomQuiz)
                .toList();
    }

    public void delete(UUID userId, Long wordBookId) {
        WordBook wordBook = findWordBookOrThrow(wordBookId);
        validateOwnership(wordBook, userId);

        wordBookRepository.delete(wordBook);
    }

    private Profile findProfileOrThrow(UUID userId) {
        return profileRepository.findById(userId)
                .orElseThrow(UserNotFound::new);
    }

    private Word findWordOrThrow(String wordText) {
        return wordRepository.findByWord(wordText)
                .orElseThrow(WordNotFound::new);
    }

    private WordBook findWordBookOrThrow(Long wordBookId) {
        return wordBookRepository.findById(wordBookId)
                .orElseThrow(WordBookNotFound::new);
    }

    private void validateNotDuplicate(Profile profile, Word word) {
        if (wordBookRepository.existsByProfileAndWord(profile, word)) {
            throw new DuplicateWordException("이미 단어장에 등록된 단어입니다.");
        }
    }

    private void validateWordBookNotEmpty(List<WordBook> wordBooks) {
        if (wordBooks.isEmpty()) {
            throw new WordBookException("단어장이 비어있습니다. 먼저 단어를 저장해주세요.");
        }
    }

    private void validateOwnership(WordBook wordBook, UUID userId) {
        if (wordBook.isNotOwnedBy(userId)) {
            throw new WordBookException("삭제 권한이 없습니다.");
        }
    }

    private List<WordBookResponse> convertToWordBookResponses(List<WordBook> wordBooks) {
        return wordBooks.stream()
                .map(WordBookResponse::of)
                .toList();
    }

    private QuizResponse generateRandomQuiz(WordBook wordBook) {
        List<Word> incorrectWords = wordRepository.findRandomWords(3);
        QuizType randomType = QuizType.random();
        return QuizResponse.of(wordBook, randomType, incorrectWords);
    }

}
