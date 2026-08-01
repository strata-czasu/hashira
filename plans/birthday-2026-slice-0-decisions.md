# Birthday 2026: Slice 0 decisions and measurement

Status: complete  
Implementation plan: [birthday-2026-implementation-slices.md](birthday-2026-implementation-slices.md)  
Measurement queries: [birthday-2026-easter-analysis](birthday-2026-easter-analysis/README.md)
Recent activity queries: [birthday-2026-recent-analysis](birthday-2026-recent-analysis/README.md)

## Slice 0 outcome

The decisions and calibrated defaults are sufficient to begin Slice 1. Economic values remain configurable, but handlers must not invent missing rules.

The Easter exports establish event behavior. The recent 28-day exports validate the
passive caps and define the team-projection and milestone method to apply to the
pre-launch roster.

## Repository findings

- The bot-wide timezone constant is `Europe/Warsaw`.
- Easter 2026 stores explicit start/end instants but does not store a timezone.
- Easter 2026 scores eligible text messages after team join, excludes configured channels, applies date/channel multipliers, and caps weighted messages at 1,000 per member per day.
- Easter team assignment balances headcount only.
- Text activity is persisted per message with user, guild, channel, and timestamp.
- Voice sessions persist eligible duration components including muted, deafened, and alone state.
- The economy supports integer personal wallets and transactions, but transactions have no durable generic source/idempotency key.
- Existing wallets belong to users; a Birthday team wallet must remain event-owned as proposed in the parent design.
- The persistent message queue is available for digestion and later encounters.

## Production data findings

Easter 2026 ran from 2 April 2026 12:00 Warsaw time through 9 April 2026 23:59:59 Warsaw time.

Participation:

- four teams had nearly identical rosters: 115, 116, 116, and 116 members;
- only 180 of 463 rostered members recorded eligible text activity: 38.88%;
- active members still varied materially by team: 49, 38, 43, and 50;
- the mean was 45 active members per team, but the smallest team had 24% fewer active members than the largest despite equal roster sizes.

Raw Easter text score:

| Metric | Score |
|---|---:|
| Participating members | 180 |
| Median | 4.50 |
| 75th percentile | 104.50 |
| 90th percentile | 1,241.80 |
| 95th percentile | 1,799.05 |
| Top | 5,077.00 |

This distribution is extremely skewed: the top score was over 1,100 times the median, and the 90th percentile was over 275 times the median. Raw message scoring would make a small number of members overwhelmingly important.

The capped Pasza simulations produced the following approximate seven-day percentiles:

| Source | Participating members | Median | P75 | P90 | P95 |
|---|---:|---:|---:|---:|---:|
| Text windows | 180 | 1.87 | 33.83 | 126.37 | 161.47 |
| Eligible voice | 113 | 1.87 | 12.13 | 35.28 | 56.75 |

The source-specific percentiles cannot be added directly because text and voice participation are correlated and the populations differ. The recent analysis exports pseudonymous per-user weekly values so they can be combined locally.

Activity timing:

- 48,287 eligible text messages were recorded;
- 335.73 eligible voice hours were recorded;
- 62.55% of text and 75.85% of voice occurred from 18:00 through 02:59 Warsaw time;
- 90.65% of text and 85.93% of voice occurred from 12:00 through 02:59;
- text peaked at 22:00, closely followed by 20:00;
- voice peaked at 23:00, followed by 22:00 and 21:00.

Implications:

- balance teams by estimated activity, not roster size alone;
- keep passive earning available around the clock;
- if encounters are added, use a broad 12:00-02:59 Warsaw window with most spawns weighted toward 18:00-00:59;
- keep hard/diminishing passive caps because raw activity is far too skewed;
- reward distinct participants in team encounters so the 38.88% participation rate can improve.

## Recent activity findings

The current measurement covers 25 June 2026 20:00 through 23 July 2026 20:00 Warsaw time in four complete event-like weeks.

| Week | Pasza earners | Text Pasza | Voice Pasza | Combined | Voice share |
|---|---:|---:|---:|---:|---:|
| 0 | 703 | 11,976 | 5,729 | 17,705 | 32.36% |
| 1 | 764 | 13,065 | 5,589 | 18,654 | 29.96% |
| 2 | 710 | 12,216 | 4,187 | 16,403 | 25.53% |
| 3 | 725 | 11,540 | 5,432 | 16,972 | 32.01% |

