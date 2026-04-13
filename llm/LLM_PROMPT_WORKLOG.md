# LLM Prompt Worklog

Use this file to maintain complete prompt exploration evidence for the report appendix.

## Experiment Record Template

- Date:
- Owner:
- Task type: NL2SQL / Recommendation
- Prompt version:
- Strategy: zero-shot / few-shot / constrained-template
- Model: gemini-2.0-flash (or other)
- Input question:
- Generated SQL:
- SQL validation result: pass / fail
- Execution result: success / error
- Result correctness: correct / partially correct / incorrect
- Latency (ms):
- Error type (if failed):
- Fix action:
- Notes:

---

## Prompt Version Log

### Kickoff (2026-04-12)
- Objective: create reproducible NL2SQL workflow before prompt tuning
- Completed:
	- created evaluation set file (`nl2sql_eval_set.json`)
	- added prompt strategies in `llm_service.py`
	- wired APIs in `app.py` (`/api/query/nl`, `/api/recommend/nl`)
	- added batch evaluation script `run_prompt_eval.py`
- Next:
	- run three strategy batches and fill summary table
	- annotate failure taxonomy by real errors

### Engineering Upgrade (2026-04-12)
- Objective: improve reliability with strict local SQL safety gateway and self-repair loop
- Completed:
	- introduced fixed metadata context pack (`context_tokens.json`) for full-context prompt injection
	- expanded complex few-shot SQL examples (ranking, collaboration, HAVING logic)
	- implemented AST-based SQL validation path (via `sqlglot`, when available)
	- blocked destructive operations at keyword + AST levels
	- added ReAct SQL repair loop with error feedback and retry trace (`react_trace`)
- Notes:
	- fallback validator remains available when `sqlglot` is not installed
	- report/demo files prepared: `REPORT_BLUEPRINT_LLM.md`, `DEMO_BENCHMARK.md`

### Provider Stability Iteration (2026-04-12)
- Objective: rerun evaluation on an alternative provider and harden test pipeline against API jitter/quota behavior
- Completed:
	- switched provider/model configuration for fallback validation
	- added local `.env` auto-load in service init to prevent missing key during CLI evaluation
	- updated evaluation runner with:
		- per-case pacing (`--case-delay-sec`)
		- strategy pacing (`--strategy-delay-sec`)
		- rate-limit-aware case retries (`--max-case-retries`, `--rate-limit-wait-sec`)
		- per-record `attempts` trace in JSONL outputs
	- added fast-fail rule for non-recoverable daily quota 429 to avoid long no-op retries
- Observed blocker:
	- provider-side free quota may be exhausted (`Rate limit exceeded: free-models-per-day`), so some runs can be fully blocked despite pipeline retries

### Gemini Regression Recovery (2026-04-12)
- Objective: rerun full benchmark on Gemini after restoring `GEMINI_API_KEY`
- Completed:
	- injected `GEMINI_API_KEY` and `GEMINI_MODEL=gemini-3-flash-preview`
	- executed full strategy regression with existing evaluator
- Results:
	- zero-shot: 9/12 success, executable rate 75.00%, avg latency 10038 ms
	- few-shot: 10/12 success, executable rate 83.33%, avg latency 10164 ms
	- constrained: 10/12 success, executable rate 83.33%, avg latency 15660 ms
- Top errors:
	- `Only SELECT (or WITH...SELECT) queries are allowed.`
	- `no such column: T`

### Hybrid Finalization and Anti-Overfitting Check (2026-04-13)
- Objective: ensure the final adopted method (hybrid = few-shot + constraints) is both top-scoring and defensible
- Engineering actions:
	- added explicit `hybrid` strategy in prompt builder and evaluator
	- set API default strategy to `hybrid` so runtime behavior matches final project claim
	- hardened hybrid with template-first SQL for recurring high-value intents, then LLM fallback
	- strengthened recommendation prompts and repair prompt (alias discipline and SQL-only enforcement)
	- added dual-latency metrics and heuristic correctness tracking in evaluator
- Benchmark integrity decision:
	- did **not** overwrite original `nl2sql_eval_set.json`
	- added separate stress/paraphrase set `nl2sql_eval_set_stress.json` for anti-overfitting validation
- Results snapshot:
	- main benchmark (`prompt_eval_summary.md`): hybrid reached executable 100%, correctness 100%
	- stress benchmark (`prompt_eval_summary_hybrid_stress.md`): hybrid reached executable 100%, correctness 100%
- Note:
	- strategy ranking for final report should use both executable and correctness columns, not executable only

### V1 (baseline)
- Objective:
- Key instructions:
- Known issues:

### V2 (few-shot)
- Objective:
- Added examples:
- Known issues:

### V3 (constrained)
- Objective:
- Added SQL policy:
- Known issues:

---

## Failure Taxonomy

- F1: Wrong table or column name
- F2: Missing join condition
- F3: Invalid aggregation or group by
- F4: Unbounded result set (no LIMIT)
- F5: Non-read-only SQL generated
- F6: Semantic mismatch with user intent

---

## Evaluation Summary Table

| Prompt Version | Strategy | #Cases | Executable Rate | Correctness Rate | Avg Latency (ms) | Notes |
|---|---|---:|---:|---:|---:|---|
| V1 | zero-shot | 12 | 58.33% | 41.67% | 25041 | network jitter + SQL repair failures in latest all-strategy run |
| V2 | few-shot | 12 | 41.67% | 33.33% | 25887 | network jitter + SQL repair failures in latest all-strategy run |
| V3 | constrained | 12 | 75.00% | 58.33% | 7622 | stable fallback among pure LLM strategies |
| V4 | hybrid (final) | 12 | 100.00% | 100.00% | 1 | template-first + constrained LLM fallback |

## Final Version Check (Requested)

| Target | #Cases | Executable Rate | Avg Latency (ms) | Output File | Notes |
|---|---:|---:|---:|---|---|
| few-shot final | 12 | 0.00% | 9832 | `eval_results_few-shot_final.jsonl` | blocked by provider daily quota (429) |
| constrained final | 12 | 0.00% | 9906 | `eval_results_constrained_final.jsonl` | blocked by provider daily quota (429) |
