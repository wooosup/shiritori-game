#!/usr/bin/env python3
import argparse
import csv
import json
import os
import time
import urllib.error
import urllib.request


OPENAI_URL = "https://api.openai.com/v1/chat/completions"


def pick_representative_gloss(meaning_en: str) -> str:
    parts = [part.strip() for part in meaning_en.split(" / ") if part.strip()]
    if not parts:
        return meaning_en.strip()
    return parts[0]


def load_cache(path: str) -> dict[str, str]:
    cache = {}
    if not os.path.exists(path):
        return cache
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            en = (obj.get("meaning_en") or "").strip()
            ko = (obj.get("meaning_ko") or "").strip()
            if en and ko:
                cache[en] = ko
    return cache


def append_cache(path: str, meaning_en: str, meaning_ko: str) -> None:
    with open(path, "a", encoding="utf-8") as f:
        f.write(
            json.dumps(
                {"meaning_en": meaning_en, "meaning_ko": meaning_ko},
                ensure_ascii=False,
            )
            + "\n"
        )


def call_openai_batch(
    api_key: str,
    model: str,
    items: list[dict],
    retries: int = 5,
) -> dict[int, str]:
    system_prompt = (
        "You translate one representative English dictionary gloss into one short Korean meaning for a word game.\n"
        "Rules:\n"
        "1) Keep each output concise (ideally 1 short phrase).\n"
        "2) Use natural Korean dictionary style.\n"
        "3) Translate only the given representative gloss.\n"
        "4) Avoid explanation, only translated meaning.\n"
        "Return JSON only: {\"items\":[{\"id\":number,\"meaning_ko\":string}]}."
    )
    payload = {
        "model": model,
        "temperature": 0,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps({"items": items}, ensure_ascii=False)},
        ],
    }
    data = json.dumps(payload).encode("utf-8")

    for attempt in range(1, retries + 1):
        req = urllib.request.Request(
            OPENAI_URL,
            data=data,
            method="POST",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                body = json.loads(resp.read().decode("utf-8"))

            content = body["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            out = {}
            for item in parsed.get("items", []):
                idx = item.get("id")
                if isinstance(idx, str) and idx.isdigit():
                    idx = int(idx)
                ko = (item.get("meaning_ko") or "").strip()
                if isinstance(idx, int) and ko:
                    out[idx] = ko
            return out
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, KeyError, json.JSONDecodeError):
            if attempt == retries:
                raise
            time.sleep(min(2 ** attempt, 10))
    return {}


def load_rows(path: str) -> list[dict]:
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            word = (row.get("word") or "").strip()
            reading = (row.get("reading") or "").strip()
            meaning = (row.get("meaning") or "").strip()
            level = (row.get("level") or "").strip()
            if not word or not reading or not meaning:
                continue
            rows.append(
                {
                    "word": word,
                    "reading": reading,
                    "meaning_en": meaning,
                    "meaning_en_repr": pick_representative_gloss(meaning),
                    "level": level,
                }
            )
    return rows


def write_rows(path: str, rows: list[dict], cache: dict[str, str]) -> tuple[int, int]:
    written = 0
    fallback = 0
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["word", "reading", "meaning", "level"])
        for row in rows:
            en_repr = row["meaning_en_repr"]
            ko = cache.get(en_repr, "").strip()
            if not ko:
                ko = en_repr
                fallback += 1
            writer.writerow([row["word"], row["reading"], ko, row["level"]])
            written += 1
    return written, fallback


def estimate_tokens(meanings: list[str]) -> int:
    # Rough approximation to prevent accidental cost surprises.
    # English chars + JSON envelope overhead ~= 4 chars/token.
    chars = sum(len(m) for m in meanings) + len(meanings) * 16
    return max(1, chars // 4)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Translate CSV meaning column (EN->KO) with OpenAI, preserving backend CSV schema."
    )
    parser.add_argument("--input", default="script/jmdict_for_translation.csv")
    parser.add_argument("--output", default="script/jmdict_for_translation_ko.csv")
    parser.add_argument("--cache", default="script/meaning_en_to_ko_cache.jsonl")
    parser.add_argument("--model", default="gpt-4.1-mini")
    parser.add_argument("--batch-size", type=int, default=50)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show translation volume/cost estimate only; do not call OpenAI.",
    )
    parser.add_argument(
        "--max-new-translations",
        type=int,
        default=0,
        help="Cap new uncached meanings translated in this run. 0 means no cap.",
    )
    args = parser.parse_args()

    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise SystemExit("OPENAI_API_KEY is not set.")

    rows = load_rows(args.input)
    cache = load_cache(args.cache)
    unique_en = list(dict.fromkeys(row["meaning_en_repr"] for row in rows))
    unresolved = [en for en in unique_en if en not in cache]
    target_unresolved = unresolved
    if args.max_new_translations > 0:
        target_unresolved = unresolved[: args.max_new_translations]

    print(f"Rows loaded: {len(rows)}")
    print(f"Unique meanings: {len(unique_en)}")
    print(f"Cached meanings: {len(unique_en) - len(unresolved)}")
    print(f"Need translation: {len(unresolved)}")
    if args.max_new_translations > 0:
        print(f"Translate this run: {len(target_unresolved)} (capped)")
    else:
        print(f"Translate this run: {len(target_unresolved)}")
    print(f"Estimated input tokens (rough): {estimate_tokens(target_unresolved)}")

    if args.dry_run:
        return

    translated_count = 0
    failed_count = 0

    for i in range(0, len(target_unresolved), args.batch_size):
        batch = target_unresolved[i : i + args.batch_size]
        items = [{"id": idx, "meaning_en": en} for idx, en in enumerate(batch)]
        translated = call_openai_batch(api_key, args.model, items)
        for idx, meaning_en_repr in enumerate(batch):
            meaning_ko = translated.get(idx, "").strip()
            if meaning_ko:
                cache[meaning_en_repr] = meaning_ko
                append_cache(args.cache, meaning_en_repr, meaning_ko)
                translated_count += 1
            else:
                # Keep unresolved for future retries; don't poison cache with English fallback.
                failed_count += 1
        print(f"Translated {min(i + args.batch_size, len(target_unresolved))}/{len(target_unresolved)}")

    written, fallback = write_rows(args.output, rows, cache)
    print(f"Output rows: {written}")
    print(f"Fallback rows (EN kept): {fallback}")
    print(f"Newly cached translations: {translated_count}")
    print(f"Missed translations this run: {failed_count}")
    print(f"Output file: {args.output}")


if __name__ == "__main__":
    main()