Combined weekly distribution among members earning at least one Pasza:

| Metric | Observed range across four weeks |
|---|---:|
| Median | 5-6 |
| 75th percentile | 22-27.5 |
| 90th percentile | 65.2-83.2 |
| 95th percentile | 111.55-127.9 |
| Top | 255-286 |

Source-specific findings:

- 513-550 members earned text Pasza each week;
- 293-324 members earned voice Pasza each week;
- only 100-113 members earned from both sources in the same week;
- 16-20 text participants per week reached at least 150 of the 168 maximum;
- no more than five voice participants per week reached at least 110 of the 126 maximum;
- the caps reduce the raw Easter extreme substantially without flattening everyone to the same score.

Participation is volatile:

- 1,526 distinct members earned at least one Pasza across the 28 days;
- 852 earned in only one of four weeks;
- 249 earned in two weeks;
- 148 earned in three weeks;
- 277 earned in all four weeks.

The top 10% of weekly earners still produced approximately 54-57% of passive Pasza. Activity-weighted team balancing therefore remains necessary even after caps. Distinct-member encounters and contracts should create breadth, but no further reduction to passive caps is recommended initially.

## Adopted product decisions

The owner accepted the defaults subject to the production-data review above.

| Decision | Recommendation | Status |
|---|---|---|
| Authoritative timezone | `Europe/Warsaw` | Adopted |
| Duration | Seven consecutive 24-hour event days | Adopted |
| Exact start | 1 August 2026 20:00 Warsaw / 18:00 UTC | Confirmed |
| Exact end | 8 August 2026 20:00 Warsaw / 18:00 UTC | Derived from accepted seven-day duration |
| Registration | Opt-in registration remains open through the event; post-launch joiners are assigned immediately | Adopted |
| Team count | Four | Agreed |
| Team balancing | Balance estimated recent activity first, headcount second | Adopted and data-supported |
| Captain selection | Staff appoints one captain per team; captain changes remain staff-only | Adopted |
| Core earning | Text active windows plus eligible voice duration | Adopted and calibrated |
| Daily passive caps | 24 text plus 18 voice per event day | Adopted and calibrated |
| Passive earning hours | 24/7 | Adopted and data-supported |
| Encounter hours, if shipped | 12:00-02:59 Warsaw, weighted toward 18:00-00:59 | Data-supported default |
| Direct transfers | No voluntary Pasza transfers | Adopted |
| Feeding conversion | 1 digested Pasza = 1 permanent weight unit | Adopted |
| Digestion delay | Four hours, configurable | Adopted |
| End cutoff | Stop earning and feeding together; settle all accepted feed batches; unspent personal Pasza expires | Adopted |
| Tie result | Declare co-winners rather than inventing a hidden tiebreak | Adopted |
| Visibility | Exact team permanent/pending weight public; personal wallet private | Adopted for the non-raid event |
| Minimum visual | One generic pig/emoji fallback plus team color and text progress | Adopted |
| Milestones | Shared thresholds derived from projected registered-team activity | Adopted |
| Initial delivery commitment | Slices 0-4 | Adopted |
| Recommended target | Slices 0-6 | Adopted |
| Explicit stretch | Slices 7-10; raids remain outside the first commitment | Adopted |

## Event timing

Recommended semantics:

- `eventStartAt` is `2026-08-01T18:00:00Z`;
- `eventEndAt` is `2026-08-08T18:00:00Z`;
- `timezone` is stored as `Europe/Warsaw` for daily buckets and player-facing formatting;
- `eventStartAt` is inclusive;
- `eventEndAt` is exclusive;
- one event day is a 24-hour interval anchored to `eventStartAt`;
- daily caps reset at 20:00 Warsaw, producing exactly seven cap periods;
- no handler uses the host process timezone implicitly.

Do not reset caps at Warsaw midnight. A 20:00 start and end would otherwise span eight calendar dates and allow eight daily caps inside a seven-day event.

## Registration and team balancing

### Recommended registration

- Members opt in before or during the event with `/tucznik dolacz`.
- Registration is available whenever the event is visible and has not ended. It has
  no separate feature flag or closing operation.
- Staff performs the initial activity-balanced assignment before launch while
  registration remains open.
