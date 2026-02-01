export const JapaneseUtils = {
    // 1. 작은 글자(요음/촉음)를 큰 글자로 변환
    toBigKana: (char: string): string => {
        const smallMap: Record<string, string> = {
            'ぁ': 'あ', 'ぃ': 'い', 'ぅ': 'う', 'ぇ': 'え', 'ぉ': 'お',
            'っ': 'つ',
            'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ',
            'ゎ': 'わ',
            // 카타카나
            'ァ': 'ア', 'ィ': 'イ', 'ゥ': 'ウ', 'ェ': 'エ', 'ォ': 'オ',
            'ッ': 'ツ',
            'ャ': 'ヤ', 'ュ': 'ユ', 'ョ': 'ヨ',
            'ヮ': 'ワ', 'ヵ': 'カ', 'ヶ': 'ケ'
        };
        return smallMap[char] || char;
    },

    // 2. 탁음/반탁음을 청음으로 변환 (탁음 무시 규칙용)
    toSeion: (char: string): string => {
        const dakuonMap: Record<string, string> = {
            'が': 'か', 'ぎ': 'き', 'ぐ': 'く', 'げ': 'け', 'ご': 'こ',
            'ざ': 'さ', 'じ': 'し', 'ず': 'す', 'ぜ': 'せ', 'ぞ': 'そ',
            'だ': 'た', 'ぢ': 'ち', 'づ': 'つ', 'で': 'て', 'ど': 'と',
            'ば': 'は', 'び': 'ひ', 'ぶ': 'ふ', 'べ': 'へ', 'ぼ': 'ほ',
            'ぱ': 'は', 'ぴ': 'ひ', 'ぷ': 'ふ', 'ぺ': 'へ', 'ぽ': 'ほ',
            // 카타카나
            'ガ': 'カ', 'ギ': 'キ', 'グ': 'ク', 'ゲ': 'ケ', 'ゴ': 'コ',
            'ザ': 'サ', 'ジ': 'シ', 'ズ': 'ス', 'ゼ': 'セ', 'ゾ': 'ソ',
            'ダ': 'タ', 'ヂ': 'チ', 'ヅ': 'ツ', 'デ': 'テ', 'ド': 'ト',
            'バ': 'ハ', 'ビ': 'ヒ', 'ブ': 'フ', 'ベ': 'ヘ', 'ボ': 'ホ',
            'パ': 'ハ', 'ピ': 'ヒ', 'プ': 'フ', 'ペ': 'ヘ', 'ポ': 'ホ'
        };
        return dakuonMap[char] || char;
    },

    // 3. 비교를 위한 최종 정규화 (히라가나화 + 대문자화 + 청음화)
    normalizeForCheck: (char: string): string => {
        let c = char.normalize('NFC');
        if (c >= 'ァ' && c <= 'ヶ') {
            c = String.fromCodePoint(c.charCodeAt(0) - 0x60);
        }
        // 3) 작은 글자 -> 큰 글자
        c = JapaneseUtils.toBigKana(c);
        // 4) 탁음 -> 청음
        c = JapaneseUtils.toSeion(c);

        return c;
    },

    isSmallKana: (char: string): boolean => {
        return 'ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ'.includes(char);
    }

};