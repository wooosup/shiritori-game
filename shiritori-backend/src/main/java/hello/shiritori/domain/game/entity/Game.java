package hello.shiritori.domain.game.entity;

import static hello.shiritori.domain.game.entity.GameStatus.*;

import hello.shiritori.domain.profile.entity.Profile;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "games")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Game {

    public static final int N1_SCORE = 100;
    public static final int N2_SCORE = 80;
    public static final int N3_SCORE = 50;
    public static final int DEFAULT_SCORE = 20;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private Profile user;

    private int score;

    @Column(name = "max_combo")
    private int maxCombo;

    @Column(name = "current_combo")
    private int currentCombo;

    @Enumerated(EnumType.STRING)
    private GameStatus status;

    @Enumerated(EnumType.STRING)
    private JlptLevel level;

    @Column(name = "last_turn_at")
    private LocalDateTime lastTurnAt;

    @Column(name = "started_at", updatable = false)
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Version
    private Long version;

    @Builder
    public Game(Profile user, int score, int maxCombo, int currentCombo, GameStatus status, JlptLevel level,
                LocalDateTime lastTurnAt, LocalDateTime startedAt, LocalDateTime endedAt) {
        this.user = user;
        this.score = score;
        this.maxCombo = maxCombo;
        this.currentCombo = currentCombo;
        this.status = status;
        this.level = level;
        this.lastTurnAt = lastTurnAt;
        this.startedAt = startedAt;
        this.endedAt = endedAt;
    }

    public static Game create(Profile user, JlptLevel level) {
        return Game.builder()
                .user(user)
                .score(0)
                .maxCombo(0)
                .currentCombo(0)
                .status(PLAYING)
                .level(level)
                .lastTurnAt(LocalDateTime.now())
                .startedAt(LocalDateTime.now())
                .build();
    }

    public void applyCorrectAnswer(JlptLevel level) {
        validateActive();
        incrementCombo();
        addScore(level);
        updateLastTurnTime();
    }

    public void updateLastTurnTime() {
        this.lastTurnAt = LocalDateTime.now();
    }

    public void finish(GameStatus status) {
        if (this.status != GameStatus.PLAYING) {
            return;
        }
        this.status = status;
        this.endedAt = LocalDateTime.now();
    }

    public boolean isTimeOut(long limitSeconds) {
        if (lastTurnAt == null) {
            return false;
        }
        long seconds = ChronoUnit.SECONDS.between(lastTurnAt, LocalDateTime.now());
        return seconds > limitSeconds;
    }

    private void incrementCombo() {
        currentCombo++;
        updateMaxCombo();
    }

    private void updateMaxCombo() {
        if (currentCombo > maxCombo) {
            maxCombo = currentCombo;
        }
    }

    private void addScore(JlptLevel level) {
        score += calculatePoints(level);
    }


    private int calculatePoints(JlptLevel level) {
        int base = switch (level) {
            case N1 -> N1_SCORE;
            case N2 -> N2_SCORE;
            case N3 -> N3_SCORE;
            default -> DEFAULT_SCORE;
        };
        return base + (this.currentCombo) * 10;
    }

    private void validateActive() {
        if (this.status != PLAYING) {
            throw new IllegalStateException("이미 종료된 게임입니다.");
        }
    }

}
