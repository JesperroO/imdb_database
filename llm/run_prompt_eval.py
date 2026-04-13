import argparse
import json
import time
from collections import Counter
from pathlib import Path

try:
    from llm.llm_service import LLMQueryService, LLMServiceError, SQLValidationError
except ModuleNotFoundError:
    # Allow direct execution via: python3 llm/run_prompt_eval.py
    from llm_service import LLMQueryService, LLMServiceError, SQLValidationError


BASE_DIR = Path(__file__).resolve().parent


CASE_SQL_HEURISTICS = {
    1: ["order by", "imdb_rating", "limit 5"],
    2: ["join", "genre", "drama", "imdb_rating", "> 8.5"],
    3: ["director", "christopher nolan", "order by", "imdb_rating"],
    4: ["count", "group by", "genre"],
    5: ["actor", "count", "group by", "order by"],
    6: ["avg", "imdb_rating", "group by", "genre", "year > 2010"],
    7: ["sci", "year", "order by", "votes"],
    8: ["gross", "director", "order by", "desc", "limit 10"],
    9: ["drama", "order by", "imdb_rating", "limit 5"],
    10: ["sci", "order by", "imdb_rating"],
    11: ["select", "from movie"],
    12: ["select", "from movie", "limit"],
}


def heuristic_correct(case_id: int, sql: str) -> bool:
    if not sql:
        return False

    lowered = sql.lower()
    must_have = CASE_SQL_HEURISTICS.get(case_id, [])

    for token in must_have:
        if token not in lowered:
            return False

    if case_id == 10 and "inception" not in lowered:
        return False

    if case_id in (11, 12):
        forbidden = ["drop", "delete", "update", "insert", "alter", "truncate", "create"]
        if any(f in lowered for f in forbidden):
            return False

    return True


def load_eval_cases(eval_file: Path):
    with eval_file.open("r", encoding="utf-8") as f:
        return json.load(f)


def is_rate_limit_error(err: Exception) -> bool:
    text = str(err).lower()
    return "429" in text and "rate limit" in text


def evaluate(
    service: LLMQueryService,
    cases,
    strategy: str,
    case_delay_sec: float,
    max_case_retries: int,
    rate_limit_wait_sec: float,
):
    records = []
    for idx, case in enumerate(cases):
        task = case.get("task", "NL2SQL")
        query = case["query"]
        started = time.perf_counter()
        last_error = None

        for attempt in range(max_case_retries + 1):
            try:
                if task == "Recommendation":
                    out = service.generate_recommendations(query=query, strategy=strategy)
                else:
                    out = service.generate_nl2sql(query=query, strategy=strategy)

                elapsed = int((time.perf_counter() - started) * 1000)
                records.append(
                    {
                        "id": case["id"],
                        "task": task,
                        "query": query,
                        "strategy": strategy,
                        "status": "success",
                        "result_count": out.get("result_count", 0),
                        "latency_ms": out.get("latency_ms", elapsed),
                        "generated_sql": out.get("generated_sql", ""),
                        "error": None,
                        "attempts": attempt + 1,
                        "correct": heuristic_correct(case["id"], out.get("generated_sql", "")),
                    }
                )
                last_error = None
                break
            except (LLMServiceError, SQLValidationError, Exception) as e:  # Keep full batch running.
                last_error = e
                if attempt < max_case_retries and is_rate_limit_error(e):
                    time.sleep(rate_limit_wait_sec * (attempt + 1))
                    continue
                elapsed = int((time.perf_counter() - started) * 1000)
                records.append(
                    {
                        "id": case["id"],
                        "task": task,
                        "query": query,
                        "strategy": strategy,
                        "status": "error",
                        "result_count": 0,
                        "latency_ms": elapsed,
                        "generated_sql": "",
                        "error": str(e),
                        "attempts": attempt + 1,
                        "correct": False,
                    }
                )
                break

        if idx < len(cases) - 1 and case_delay_sec > 0:
            time.sleep(case_delay_sec)

    return records


def summarize(records):
    total = len(records)
    if total == 0:
        return {
            "total": 0,
            "success": 0,
            "error": 0,
            "executable_rate": 0.0,
            "avg_latency_all_ms": 0,
            "avg_latency_success_ms": 0,
            "avg_latency_error_ms": 0,
        }

    success = sum(1 for r in records if r["status"] == "success")
    error = total - success
    correct = sum(1 for r in records if r.get("correct"))
    all_latencies = [r["latency_ms"] for r in records]
    success_latencies = [r["latency_ms"] for r in records if r["status"] == "success"]
    error_latencies = [r["latency_ms"] for r in records if r["status"] != "success"]

    avg_all = int(sum(all_latencies) / len(all_latencies)) if all_latencies else 0
    avg_success = int(sum(success_latencies) / len(success_latencies)) if success_latencies else 0
    avg_error = int(sum(error_latencies) / len(error_latencies)) if error_latencies else 0

    return {
        "total": total,
        "success": success,
        "error": error,
        "executable_rate": round(success / total, 4),
        "correct_count": correct,
        "correctness_rate": round(correct / total, 4),
        "avg_latency_all_ms": avg_all,
        "avg_latency_success_ms": avg_success,
        "avg_latency_error_ms": avg_error,
    }


def write_jsonl(records, path: Path):
    with path.open("w", encoding="utf-8") as f:
        for rec in records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")


def top_error(records, max_len: int = 120):
    errors = [r["error"] for r in records if r.get("error")]
    if not errors:
        return ""
    most_common = Counter(errors).most_common(1)[0][0]
    return most_common if len(most_common) <= max_len else most_common[: max_len - 3] + "..."


