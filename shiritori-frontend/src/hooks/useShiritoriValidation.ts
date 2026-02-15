import { useCallback } from 'react';
import { JapaneseUtils } from '../utils/japanese';

export interface ShiritoriHistoryItem {
    sender: 'AI' | 'USER';
    word?: string;
    reading?: string;
}

export function useShiritoriValidation(history: ShiritoriHistoryItem[]) {
    const validateWord = useCallback((word: string): string | null => {
        if (history.length === 0) {
            return '⏳ 게임 준비 중...';
        }

        let cleanInput = word.trim().normalize('NFC');
        cleanInput = cleanInput.replaceAll(
            /[\u30a1-\u30f6]/g,
            (match) => String.fromCodePoint(match.charCodeAt(0) - 0x60)
        );

        const isDuplicate = history.some((msg) => msg.word?.normalize('NFC') === cleanInput);
        if (isDuplicate) {
            return '이미 입력한 단어입니다.';
        }

        const isKanaOnly = /^[ぁ-んァ-ンー]+$/.test(cleanInput);
        if (!isKanaOnly) {
            return null;
        }

        const lastMessage = history.at(-1);
        if (lastMessage?.sender !== 'AI' || !lastMessage.word) {
            return null;
        }

        const targetText = lastMessage.reading || lastMessage.word;
        const lastChar = targetText.slice(-1);
        const prevChar = targetText.slice(-2, -1);
        const firstChar = cleanInput.charAt(0);
        let isValid = false;
        let expectedStart = '';

        if (JapaneseUtils.isSmallKana(lastChar) && prevChar) {
            const combinedSound = prevChar + lastChar;
            const prevSeion = JapaneseUtils.toSeion(prevChar);
            const combinedSeion = prevSeion + lastChar;
            const bigKana = JapaneseUtils.toBigKana(lastChar);
            const normBig = JapaneseUtils.normalizeForCheck(bigKana);
            const normFirst = JapaneseUtils.normalizeForCheck(firstChar);

            if (
                cleanInput.startsWith(combinedSound) ||
                cleanInput.startsWith(combinedSeion) ||
                normBig === normFirst
            ) {
                isValid = true;
            } else {
                expectedStart = `${bigKana} 또는 ${combinedSeion}`;
            }
        } else {
            const normLast = JapaneseUtils.normalizeForCheck(lastChar);
            const normFirst = JapaneseUtils.normalizeForCheck(firstChar);
            if (normLast === normFirst) {
                isValid = true;
            } else {
                expectedStart = JapaneseUtils.toBigKana(JapaneseUtils.toSeion(lastChar));
            }
        }

        if (!isValid) {
            return `'${expectedStart}'(으)로 시작해야 합니다.`;
        }

        return null;
    }, [history]);

    return { validateWord };
}
