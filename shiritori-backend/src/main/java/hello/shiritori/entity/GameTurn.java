package hello.shiritori.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "game_turns")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GameTurn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_id")
    private Game game;

    @Column(name = "turn_number", nullable = false)
    private int turnNumber;

    @Column(nullable = false, length = 10)
    private String speaker;

    @Column(name = "word_text", nullable = false, length = 100)
    private String wordText;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Builder
    private GameTurn(Game game, int turnNumber, String speaker, String wordText, LocalDateTime createdAt) {
        this.game = game;
        this.turnNumber = turnNumber;
        this.speaker = speaker;
        this.wordText = wordText;
        this.createdAt = createdAt;
    }

    public static GameTurn of(Game game, int turnNumber, String speaker, String wordText) {
        return GameTurn.builder()
                .game(game)
                .turnNumber(turnNumber)
                .speaker(speaker)
                .wordText(wordText)
                .createdAt(LocalDateTime.now())
                .build();
    }

}
