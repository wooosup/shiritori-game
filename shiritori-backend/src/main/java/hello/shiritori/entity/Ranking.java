package hello.shiritori.entity;

import com.google.errorprone.annotations.Immutable;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;

@Entity
@Table(name = "ranking_board")
@Immutable
@Getter
public class Ranking {

    @Id
    private String nickname;
    private Integer maxCombo;
    private Integer score;
    @Enumerated(EnumType.STRING)
    private JlptLevel level;
    private LocalDateTime endedAt;

}