- Anyone joining after that assignment is immediately placed on the team with the
  lowest projected activity, then lowest headcount. Existing assignments do not
  move.
- A post-launch joiner starts with zero Pasza and receives no retroactive event
  award.

This keeps consent and team identity without making a missed launch deadline exclude
someone from the event.

Captain assignment and replacement are staff-only during this event. A captain may request a replacement socially, but there is no direct player-to-player leadership transfer command in the committed scope.

### Recommended balancing

Do not copy Easter's least-headcount-only assignment. Easter rosters differed by at most one member, yet active-member counts ranged from 38 to 50 and individual scores were extremely skewed.

For every opted-in participant:

1. calculate a private recent-activity estimate from the same text-window and eligible-voice rules proposed below, using a fixed pre-event lookback;
2. order participants from highest to lowest estimate;
3. assign each participant to the currently lowest projected-activity team;
4. break ties using current headcount, then random choice;
5. place captains first and include their estimates in team totals.

Recommended lookback: the 28 days ending at the configured event start. The same
fixed window is used when assigning later joiners.

Recommended projection:

```text
member estimate =
    week 0 Pasza * 0.10
  + week 1 Pasza * 0.20
  + week 2 Pasza * 0.30
  + week 3 Pasza * 0.40
```

Missing weeks contribute zero. Text and voice use the adopted caps before being combined.

Assign captains first, then process remaining registered participants from highest to lowest estimate. Place each participant on the team with the lowest projected total; break ties by headcount, then random choice.

Using four-week averages, the recent data can be greedily divided into four teams within one Pasza of one another before fixed-captain constraints. The actual registration roster, not all server activity, is authoritative for the final assignment.

Staff may move members before scoring begins, then run a balance report showing projected totals and headcounts. Do not expose individual activity estimates publicly.

Fallback:

- if production activity measurement is unavailable, assign greedily by headcount while distributing known highly active members manually;
- record that this is a balance risk rather than silently treating headcount as equivalent.

## Initial Pasza sources

### Text activity

Recommended rule:

- award 1 Pasza for the first qualifying message in each fixed five-minute activity window;
- cap at 24 rewarded windows per member per 24-hour event day;
- ignore disabled channels and bot/system messages;
- do not use bonus-channel multipliers in the minimum event.

Why:

- rewards showing up and participating rather than message volume;
- one member cannot gain more by sending several messages inside the same window;
- the durable source key is naturally `(event, user, eventDayIndex, fiveMinuteWindow)`;
- the maximum is understandable and configurable.

Open implementation detail for Slice 3:

- decide whether the window is a fixed wall-clock bucket or a five-minute cooldown from the last rewarded message. Fixed buckets are easier to make idempotent and are recommended.

### Voice activity

Recommended rule:

- award 1 Pasza per completed 10 eligible voice minutes;
- cap at 18 Pasza per member per 24-hour event day;
- eligible time is not muted, not deafened, and not alone;
- award from persisted voice-session totals, never from presence state.

The source key must support a session being processed more than once without crediting the same completed 10-minute unit again.

### Initially excluded passive sources

- reactions;
- streams/video multipliers;
- raw message count multipliers;
- bonus channels;
- invites;
- voluntary transfers;
- retrospective awards before Birthday membership.

Encounters and daily contracts remain later bounded sources. Their rewards should be calibrated after passive production is measured.

## Initial caps and score budgets

The production data validates the 24-text and 18-voice event-day caps.

| Participant profile | Data-informed passive estimate |
|---|---:|
| Occasional | approximately 1-6 Pasza |
| Ordinary engaged | approximately 22-28 Pasza |
| Active | approximately 65-85 Pasza |
| Very active | approximately 110-130 Pasza |
| Extreme observed | approximately 255-286 Pasza |
| Extreme theoretical cap | 294 Pasza: 168 text + 126 voice |

With encounters later enabled, use a preliminary weekly encounter ceiling of:

- a target of 15-20% of total team Pasza coming from score-bearing encounters;
- at most 20 personal encounter Pasza per week before anti-monopoly controls;
- additional encounter rewards should be team utility, power-ups, or cosmetics rather than more personal Pasza.

The most recent week averaged 23.41 Pasza per earner. Simple registration scenarios, before accounting for opt-in bias, are:

