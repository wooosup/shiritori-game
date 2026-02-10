package hello.shiritori.domain.wordBook.repository;

import hello.shiritori.domain.profile.entity.Profile;
import hello.shiritori.domain.word.entity.Word;
import hello.shiritori.domain.wordBook.entity.WordBook;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WordBookRepository extends JpaRepository<WordBook, Long> {

    boolean existsByProfileAndWord(Profile profile, Word word);

    @Query("select wb from WordBook wb join fetch wb.word where wb.profile.id = :userId order by wb.createdAt desc")
    List<WordBook> findAllByUserId(@Param("userId") UUID userId);

    List<WordBook> findTop10ByProfileIdOrderByCreatedAtDesc(UUID profileId);

}
