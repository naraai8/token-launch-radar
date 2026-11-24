# token-radar-01

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/naraai8/token-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/naraai8/token-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar: reads the sealed DefiLlama snapshot, finds every protocol that records no token, and ranks 100 of them by implied launch value — TVL-scaled estimate × category premium × 7-day momentum × chain reach × recency. The house watchlist is a floor, never a ceiling: the board also surfaces big pre-token protocols below it (Sentora Curator, $2.76B).

`main.ts` (Node 22, stdlib only) writes `/output/board.json`, `/output/dashboard/data.js`, copies `dashboard/` + `screenshots/` and writes `/output/dossier.json`. The dashboard is a static page (no network): sortable board, category/TVL/watchlist filters, per-protocol detail with the ranking rationale and concrete farm steps.

## Run it
```sh
MAKEFUN_OUTPUT_DIR=out node main.ts --input /input/snapshot.json
```
