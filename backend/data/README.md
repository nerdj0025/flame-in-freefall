# Put the NASA files here

Copy these from the notebook's `/content` folder (names can keep the `[1]` / `(1)` suffixes):

| File | What it is |
|---|---|
| `measurements*.csv` | the long-format measurements (4230 rows) |
| `experiments*.json` | `{"experiments": [...]}` |
| `evidence*.json` | `{"evidence": [...], "sources": [...]}` |
| the data-quality report `.csv` | any name; found by its `issue_id` + `severity` columns (optional) |

`data_dictionary*.json` is not needed by the API.
