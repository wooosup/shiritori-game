package hello.shiritori.domain.wordBook.service;

import hello.shiritori.domain.game.entity.JlptLevel;
import hello.shiritori.domain.profile.entity.Profile;
import hello.shiritori.domain.profile.repository.ProfileRepository;
import hello.shiritori.domain.word.entity.Word;
import hello.shiritori.domain.word.repository.WordRepository;
import hello.shiritori.domain.wordBook.dto.QuizResponse;
import hello.shiritori.domain.wordBook.entity.QuizScope;
import hello.shiritori.domain.wordBook.dto.WordBookResponse;
import hello.shiritori.domain.wordBook.entity.QuizType;
import hello.shiritori.domain.wordBook.entity.WordBook;
import hello.shiritori.domain.wordBook.repository.WordBookRepository;
import hello.shiritori.global.exception.DuplicateWordException;
import hello.shiritori.global.exception.UserNotFound;
import hello.shiritori.global.exception.WordBookException;
import hello.shiritori.global.exception.WordBookNotFound;
import hello.shiritori.global.exception.WordNotFound;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
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
        return quiz(userId, null, null, null);
    }

    @Transactional(readOnly = true)
    public List<QuizResponse> quiz(UUID userId, String mode, List<Long> selectedIds, String level) {
        List<WordBook> scopedWords = resolveQuizScope(userId, mode, selectedIds);
        List<WordBook> filteredWords = applyLevelFilter(scopedWords, level);
        validateWordBookNotEmpty(filteredWords);

        return filteredWords.stream()
                .limit(10)
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

    private List<WordBook> resolveQuizScope(UUID userId, String mode, List<Long> selectedIds) {
        QuizScope scope;
        try {
            scope = QuizScope.from(mode);
        } catch (IllegalArgumentException exception) {
            throw new WordBookException("지원하지 않는 퀴즈 모드입니다.");
        }

        return switch (scope) {
            case RECENT -> wordBookRepository.findTop10ByProfileIdOrderByCreatedAtDesc(userId);
            case FOCUS -> findFocusWords(userId);
            case SELECTED -> findSelectedWords(userId, selectedIds);
        };
    }

    private List<WordBook> findFocusWords(UUID userId) {
        return wordBookRepository.findAllByUserId(userId).stream()
                .sorted(
                        Comparator.comparingInt(this::calculateFocusPriority).reversed()
                                .thenComparing(WordBook::getCreatedAt, Comparator.reverseOrder())
                                .thenComparing(WordBook::getId, Comparator.reverseOrder())
                )
                .toList();
    }

    private List<WordBook> findSelectedWords(UUID userId, List<Long> selectedIds) {
        if (selectedIds == null || selectedIds.isEmpty()) {
            throw new WordBookException("선택한 단어가 없습니다.");
        }

        List<Long> normalizedIds = selectedIds.stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        if (normalizedIds.isEmpty()) {
            throw new WordBookException("선택한 단어가 없습니다.");
        }

        Map<Long, Integer> orderMap = buildOrderMap(normalizedIds);
        List<WordBook> selectedWords = wordBookRepository.findAllByUserIdAndWordBookIds(userId, normalizedIds);

        if (selectedWords.isEmpty()) {
            throw new WordBookException("선택한 단어를 찾을 수 없습니다.");
        }

        return selectedWords.stream()
                .sorted(Comparator.comparingInt(wordBook -> orderMap.getOrDefault(wordBook.getId(), Integer.MAX_VALUE)))
                .toList();
    }

    private Map<Long, Integer> buildOrderMap(List<Long> ids) {
        Map<Long, Integer> orderMap = new java.util.HashMap<>();
        for (int index = 0; index < ids.size(); index++) {
            orderMap.put(ids.get(index), index);
        }
        return orderMap;
    }

    private List<WordBook> applyLevelFilter(List<WordBook> wordBooks, String rawLevel) {
        Optional<JlptLevel> level = parseLevel(rawLevel);
        if (level.isEmpty()) {
            return wordBooks;
        }

        JlptLevel targetLevel = level.get();
        return wordBooks.stream()
                .filter(wordBook -> wordBook.getWord().getLevel() == targetLevel)
                .toList();
    }

    private Optional<JlptLevel> parseLevel(String rawLevel) {
        if (rawLevel == null || rawLevel.isBlank()) {
            return Optional.empty();
        }

        try {
            JlptLevel parsed = JlptLevel.valueOf(rawLevel.trim().toUpperCase(Locale.ROOT));
            if (parsed == JlptLevel.ALL) {
                return Optional.empty();
            }
            return Optional.of(parsed);
        } catch (IllegalArgumentException exception) {
            throw new WordBookException("지원하지 않는 레벨입니다.");
        }
    }

    private int calculateFocusPriority(WordBook wordBook) {
        JlptLevel level = wordBook.getWord().getLevel();
        if (level == null) {
            return 0;
        }
        return switch (level) {
            case N1 -> 5;
            case N2 -> 4;
            case N3 -> 3;
            case N4 -> 2;
            case N5 -> 1;
            case ALL -> 0;
        };
    }

    private QuizResponse generateRandomQuiz(WordBook wordBook) {
        List<Word> incorrectWords = wordRepository.findRandomWords(3);
        QuizType randomType = QuizType.random();
        return QuizResponse.of(wordBook, randomType, incorrectWords);
    }

}
