#!/usr/bin/env python3
import argparse
import csv
import json
import os
import re
import urllib.request
import xml.etree.ElementTree as ET


KANA_READING_PATTERN = re.compile(r"^[ぁ-ゖゔー]+$")
WORD_PATTERN = re.compile(r"^[ぁ-ゖァ-ヺー々〆ヵヶ一-龯㐀-䶿]+$")


DISALLOWED_POS_KEYWORDS = [
    "numeric",
    "counter",
    "pronoun",
    "used as a suffix",
    "used as a prefix",
    "suffix",
    "prefix",
]

DISALLOWED_MISC_KEYWORDS = [
    "organization name",
    "company name",
    "work of art",
    "product name",
    "full name of a particular person",
    "family or surname",
    "place name",
    "deity",
    "character",
    "archaic",
    "historical term",
    "obsolete term",
    "dated term",
    "rare term",
]

COMMON_PRIORITY_PREFIXES = ("news", "ichi", "spec", "gai", "nf")


def to_hiragana(text: str) -> str:
    out = []
    for ch in text:
        code = ord(ch)
        if 0x30A1 <= code <= 0x30F6:  # Katakana -> Hiragana
            out.append(chr(code - 0x60))
        else:
            out.append(ch)
    return "".join(out)


def normalize_for_shiritori(char_str: str) -> str:
    if not char_str:
        return ""

    c = to_hiragana(char_str)
    c = (
        c.replace("ぁ", "あ")
        .replace("ぃ", "い")
        .replace("ぅ", "う")
        .replace("ぇ", "え")
        .replace("ぉ", "お")
        .replace("っ", "つ")
        .replace("ゃ", "や")
        .replace("ゅ", "ゆ")
        .replace("ょ", "よ")
        .replace("ゎ", "わ")
    )
    c = (
        c.replace("が", "か")
        .replace("ぎ", "き")
        .replace("ぐ", "く")
        .replace("げ", "け")
        .replace("ご", "こ")
        .replace("ざ", "さ")
        .replace("じ", "し")
        .replace("ず", "す")
        .replace("ぜ", "せ")
        .replace("ぞ", "そ")
        .replace("だ", "た")
        .replace("ぢ", "ち")
        .replace("づ", "つ")
        .replace("で", "て")
        .replace("ど", "と")
        .replace("ば", "は")
        .replace("び", "ひ")
        .replace("ぶ", "ふ")
        .replace("べ", "へ")
        .replace("ぼ", "ほ")
        .replace("ぱ", "は")
        .replace("ぴ", "ひ")
        .replace("ぷ", "ふ")
        .replace("ぺ", "へ")
        .replace("ぽ", "ほ")
    )
    return c


def effective_start_char(reading: str) -> str:
    if not reading:
        return ""
    if reading[0] == "ー" and len(reading) > 1:
        return reading[1]
    return reading[0]


def effective_end_char(reading: str) -> str:
    if not reading:
        return ""
    if reading[-1] == "ー" and len(reading) > 1:
        return reading[-2]
    return reading[-1]


def normalize_list(nodes) -> list[str]:
    values = []
    for node in nodes:
        text = (node.text or "").strip()
        if text:
            values.append(text)
    return values


def has_noun_pos(pos_values: list[str]) -> bool:
    lowered = [p.lower() for p in pos_values]
    return any("noun" in p for p in lowered)


def disallowed_pos(pos_values: list[str]) -> bool:
    lowered = [p.lower() for p in pos_values]
    return any(any(keyword in p for keyword in DISALLOWED_POS_KEYWORDS) for p in lowered)


def disallowed_misc(misc_values: list[str]) -> bool:
    lowered = [m.lower() for m in misc_values]
    return any(any(keyword in m for keyword in DISALLOWED_MISC_KEYWORDS) for m in lowered)


def pick_expression(entry: ET.Element) -> str:
    kebs = normalize_list(entry.findall("k_ele/keb"))
    if kebs:
        return kebs[0]
    rebs = normalize_list(entry.findall("r_ele/reb"))
    return rebs[0] if rebs else ""


def pick_reading(entry: ET.Element) -> str:
    rebs = normalize_list(entry.findall("r_ele/reb"))
    if not rebs:
        return ""
    return to_hiragana(rebs[0])


def collect_priority_tags(entry: ET.Element) -> list[str]:
    tags = []
    for node in entry.findall("k_ele/ke_pri"):
        text = (node.text or "").strip()
        if text:
            tags.append(text)
    for node in entry.findall("r_ele/re_pri"):
        text = (node.text or "").strip()
        if text:
            tags.append(text)
    return tags


def is_common_entry(priority_tags: list[str]) -> bool:
    if not priority_tags:
        return False
    lowered = [tag.lower() for tag in priority_tags]
    return any(tag.startswith(COMMON_PRIORITY_PREFIXES) for tag in lowered)


