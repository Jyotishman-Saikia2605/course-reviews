"""
Merge BSW + HSS HU review spreadsheets into public/data/reviews.json.
PII columns (Name, Entry Number) are never written to output.
"""
from __future__ import annotations

import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
PUBLIC_DATA = ROOT / "public" / "data"
OFFERINGS_PATH = DATA / "offerings.json"
BSW_PATH = DATA / "BSW-HUL-Course-Feedback-Responses.xlsx"
HSS_PATH = DATA / "HSS-Courses-Review-Responses.xlsx"

SNIPPET_MAX = 520


def norm_professor(s: str | float | None) -> tuple[str, str]:
    """Return (key, display) for grouping and UI."""
    if s is None or (isinstance(s, float) and pd.isna(s)):
        return ("unknown", "Unknown")
    t = str(s).strip()
    if not t:
        return ("unknown", "Unknown")
    t = unicodedata.normalize("NFKC", t)
    t = re.sub(r"\s+", " ", t)
    key = re.sub(r"[^\w\s,.&-]", "", t.lower()).strip()
    key = re.sub(r"\s+", " ", key)
    if not key:
        key = "unknown"
    display = t.strip()
    return (key, display)


def parse_course_code(raw) -> str | None:
    if raw is None or (isinstance(raw, float) and pd.isna(raw)):
        return None
    s = unicodedata.normalize("NFKC", str(raw).strip().upper())
    compact = re.sub(r"\s+", "", s)
    m = re.search(r"(HUL|HSL)(\d+)", compact, re.I)
    if m:
        return f"{m.group(1).upper()}{m.group(2)}"
    digits = re.sub(r"\D", "", compact)
    if len(digits) == 3 and digits.isdigit():
        return "HUL" + digits
    return None


def to_float(v):
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    n = pd.to_numeric(v, errors="coerce")
    if pd.isna(n):
        return None
    return float(n)


def clip_rating(x: float | None, lo: float = 1.0, hi: float = 5.0) -> float | None:
    if x is None:
        return None
    if x < lo or x > hi:
        return None
    return x


def build_snippet_for_rows(rows: list[dict]) -> str:
    """Newest first: use first row with any text/numeric summary."""
    if not rows:
        return ""
    sorted_rows = sorted(
        rows,
        key=lambda r: (
            r.get("_ts") or datetime.min.replace(tzinfo=timezone.utc),
            r.get("_ord", 0),
        ),
        reverse=True,
    )
    r = sorted_rows[0]
    parts: list[str] = []
    labels = r.get("labels") or {}
    for k, label in [
        ("content_rating", "Content (rating)"),
        ("workload", "Workload"),
        ("grading", "Grading"),
        ("attendance_lenient", "Attendance leniency"),
        ("overall_experience", "Overall"),
        ("evaluations_hardness", "Eval hardness"),
    ]:
        v = labels.get(k)
        if v is not None:
            parts.append(f"{label}: {v}/5")
    for tb in r.get("textBlocks") or []:
        val = (tb.get("value") or "").strip()
        if val:
            parts.append(val)
    body = " ".join(parts)
    body = re.sub(r"\s+", " ", body).strip()
    if len(body) <= SNIPPET_MAX:
        return body
    return body[: SNIPPET_MAX - 1].rstrip() + "…"


def mean_numeric(rows: list[dict], keys: list[str]) -> dict[str, float]:
    out: dict[str, float] = {}
    for k in keys:
        vals = []
        for r in rows:
            v = (r.get("labels") or {}).get(k)
            if v is not None:
                vals.append(float(v))
        if vals:
            out[k] = round(sum(vals) / len(vals), 2)
    return out


def load_bsw() -> pd.DataFrame:
    df = pd.read_excel(BSW_PATH, sheet_name=0)
    df["_source"] = "bsw"
    df["_ord"] = range(len(df))
    return df


def load_hss() -> pd.DataFrame:
    df = pd.read_excel(HSS_PATH, sheet_name=0)
    df["_source"] = "hss"
    df["_ord"] = range(len(df))
    return df


def row_to_review_bsw(row) -> dict | None:
    code = parse_course_code(row.get("HUL Course Code (only fill the 3 Digit Code)"))
    if not code:
        return None
    pk, pdisp = norm_professor(row.get("Course coordinator"))
    ts = row.get("Timestamp")
    if pd.isna(ts):
        ts_parsed = None
    else:
        ts_parsed = pd.Timestamp(ts).to_pydatetime()
        if ts_parsed.tzinfo is None:
            ts_parsed = ts_parsed.replace(tzinfo=timezone.utc)

    labels = {}
    cr = clip_rating(to_float(row.get("Course Content")))
    if cr is not None:
        labels["content_rating"] = cr
    wl = clip_rating(to_float(row.get("Workload\n(1- Very Tough\n5-Easy)")))
    if wl is not None:
        labels["workload"] = wl
    gr = clip_rating(to_float(row.get("Grading")))
    if gr is not None:
        labels["grading"] = gr
    att = clip_rating(
        to_float(row.get("Attendance Policy \n(1-Very Strict \n5- Very Lenient)"))
    )
    if att is not None:
        labels["attendance_lenient"] = att
    ov = clip_rating(to_float(row.get("Overall Experience")))
    if ov is not None:
        labels["overall_experience"] = ov

    comments = row.get("Any Comments")
    text_blocks = []
    if comments is not None and str(comments).strip() and not (
        isinstance(comments, float) and pd.isna(comments)
    ):
        text_blocks.append({"label": "Comments", "value": str(comments).strip()})

    return {
        "source": "bsw",
        "courseCode": code,
        "professor": pdisp,
        "professorKey": pk,
        "timestamp": ts_parsed.isoformat() if ts_parsed else None,
        "_ts": ts_parsed,
        "_ord": int(row.get("_ord", 0)),
        "labels": labels,
        "textBlocks": text_blocks,
    }