| Earning participants | Approximate passive Pasza per team |
|---:|---:|
| 180 | 1,050 |
| 300 | 1,750 |
| 463 | 2,700 |
| 725 | 4,240 |

Do not hard-code milestones from these scenarios. Calculate them after the
pre-launch registration roster is activity-balanced.

## Team projection and milestones

During pre-launch roster assignment:

1. calculate the recency-weighted estimate for every registered member;
2. perform the activity-balanced assignment;
3. calculate each team's projected passive total;
4. set `P` to the median projected total across the four teams;
5. round milestone thresholds to convenient multiples such as 25 Pasza.

Recommended shared artwork thresholds:

| Stage | Threshold |
|---|---:|
| First growth | 15% of `P` |
| Second growth | 35% of `P` |
| Third growth | 60% of `P` |
| Final form | 85% of `P` |

All teams use the same thresholds. The 85% final-art threshold leaves room for imperfect feed-through while encounters can supply approximately 15-20% additional team value.

Example: if `P = 2,700`, rounded thresholds are approximately 400, 950, 1,625, and 2,300.

## Feed lifecycle

Recommended minimum lifecycle:

```text
personal wallet
    -> accepted feed transaction
    -> team wallet and feed batch
    -> four-hour digestion job
    -> permanent weight
```

Rules:

- feeding accepts any positive integer up to the available balance;
- the personal debit, team credit, and feed-batch creation are atomic;
- the batch becomes due four hours after acceptance;
- digestion debits the remaining team-wallet batch amount and increments permanent weight once;
- permanent weight never decreases;
- team-wallet balance reconciles to unresolved batch balances;
- the status message shows permanent weight and pending feed separately;
- theft exposure fields may be added later, but Slice 2 does not need raid behavior.

Fallback:

- support a configured zero-delay/immediate-digestion mode if persistent digestion cannot be made reliable in time;
- do not bypass the ledger or create a separate scoring path.

## Cutoff and settlement

At `eventEndAt`:

1. reject new automatic awards;
2. reject new feeding;
3. prevent new score-bearing encounters from starting;
4. resolve already-committed rewards according to their persisted claim time;
5. immediately digest all valid unresolved feed batches accepted before the cutoff;
6. leave unspent personal Pasza out of the score;
7. atomically lock team results;
8. calculate awards from the locked cutoff;
9. allow only score-neutral finale activity afterward.

This avoids penalizing a valid last-hour feed merely because its four-hour job was not due, while still making unspent personal Pasza worthless at the cutoff.

Recommended tie behavior:

- exact equal permanent weight produces co-winners;
- individual award ties are displayed as ties;
- do not use unpublished activity, raid, or timing tiebreakers.

## Artwork minimum

Artwork must not block the event shell or core loop.

Minimum acceptable presentation:

- team color;
- pig name;
- a generic pig emoji or one reusable placeholder image;
- permanent and pending weight;
- text milestone progress.

Preferred target:

- one base image plus three milestone variants reusable through color/copy, or four team-specific sets if assets are available.

Missing artwork URL, failed media loading, or an incomplete set must fall back to the text/emoji status without breaking updates.

## First estimate scope

### Commit

- Slice 0: decisions and measurement;
- Slice 1: event shell;
- Slice 2: Pasza-to-weight path;
- Slice 3: minimum playable event;
- Slice 4: closure and operations.

### Target after the commitment is healthy

- Slice 5: first individual encounter;
- Slice 6: team threshold encounter and possibly one daily contract.

### Do not include in the first commitment

- captain powers and permanent choices;
- social persistence beyond cheap derived recognition;
- individual or coordinated raids;
- `Dziki Knur`;
- a generic quest engine;
- complex puzzle encounters.

These remain valid follow-ups, not promises required for Birthday 2026 to exist.

## Production measurement status

All eight Easter exports and both recent-activity exports have been received, validated, joined, and incorporated.

The recent exports contain:

- 2,114 unique text participant/week rows;
- 1,886 unique voice participant/week rows;
- all four expected week indices;
- no duplicate participant/week keys.

## Slice 0 completion

Slice 0 is complete. Slice 1 may begin.

Absolute milestone values are intentionally calculated from the pre-launch roster
using the adopted formula. Later joins do not recalculate them. This is an
operational configuration step, not unresolved product design.
