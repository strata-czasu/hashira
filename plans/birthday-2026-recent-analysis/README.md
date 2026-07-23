# Birthday 2026: recent activity analysis

Run these two queries separately and export each result as CSV:

1. `01-recent-text-pasza.sql` → `01-recent-text-pasza.csv`
2. `02-recent-voice-pasza.sql` → `02-recent-voice-pasza.csv`

Each query scans only one activity family and returns pseudonymous per-member totals for four complete seven-day blocks. The same `participant_key` is used in both exports, allowing the CSVs to be combined locally without exporting Discord user IDs.

The measurement window is the latest 28 complete days ending at the most recent 20:00 Warsaw boundary. This matches Birthday's proposed event-day reset.

Both queries are read-only. Run only one at a time.

