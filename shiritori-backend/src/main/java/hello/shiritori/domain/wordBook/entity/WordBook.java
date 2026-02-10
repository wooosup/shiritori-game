package hello.shiritori.domain.wordBook.entity;

import hello.shiritori.domain.common.BaseEntity;
import hello.shiritori.domain.profile.entity.Profile;
import hello.shiritori.domain.word.entity.Word;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
        name = "word_book",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_word_book_user_word", columnNames = {"user_id", "word_id"})
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WordBook extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private Profile profile;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "word_id", nullable = false)
    private Word word;

    @Builder
    private WordBook(Profile profile, Word word) {
        this.profile = profile;
        this.word = word;
    }

    public static WordBook create(Profile profile, Word word) {
        return WordBook.builder()
                .profile(profile)
                .word(word)
                .build();
    }

    public boolean isNotOwnedBy(UUID userId) {
        return !profile.getId().equals(userId);
    }

}