def row_to_review_hss(row) -> dict | None:
    code = parse_course_code(row.get("Course Code"))
    if not code:
        return None
    pk, pdisp = norm_professor(row.get("Course Coordinator"))
    ts = row.get("Timestamp")
    if pd.isna(ts):
        ts_parsed = None
    else:
        ts_parsed = pd.Timestamp(ts).to_pydatetime()
        if ts_parsed.tzinfo is None:
            ts_parsed = ts_parsed.replace(tzinfo=timezone.utc)

    labels = {}
    wl = clip_rating(to_float(row.get("Course Workload and Effort Required")))
    if wl is not None:
        labels["workload"] = wl
    eh = clip_rating(to_float(row.get("Evaluations Hardness")))
    if eh is not None:
        labels["evaluations_hardness"] = eh

    text_blocks = []
    pairs = [
        ("Offering Session", row.get("Offering Session")),
        ("Evaluations used", row.get("Evaluations Used")),
        ("Course content", row.get("Course Content")),
        ("Content sharing", row.get("Content Sharing")),
        ("Grading", row.get("Grading")),
        ("Tutorials", row.get("Tutorials")),
        ("Attendance policy", row.get("Attendance Policy")),
        ("Overall", row.get("Overall Opinions?")),
    ]
    for label, val in pairs:
        if val is None or (isinstance(val, float) and pd.isna(val)):
            continue
        s = str(val).strip()
        if s:
            text_blocks.append({"label": label, "value": s})

    return {
        "source": "hss",
        "courseCode": code,
        "professor": pdisp,
        "professorKey": pk,
        "timestamp": ts_parsed.isoformat() if ts_parsed else None,
        "_ts": ts_parsed,
        "_ord": int(row.get("_ord", 0)),
        "labels": labels,
        "textBlocks": text_blocks,
    }


def strip_internal(reviews: list[dict]) -> list[dict]:
    clean = []
    for r in reviews:
        c = {k: v for k, v in r.items() if not k.startswith("_")}
        clean.append(c)
    return clean


def main():
    offerings = json.loads(OFFERINGS_PATH.read_text(encoding="utf-8"))
    allowed = {o["code"] for o in offerings}

    raw_reviews: list[dict] = []
    dropped = 0
    for _, row in load_bsw().iterrows():
        rev = row_to_review_bsw(row)
        if rev is None:
            dropped += 1
            continue
        if rev["courseCode"] not in allowed:
            dropped += 1
            continue
        raw_reviews.append(rev)

    for _, row in load_hss().iterrows():
        rev = row_to_review_hss(row)
        if rev is None:
            dropped += 1
            continue
        if rev["courseCode"] not in allowed:
            dropped += 1
            continue
        raw_reviews.append(rev)

    numeric_keys = [
        "content_rating",
        "workload",
        "grading",
        "attendance_lenient",
        "overall_experience",
        "evaluations_hardness",
    ]

    by_course: dict[str, list[dict]] = {}
    for r in raw_reviews:
        by_course.setdefault(r["courseCode"], []).append(r)

    courses_out = []
    for off in offerings:
        code = off["code"]
        rows = by_course.get(code, [])
        reviews_public = strip_internal(rows)

        overall_avg = mean_numeric(rows, numeric_keys)
        overall_snip = build_snippet_for_rows(rows)

        prof_map: dict[str, list[dict]] = {}
        for r in rows:
            prof_map.setdefault(r["professorKey"], []).append(r)

        by_prof = []
        for pk, prows in prof_map.items():
            display = prows[0]["professor"]
            by_prof.append(
                {
                    "professorKey": pk,
                    "professor": display,
                    "n": len(prows),
                    "averages": mean_numeric(prows, numeric_keys),
                    "snippet": build_snippet_for_rows(prows),
                }
            )
        by_prof.sort(key=lambda x: (-x["n"], x["professor"].lower()))

        courses_out.append(
            {
                **off,
                "reviewCount": len(rows),
                "overall": {
                    "n": len(rows),
                    "averages": overall_avg,
                    "snippet": overall_snip,
                },
                "byProfessor": by_prof,
                "reviews": reviews_public,
            }
        )

    PUBLIC_DATA.mkdir(parents=True, exist_ok=True)
    out = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "droppedOrSkippedRowsApprox": dropped,
        "numericLegend": {
            "content_rating": "Course content (1–5, higher is better where applicable)",
            "workload": "Workload (1 very tough, 5 easy) — BSW scale",
            "grading": "Grading leniency (1–5) — BSW only",
            "attendance_lenient": "Attendance (1 very strict, 5 very lenient) — BSW only",
            "overall_experience": "Overall experience (1–5) — BSW only",
            "evaluations_hardness": "Evaluation hardness (1–5) — HSS only",
        },
        "courses": courses_out,
    }
    out_path = PUBLIC_DATA / "reviews.json"
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {out_path} with {len(raw_reviews)} reviews across {len(offerings)} courses.")
    print(f"Approx. rows skipped (no code / not in offerings): {dropped}")


if __name__ == "__main__":
    main()
