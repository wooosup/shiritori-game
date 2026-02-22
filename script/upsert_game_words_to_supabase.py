#!/usr/bin/env python3
import argparse
import csv
import datetime as dt
import json
import os
import time
import urllib.error
import urllib.request


DEFAULT_PROJECT_REF = "ijvpxpgwlzpxxnkdewcl"


def sql_escape(value: str) -> str:
    return value.replace("'", "''")


def quote_or_null(value: str | None) -> str:
    if value is None:
        return "NULL"
    v = value.strip()
    if not v:
        return "NULL"
    return f"'{sql_escape(v)}'"


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


def call_sql_api(project_ref: str, token: str, query: str, retries: int = 5):
    payload = json.dumps({"query": query}).encode("utf-8")
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{project_ref}/database/query",
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "curl/8.7.1",
        },
    )
    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError):
            if attempt == retries:
                raise
            time.sleep(min(2 ** attempt, 10))
    return []


def load_rows(input_csv: str) -> list[dict]:
    by_word: dict[str, dict] = {}
    with open(input_csv, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            word = (row.get("word") or "").strip()
            reading = (row.get("reading") or "").strip()
            meaning = (row.get("meaning") or "").strip()
            level = (row.get("level") or "").strip()
            if not word or not reading:
                continue
            by_word[word] = {
                "word": word,
                "reading": reading,
                "meaning": meaning,
                "level": level if level else None,
                "starts_with": effective_start_char(reading),
                "ends_with": effective_end_char(reading),
            }
    return list(by_word.values())


def build_batch_upsert_sql(batch: list[dict]) -> str:
    values = []
    for row in batch:
        values.append(
            "("
            + quote_or_null(row["word"]) + ","
            + quote_or_null(row["reading"]) + ","
            + quote_or_null(row["meaning"]) + ","
            + quote_or_null(row["level"]) + ","
            + quote_or_null(row["starts_with"]) + ","
            + quote_or_null(row["ends_with"])
            + ")"
        )

    values_sql = ",\n".join(values)
    return f"""
WITH v(word, reading, meaning, level, starts_with, ends_with) AS (
    VALUES
    {values_sql}
),
updated AS (
    UPDATE public.game_words gw
    SET
        reading = v.reading,
        meaning = v.meaning,
        level = v.level,
        starts_with = v.starts_with,
        ends_with = v.ends_with
    FROM v
    WHERE gw.word = v.word
    RETURNING gw.word
),
inserted AS (
    INSERT INTO public.game_words (word, reading, meaning, level, starts_with, ends_with)
    SELECT v.word, v.reading, v.meaning, v.level, v.starts_with, v.ends_with
    FROM v
    WHERE NOT EXISTS (
        SELECT 1 FROM public.game_words g WHERE g.word = v.word
    )
    RETURNING word
)
SELECT
    (SELECT COUNT(*) FROM updated) AS updated_count,
    (SELECT COUNT(*) FROM inserted) AS inserted_count;
"""


def backup_table(project_ref: str, token: str, backup_path: str) -> int:
    query = """
SELECT id, word, reading, meaning, level, starts_with, ends_with
FROM public.game_words
ORDER BY id;
"""
    rows = call_sql_api(project_ref, token, query)
    os.makedirs(os.path.dirname(backup_path), exist_ok=True)
    with open(backup_path, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)
    return len(rows)


def count_rows(project_ref: str, token: str) -> int:
    rows = call_sql_api(project_ref, token, "SELECT COUNT(*)::int AS cnt FROM public.game_words;")
    if not rows:
        return 0
    return int(rows[0]["cnt"])


def main() -> None:
    parser = argparse.ArgumentParser(description="Upsert game_words into Supabase from translated CSV.")
    parser.add_argument("--input", default="script/jmdict_for_translation_ko.csv")
    parser.add_argument("--project-ref", default=DEFAULT_PROJECT_REF)
    parser.add_argument("--batch-size", type=int, default=150)
    parser.add_argument("--skip-backup", action="store_true")
    args = parser.parse_args()

    token = os.environ.get("SUPABASE_ACCESS_TOKEN", "").strip()
    if not token:
        raise SystemExit("SUPABASE_ACCESS_TOKEN is not set.")

    rows = load_rows(args.input)
    print(f"Input rows (deduped by word): {len(rows)}")

    before_count = count_rows(args.project_ref, token)
    print(f"DB rows before: {before_count}")

    if not args.skip_backup:
        now = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
        backup_path = f"script/backups/game_words_before_upsert_{now}.json"
        backup_count = backup_table(args.project_ref, token, backup_path)
        print(f"Backup rows: {backup_count}")
        print(f"Backup file: {backup_path}")

    total_updated = 0
    total_inserted = 0
    total = len(rows)

    for i in range(0, total, args.batch_size):
        batch = rows[i : i + args.batch_size]
        sql = build_batch_upsert_sql(batch)
        result = call_sql_api(args.project_ref, token, sql)
        updated = int(result[0]["updated_count"])
        inserted = int(result[0]["inserted_count"])
        total_updated += updated
        total_inserted += inserted
        print(
            f"Processed {min(i + args.batch_size, total)}/{total} "
            f"(updated={updated}, inserted={inserted})"
        )

    after_count = count_rows(args.project_ref, token)
    print(f"DB rows after: {after_count}")
    print(f"Total updated: {total_updated}")
    print(f"Total inserted: {total_inserted}")
    print(f"Net row increase: {after_count - before_count}")


if __name__ == "__main__":
    main()
