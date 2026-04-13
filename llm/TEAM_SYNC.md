# LLM Module Team Sync

```
LLM integration progress update:
- LLM module is now centralized under imdb_database/llm.
- Default runtime strategy is hybrid (few-shot + constraints + template fallback).
- Chinese intents are supported for key queries (e.g., highest-rated action, emotional drama recommendation).
- Eval script supports zero-shot/few-shot/constrained/hybrid with executable+correctness+latency metrics.

What you need to run locally:
1) Create local .env from .env.example and fill GEMINI_API_KEY.
2) Install dependencies from requirements.txt in a venv.
3) Start API: python app.py
4) Quick test:
   POST /api/query/nl with {"query":"给我最高评分的动作电影","strategy":"hybrid"}

Notes:
- .env is local only and not committed.
- If requests feel slow, check LLM_HTTP_TIMEOUT_SEC and LLM_MAX_TOTAL_SEC in .env.
```

## 2) Files teammates must configure

- Required local file: `.env`
- Start from: `.env.example`
- Required field in `.env`:
  - `GEMINI_API_KEY`

Recommended defaults (already in `.env.example`):
- `LLM_PROVIDER=gemini`
- `LLM_MODEL=gemini-3-flash-preview`
- `LLM_MAX_RETRIES=0`
- `LLM_HTTP_TIMEOUT_SEC=10`
- `LLM_MAX_TOTAL_SEC=30`

## 3) Local run steps

```bash
cd /$YOUR_PATH/imdb_database
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -U pip
python -m pip install -r requirements.txt
cp .env.example .env
# edit .env and fill GEMINI_API_KEY
python app.py
```

## 4) Quick interactive tests

```bash
# Query
curl -X POST http://127.0.0.1:7777/api/query/nl \
  -H "Content-Type: application/json" \
  -d '{"query":"给我最高评分的动作电影","strategy":"hybrid"}'

# Recommendation
curl -X POST http://127.0.0.1:7777/api/recommend/nl \
  -H "Content-Type: application/json" \
  -d '{"query":"推荐5部高分的情感剧情片","strategy":"hybrid"}'
```

## 5) Common issues

- `ModuleNotFoundError: flask`
  - Install dependencies in your venv: `pip install -r requirements.txt`
- Request hangs too long
  - Reduce `LLM_HTTP_TIMEOUT_SEC` and `LLM_MAX_TOTAL_SEC` in `.env`
- Empty/failed LLM response
  - Check `GEMINI_API_KEY` and network access
