package hello.shiritori.domain.wordBook.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import hello.shiritori.domain.game.entity.JlptLevel;
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
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class WordBookServiceTest {

    @Autowired
    private WordBookService wordBookService;

    @Autowired
    private WordBookRepository wordBookRepository;

    @Autowired
    private ProfileRepository profileRepository;

    @Autowired
    private WordRepository wordRepository;

    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        Profile profile = Profile.of(userId);
        profileRepository.save(profile);

        Word word = Word.of(JlptLevel.N5, "りんご", "りんご", "사과");
        wordRepository.save(word);
    }

    @Test
    @DisplayName("단어장에 단어를 저장 할 수 있다.")
    void save() {
        // when
        WordBookResponse response = wordBookService.save(userId, "りんご");

        // then
        assertThat(response).isNotNull();
        assertThat(response.getWord()).isEqualTo("りんご");

        List<WordBook> all = wordBookRepository.findAll();
        assertThat(all).hasSize(1);
        assertThat(all.getFirst().getWord().getWord()).isEqualTo("りんご");
    }

    @Test
    @DisplayName("이미 단어장에 저장된 단어는 중복 저장할 수 없다.")
    void duplicate() {
        // given
        wordBookService.save(userId, "りんご");

        // expect
        assertThatThrownBy(() -> wordBookService.save(userId, "りんご"))
                .isInstanceOf(DuplicateWordException.class)
                .hasMessage("이미 단어장에 등록된 단어입니다.");
    }

    @Test
    @DisplayName("존재하지 않는 유저는 단어를 저장할 수 없다.")
    void notFound() {
        // given
        UUID strangeId = UUID.randomUUID();

        // expect
        assertThatThrownBy(() -> wordBookService.save(strangeId, "りんご"))
                .isInstanceOf(UserNotFound.class);
    }

    @Test
    @DisplayName("단어장에서 단어들을 조회할 수 있다.")
    void getWordBook() {
        // given
        wordBookService.save(userId, "りんご");

        Word word2 = Word.of(JlptLevel.N5, "みかん", "ミカン", "귤");
        wordRepository.save(word2);
        wordBookService.save(userId, "みかん");

        // when
        List<WordBookResponse> result = wordBookService.getWordBook(userId);

        // then
        assertThat(result).hasSize(2);
        assertThat(result).extracting("word")
                .containsExactlyInAnyOrder("りんご", "みかん");
    }

    @Test
    @DisplayName("단어장에서 단어를 삭제할 수 있다.")
    void delete() {
        // given
        WordBookResponse saved = wordBookService.save(userId, "りんご");
        Long wordBookId = saved.getId();

        // when
        wordBookService.delete(userId, wordBookId);

        // then
        assertThat(wordBookRepository.findById(wordBookId)).isEmpty();
    }

    @Test
    @DisplayName("타인의 단어는 삭제할 수 없다.")
    void validateDelete() {
        // given
        WordBookResponse saved = wordBookService.save(userId, "りんご");
        Long wordBookId = saved.getId();

        UUID thiefId = UUID.randomUUID();
        Profile thief = Profile.of(thiefId);
        profileRepository.save(thief);

        // expect
        assertThatThrownBy(() -> wordBookService.delete(thiefId, wordBookId))
                .isInstanceOf(WordBookException.class)
                .hasMessage("삭제 권한이 없습니다.");
    }

}