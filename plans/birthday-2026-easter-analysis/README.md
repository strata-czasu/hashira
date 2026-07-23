# Birthday 2026: Easter analysis queries

Run each SQL file separately. Do not select and execute the whole directory as one script.

The queries are read-only and do not output guild IDs, user IDs, channel IDs, team names, or message content.

## Recommended order

| Query | Cost | Purpose |
|---|---|---|
| `01-event-config.sql` | Very low | Verify the event window and cap |
| `02-roster-size.sql` | Low | Count anonymized team rosters |
| `03-easter-score-distribution.sql` | High | Easter participant percentiles |
| `04-active-members-by-team.sql` | High | Active members per team |
| `05-text-by-hour.sql` | High | Warsaw text activity hours |
| `06-voice-by-hour.sql` | Medium/high | Warsaw voice activity hours |
| `07-simulated-text-pasza.sql` | Very high | Proposed seven-day text Pasza |
| `08-simulated-voice-pasza.sql` | Medium/high | Proposed seven-day voice Pasza |

Start with queries 1 and 2. Run only one expensive query at a time and let it finish before starting another.

Queries 7 and 8 deliberately simulate text and voice separately. This avoids one large query joining and aggregating both activity tables. They use the first seven 24-hour event days anchored to the configured start; they do not split activity at calendar-week or midnight boundaries.

## If a query still times out

The activity tables currently have no relevant indexes declared in the Prisma schema, so production may need to scan a large part of a table.

For an initial sample, edit the `cfg` CTE in that query and replace:

```sql
ec."eventStartDate" AS event_start,
ec."eventEndDate" AS event_end
```

with a narrower seven-day UTC window:

```sql
TIMESTAMP '2026-04-01 00:00:00' AS event_start,
TIMESTAMP '2026-04-08 00:00:00' AS event_end
```

Use dates that actually fall inside the Easter event. Label the output as a sample rather than the complete Easter distribution.

Do not add a production index from a database viewer without treating it as a separate reviewed database change.
