package hello.shiritori.domain.profile.policy;

import hello.shiritori.global.exception.UserException;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class NicknamePolicy implements NicknameValidator {

    private static final Pattern ONLY_KOREAN_JAMO = Pattern.compile("^[ㄱ-ㅎㅏ-ㅣ]+$");
    private final Set<String> profanityKeywords;
    private final Set<String> sexualKeywords;

    public NicknamePolicy(NicknamePolicyProperties properties) {
        this.profanityKeywords = normalizeKeywordSet(properties.getProfanityKeywords());
        this.sexualKeywords = normalizeKeywordSet(properties.getSexualKeywords());
    }

    @Override
    public void validate(String nickname) {
        String normalized = normalize(nickname);
        validateForbiddenKeywords(normalized);
        validateMeaninglessJamo(normalized);
    }

    private void validateForbiddenKeywords(String normalized) {
        if (containsAnyKeyword(normalized, profanityKeywords) || containsAnyKeyword(normalized, sexualKeywords)) {
            throw new UserException("사용할 수 없는 닉네임입니다.");
        }
    }

    private void validateMeaninglessJamo(String normalized) {
        if (ONLY_KOREAN_JAMO.matcher(normalized).matches()) {
            throw new UserException("사용할 수 없는 닉네임입니다.");
        }
    }

    private boolean containsAnyKeyword(String normalized, Set<String> keywords) {
        for (String keyword : keywords) {
            if (normalized.contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    private String normalize(String nickname) {
        return nickname.toLowerCase(Locale.ROOT)
                .replaceAll("\\s+", "")
                .replaceAll("[^0-9a-z가-힣ㄱ-ㅎㅏ-ㅣぁ-ゔァ-ヴー々〆〤]+", "");
    }

    private Set<String> normalizeKeywordSet(List<String> keywords) {
        if (keywords == null || keywords.isEmpty()) {
            return Set.of();
        }

        return keywords.stream()
                .filter(value -> value != null && !value.trim().isEmpty())
                .flatMap(value -> Arrays.stream(value.split(",")))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .map(this::normalize)
                .filter(value -> !value.isEmpty())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

}
