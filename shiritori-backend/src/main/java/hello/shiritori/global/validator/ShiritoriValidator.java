package hello.shiritori.global.validator;

import hello.shiritori.entity.Word;
import hello.shiritori.global.utils.JapaneseUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ShiritoriValidator {

    public void validateConnection(Word prevWord, Word currentWord) {
        String prevReading = prevWord.getReading();
        String currentReading = currentWord.getReading();

        String normLast = JapaneseUtils.normalizeForShiritori(prevWord.getEffectiveEndChar());
        String normFirst = JapaneseUtils.normalizeForShiritori(currentWord.getEffectiveStartChar());

        if (normLast.equals(normFirst)) {
            return;
        }

        if (isValidSpecialConnection(prevReading, currentReading)) {
            return;
        }

        throw new WordException("끝말이 이어지지 않습니다! (" + prevReading + " -> " + currentReading + ")");
    }

    private boolean isValidSpecialConnection(String prevReading, String currentReading) {
        String lastChar = prevReading.substring(prevReading.length() - 1); // ゅ
        if (!JapaneseUtils.isSmall(lastChar) || prevReading.length() < 2) {
            return false;
        }

        String prevChar = prevReading.substring(prevReading.length() - 2, prevReading.length() - 1); // じ

        // じゅ -> じゅ
        String combinedSound = prevChar + lastChar;
        if (currentReading.startsWith(combinedSound)) return true;

        // じゅ -> しゅ
        String prevSeion = JapaneseUtils.toSeion(prevChar);
        String combinedSeion = prevSeion + lastChar;
        return currentReading.startsWith(combinedSeion);
    }

}