def pick_meaning_en(entry: ET.Element) -> str:
    current_pos = []
    for sense in entry.findall("sense"):
        sense_pos = normalize_list(sense.findall("pos"))
        if sense_pos:
            current_pos = sense_pos

        if not current_pos:
            continue
        if not has_noun_pos(current_pos) or disallowed_pos(current_pos):
            continue

        misc_values = normalize_list(sense.findall("misc"))
        field_values = normalize_list(sense.findall("field"))
        if disallowed_misc(misc_values):
            continue
        if field_values:
            continue

        glosses = []
        for g in sense.findall("gloss"):
            lang = (g.attrib.get("{http://www.w3.org/XML/1998/namespace}lang") or "eng").lower()
            if lang != "eng":
                continue
            text = (g.text or "").strip()
            if text:
                glosses.append(text)

        if glosses:
            unique = list(dict.fromkeys(glosses))
            return " / ".join(unique[:3])
    return ""


def is_valid_for_game(expression: str, reading: str) -> bool:
    if not expression or not reading:
        return False
    if len(expression) <= 1:
        return False
    if len(expression) > 6:
        return False
    if len(reading) > 8:
        return False
    if not WORD_PATTERN.fullmatch(expression):
        return False
    if not KANA_READING_PATTERN.fullmatch(reading):
        return False
    if normalize_for_shiritori(effective_start_char(reading)) == "":
        return False
    if normalize_for_shiritori(effective_end_char(reading)) == "":
        return False
    return True


def fetch_existing_words_from_supabase(project_ref: str, access_token: str) -> set[str]:
    sql = "select word from public.game_words;"
    payload = json.dumps({"query": sql}).encode("utf-8")
    url = f"https://api.supabase.com/v1/projects/{project_ref}/database/query"
    req = urllib.request.Request(
        url,
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "curl/8.7.1",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    words = set()
    for row in data:
        word = (row.get("word") or "").strip()
        if word:
            words.add(word)
    return words


def build_csv(
    input_xml: str,
    output_csv: str,
    with_header: bool,
    max_rows: int,
    exclude_existing_words: set[str] | None = None,
) -> dict[str, int]:
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)

    stats = {
        "entries": 0,
        "written": 0,
        "skipped_invalid": 0,
        "skipped_no_meaning": 0,
        "skipped_duplicate_word": 0,
        "skipped_existing_db": 0,
    }
    seen_words = set()

    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if with_header:
            writer.writerow(["word", "reading", "meaning", "level"])

        for _, entry in ET.iterparse(input_xml, events=("end",)):
            if entry.tag != "entry":
                continue
            stats["entries"] += 1

            word = pick_expression(entry)
            reading = pick_reading(entry)
            if not is_valid_for_game(word, reading):
                stats["skipped_invalid"] += 1
                entry.clear()
                continue

            if not is_common_entry(collect_priority_tags(entry)):
                stats["skipped_invalid"] += 1
                entry.clear()
                continue

            if word in seen_words:
                stats["skipped_duplicate_word"] += 1
                entry.clear()
                continue

            if exclude_existing_words is not None and word in exclude_existing_words:
                stats["skipped_existing_db"] += 1
                entry.clear()
                continue

            meaning = pick_meaning_en(entry)
            if not meaning:
                stats["skipped_no_meaning"] += 1
                entry.clear()
                continue

            # Backend CSV format: word, reading, meaning, level (level is nullable)
            writer.writerow([word, reading, meaning, ""])
            seen_words.add(word)
            stats["written"] += 1

            entry.clear()
            if max_rows > 0 and stats["written"] >= max_rows:
                break

    return stats


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Shiritori-ready CSV from JMdict XML.")
    parser.add_argument("--input", default="script/JMdict_e.xml")
    parser.add_argument("--output", default="shiritori-backend/src/main/resources/data/output.csv")
    parser.add_argument("--with-header", action="store_true")
    parser.add_argument("--max-rows", type=int, default=0, help="0 means no limit")
    parser.add_argument(
        "--exclude-existing-db",
        action="store_true",
        help="Exclude words that already exist in Supabase public.game_words table.",
    )
    parser.add_argument(
        "--supabase-project-ref",
        default=os.environ.get("SUPABASE_PROJECT_REF", "ijvpxpgwlzpxxnkdewcl"),
        help="Supabase project ref for existing-word lookup.",
    )
    args = parser.parse_args()

    exclude_existing_words = None
    if args.exclude_existing_db:
        token = os.environ.get("SUPABASE_ACCESS_TOKEN", "").strip()
        if not token:
            raise SystemExit("SUPABASE_ACCESS_TOKEN is not set.")
        exclude_existing_words = fetch_existing_words_from_supabase(args.supabase_project_ref, token)
        print(f"Fetched existing DB words: {len(exclude_existing_words)}")

    stats = build_csv(
        args.input,
        args.output,
        args.with_header,
        args.max_rows,
        exclude_existing_words=exclude_existing_words,
    )
    print(f"Input: {args.input}")
    print(f"Output: {args.output}")
    print(f"Entries parsed: {stats['entries']}")
    print(f"Rows written: {stats['written']}")
    print(f"Skipped invalid: {stats['skipped_invalid']}")
    print(f"Skipped no meaning: {stats['skipped_no_meaning']}")
    print(f"Skipped duplicate word: {stats['skipped_duplicate_word']}")
    print(f"Skipped existing DB: {stats['skipped_existing_db']}")


if __name__ == "__main__":
    main()
