package hello.shiritori.domain.wordBook.entity;

import java.util.Locale;
import java.util.Optional;

public enum QuizScope {
    RECENT,
    FOCUS,
    SELECTED;

    public static QuizScope from(String rawMode) {
        return Optional.ofNullable(rawMode)
                .map(String::trim)
                .filter(mode -> !mode.isEmpty())
                .map(mode -> mode.toUpperCase(Locale.ROOT))
                .map(QuizScope::valueOf)
                .orElse(RECENT);
    }
}
