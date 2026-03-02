package hello.shiritori.domain.game.entity;

import static hello.shiritori.domain.game.entity.GameStatus.PLAYING;

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

    public static final int N1_BASE_SCORE = 42;
    public static final int N2_BASE_SCORE = 38;
    public static final int N3_BASE_SCORE = 34;
    public static final int N4_BASE_SCORE = 30;
    public static final int N5_BASE_SCORE = 26;
    public static final int DEFAULT_BASE_SCORE = 30;
    public static final int EARLY_COMBO_STEP_SCORE = 6;
    public static final int LATE_COMBO_STEP_SCORE = 3;
    public static final int EARLY_COMBO_BONUS_LIMIT = 5;

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

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "pass_count")
    private int passCount;

    @Version
    private Long version;

    @Builder
    public Game(Profile user, int score, int maxCombo, int currentCombo, GameStatus status, JlptLevel level,
                LocalDateTime lastTurnAt, LocalDateTime endedAt, int passCount) {
        this.user = user;
        this.score = score;
        this.maxCombo = maxCombo;
        this.currentCombo = currentCombo;
        this.status = status;
        this.level = level;
        this.lastTurnAt = lastTurnAt;
        this.endedAt = endedAt;
        this.passCount = passCount;
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
                .passCount(3)
                .build();
    }

    public void applyCorrectAnswer(JlptLevel wordLevel) {
        validateActive();
        incrementCombo();
        addScore(wordLevel);
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

    private void addScore(JlptLevel wordLevel) {
        score += calculateBasePoints(wordLevel) + calculateComboBonus();
    }


    private int calculateBasePoints(JlptLevel wordLevel) {
        JlptLevel scoringLevel = resolveScoringLevel(wordLevel);
        return switch (scoringLevel) {
            case N1 -> N1_BASE_SCORE;
            case N2 -> N2_BASE_SCORE;
            case N3 -> N3_BASE_SCORE;
            case N4 -> N4_BASE_SCORE;
            case N5 -> N5_BASE_SCORE;
            default -> DEFAULT_BASE_SCORE;
        };
    }

    private JlptLevel resolveScoringLevel(JlptLevel wordLevel) {
        if (this.level == null || this.level == JlptLevel.ALL) {
            return wordLevel == null ? JlptLevel.ALL : wordLevel;
        }
        return this.level;
    }

    private int calculateComboBonus() {
        int streak = Math.max(0, this.currentCombo - 1);
        int earlyBonus = Math.min(streak, EARLY_COMBO_BONUS_LIMIT) * EARLY_COMBO_STEP_SCORE;
        int lateBonus = Math.max(0, streak - EARLY_COMBO_BONUS_LIMIT) * LATE_COMBO_STEP_SCORE;
        return earlyBonus + lateBonus;
    }

    private void validateActive() {
        if (this.status != PLAYING) {
            throw new IllegalStateException("이미 종료된 게임입니다.");
        }
    }

    public void decreasePassCount() {
        this.passCount--;
    }

}
