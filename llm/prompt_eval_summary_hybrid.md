# Prompt Strategy Evaluation Summary

| Strategy | #Cases | Success | Error | Executable Rate | Correct | Correctness Rate | Avg Latency All (ms) | Avg Latency Success (ms) | Avg Latency Error (ms) | Top Error |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| hybrid | 12 | 8 | 4 | 66.67% | 6 | 50.00% | 12965 | 3 | 38889 | SQL failed after ReAct retries. last_error=no such column: m.movie_ |

## Persistent Failures Across Strategies

| Case ID | Task | Query | Fail Count |
|---:|---|---|---:|
| 2 | NL2SQL | Find drama movies with rating above 8.5. | 1 |
| 6 | NL2SQL | Find the average IMDb rating of movies released after 2010 by genre. | 1 |
| 7 | NL2SQL | Give me science fiction movies from 2010 to 2020 sorted by votes. | 1 |
| 9 | Recommendation | Recommend 5 emotional drama movies with high rating. | 1 |

## Most Unstable Cases

| Case ID | Task | Query | Fail Count |
|---:|---|---|---:|
| 2 | NL2SQL | Find drama movies with rating above 8.5. | 1 |
| 6 | NL2SQL | Find the average IMDb rating of movies released after 2010 by genre. | 1 |
| 7 | NL2SQL | Give me science fiction movies from 2010 to 2020 sorted by votes. | 1 |
| 9 | Recommendation | Recommend 5 emotional drama movies with high rating. | 1 |
