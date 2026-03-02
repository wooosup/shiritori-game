package hello.shiritori.domain.gameTurn.entity;

import hello.shiritori.domain.common.BaseEntity;
import hello.shiritori.domain.game.entity.Game;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "game_turns",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_game_turn_game_turn_number", columnNames = {"game_id", "turn_number"})
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GameTurn extends BaseEntity {

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

    @Builder
    private GameTurn(Game game, int turnNumber, String speaker, String wordText) {
        this.game = game;
        this.turnNumber = turnNumber;
        this.speaker = speaker;
        this.wordText = wordText;
    }

    public static GameTurn of(Game game, int turnNumber, String speaker, String wordText) {
        return GameTurn.builder()
                .game(game)
                .turnNumber(turnNumber)
                .speaker(speaker)
                .wordText(wordText)
                .build();
    }

}
