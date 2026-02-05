package hello.shiritori.global.utils;

import java.util.Map;

public class JapaneseUtils {

    private static final Map<String, String> SEION_MAP = Map.ofEntries(
            Map.entry("が", "か"), Map.entry("ぎ", "き"), Map.entry("ぐ", "く"), Map.entry("げ", "け"), Map.entry("ご", "こ"),
            Map.entry("ざ", "さ"), Map.entry("じ", "し"), Map.entry("ず", "す"), Map.entry("ぜ", "せ"), Map.entry("ぞ", "そ"),
            Map.entry("だ", "た"), Map.entry("ぢ", "ち"), Map.entry("づ", "つ"), Map.entry("で", "て"), Map.entry("ど", "と"),
            Map.entry("ば", "は"), Map.entry("び", "ひ"), Map.entry("ぶ", "ふ"), Map.entry("べ", "へ"), Map.entry("ぼ", "ほ"),
            Map.entry("ぱ", "は"), Map.entry("ぴ", "ひ"), Map.entry("ぷ", "ふ"), Map.entry("ぺ", "へ"), Map.entry("ぽ", "ほ")
    );

    public static String toKatakana(String input) {
        StringBuilder sb = new StringBuilder();
        for (char c : input.toCharArray()) {
            if (c >= 'ぁ' && c <= 'ゖ') {
                sb.append((char) (c + 0x60));
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }

    public static String toHiragana(String input) {
        StringBuilder sb = new StringBuilder();
        for (char c : input.toCharArray()) {
            if (c >= 'ァ' && c <= 'ヶ') {
                sb.append((char) (c - 0x60));
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }

    public static String normalizeForShiritori(String charStr) {
        if (charStr == null || charStr.isEmpty()) return "";

        String c = toHiragana(charStr);

        c = c.replace("ぁ", "あ").replace("ぃ", "い").replace("ぅ", "う")
                .replace("ぇ", "え").replace("ぉ", "お")
                .replace("っ", "つ")
                .replace("ゃ", "や").replace("ゅ", "ゆ").replace("ょ", "よ")
                .replace("ゎ", "わ");

        c = c.replace("が", "か").replace("ぎ", "き").replace("ぐ", "く").replace("げ", "け").replace("ご", "こ")
                .replace("ざ", "さ").replace("じ", "し").replace("ず", "す").replace("ぜ", "せ").replace("ぞ", "そ")
                .replace("だ", "た").replace("ぢ", "ち").replace("づ", "つ").replace("で", "て").replace("ど", "と")
                .replace("ば", "は").replace("び", "ひ").replace("ぶ", "ふ").replace("べ", "へ").replace("ぼ", "ほ")
                .replace("ぱ", "は").replace("ぴ", "ひ").replace("ぷ", "ふ").replace("ぺ", "へ").replace("ぽ", "ほ");

        return c;
    }

    public static String toSeion(String prevChar) {
        return SEION_MAP.getOrDefault(prevChar, prevChar);
    }

    public static boolean isSmall(String lastChar) {
        return "ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮ".contains(lastChar);
    }

    public static boolean endsWithN(String input) {
        if (input == null || input.isEmpty()) {
            return false;
        }
        char lastChar = input.charAt(input.length() - 1);
        return lastChar == 'ん' || lastChar == 'ン';
    }

}