def build_failure_index(strategy_records):
    case_fail_counts = Counter()
    case_meta = {}

    for strategy, records in strategy_records.items():
        for r in records:
            case_id = r["id"]
            case_meta[case_id] = {
                "id": case_id,
                "task": r.get("task", ""),
                "query": r.get("query", ""),
            }
            if r.get("status") != "success":
                case_fail_counts[case_id] += 1

    return case_fail_counts, case_meta


def persistent_failures(strategy_records):
    if not strategy_records:
        return []

    strategy_errors = []
    for _, records in strategy_records.items():
        strategy_errors.append({r["id"] for r in records if r.get("status") != "success"})

    if not strategy_errors:
        return []

    return sorted(strategy_errors[0].intersection(*strategy_errors[1:]))


def write_markdown_summary(rows, path: Path, strategy_records):
    lines = [
        "# Prompt Strategy Evaluation Summary",
        "",
        "| Strategy | #Cases | Success | Error | Executable Rate | Correct | Correctness Rate | Avg Latency All (ms) | Avg Latency Success (ms) | Avg Latency Error (ms) | Top Error |",
        "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|",
    ]

    for row in rows:
        lines.append(
            "| {strategy} | {cases} | {success} | {error} | {rate} | {correct} | {correct_rate} | {lat_all} | {lat_success} | {lat_error} | {top_error} |".format(
                strategy=row["strategy"],
                cases=row["total"],
                success=row["success"],
                error=row["error"],
                rate=f"{row['executable_rate'] * 100:.2f}%",
                correct=row["correct_count"],
                correct_rate=f"{row['correctness_rate'] * 100:.2f}%",
                lat_all=row["avg_latency_all_ms"],
                lat_success=row["avg_latency_success_ms"],
                lat_error=row["avg_latency_error_ms"],
                top_error=row["top_error"] or "",
            )
        )

    case_fail_counts, case_meta = build_failure_index(strategy_records)
    persistent_ids = persistent_failures(strategy_records)

    lines.extend([
        "",
        "## Persistent Failures Across Strategies",
    ])

    if persistent_ids:
        lines.append("")
        lines.append("| Case ID | Task | Query | Fail Count |")
        lines.append("|---:|---|---|---:|")
        for case_id in persistent_ids:
            meta = case_meta.get(case_id, {"task": "", "query": ""})
            lines.append(
                "| {id} | {task} | {query} | {fail_count} |".format(
                    id=case_id,
                    task=meta.get("task", ""),
                    query=meta.get("query", "").replace("|", "\\|"),
                    fail_count=case_fail_counts.get(case_id, 0),
                )
            )
    else:
        lines.append("")
        lines.append("No case failed in all selected strategies.")

    lines.extend([
        "",
        "## Most Unstable Cases",
        "",
        "| Case ID | Task | Query | Fail Count |",
        "|---:|---|---|---:|",
    ])

    for case_id, fail_count in case_fail_counts.most_common(8):
        meta = case_meta.get(case_id, {"task": "", "query": ""})
        lines.append(
            "| {id} | {task} | {query} | {fail_count} |".format(
                id=case_id,
                task=meta.get("task", ""),
                query=meta.get("query", "").replace("|", "\\|"),
                fail_count=fail_count,
            )
        )

    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description="Run NL2SQL prompt strategy evaluation.")
    parser.add_argument("--eval-file", default=str(BASE_DIR / "nl2sql_eval_set.json"))
    parser.add_argument("--strategy", default="hybrid", choices=["zero-shot", "few-shot", "constrained", "hybrid"])
    parser.add_argument("--all-strategies", action="store_true")
    parser.add_argument("--db", default="movies.db")
    parser.add_argument("--out", default=None)
    parser.add_argument("--summary-out", default=str(BASE_DIR / "prompt_eval_summary.md"))
    parser.add_argument("--case-delay-sec", type=float, default=1.5)
    parser.add_argument("--strategy-delay-sec", type=float, default=8.0)
    parser.add_argument("--max-case-retries", type=int, default=1)
    parser.add_argument("--rate-limit-wait-sec", type=float, default=18.0)
    args = parser.parse_args()

    eval_file = Path(args.eval_file)
    cases = load_eval_cases(eval_file)
    service = LLMQueryService(db_path=args.db)

    strategies = ["zero-shot", "few-shot", "constrained", "hybrid"] if args.all_strategies else [args.strategy]

    summary_rows = []
    output_files = []
    strategy_records = {}

    for strategy in strategies:
        records = evaluate(
            service=service,
            cases=cases,
            strategy=strategy,
            case_delay_sec=max(0.0, args.case_delay_sec),
            max_case_retries=max(0, args.max_case_retries),
            rate_limit_wait_sec=max(1.0, args.rate_limit_wait_sec),
        )
        summary = summarize(records)
        summary["strategy"] = strategy
        summary["top_error"] = top_error(records)
        summary_rows.append(summary)
        strategy_records[strategy] = records

        out_file = (
            Path(args.out)
            if args.out and len(strategies) == 1
            else BASE_DIR / f"eval_results_{strategy}.jsonl"
        )
        write_jsonl(records, out_file)
        output_files.append(str(out_file))

        if strategy != strategies[-1] and args.strategy_delay_sec > 0:
            time.sleep(args.strategy_delay_sec)

    summary_path = Path(args.summary_out)
    write_markdown_summary(summary_rows, summary_path, strategy_records)

    print(
        json.dumps(
            {
                "summaries": summary_rows,
                "outputs": output_files,
                "summary_markdown": str(summary_path),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
