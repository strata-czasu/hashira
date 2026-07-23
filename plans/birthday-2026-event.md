# Birthday 2026: Nakarm Tucznika

Status: design draft and implementation handoff  
Created: 2026-07-19  
Expected duration: approximately one week

## Companion plans

- [Implementation slices](birthday-2026-implementation-slices.md): incremental coding milestones, scope tiers, stop points, and fallbacks.
- [Slice 0 decisions and measurement](birthday-2026-slice-0-decisions.md): adopted defaults, production evidence, calibrated budgets, and milestone method.
- [Social and live ops](birthday-2026-social-live-ops.md): launch social mechanics, content rhythm, moderation, and daily health checks.

This document remains the source of truth for mechanics and invariants. The implementation plan determines a safe coding order; it does not dictate when finished mechanics become available to players. The social/live-ops plan covers optional interaction and pre-event hype.

## Document conventions

This design is intentionally split into three levels:

- **Agreed**: established during brainstorming and safe to design around.
- **Recommended**: the current best proposal, but still adjustable.
- **Open**: must be answered before mechanics or balancing are finalized.

Numbers in this document are illustrative until the Easter 2026 activity distribution is analysed.

## Concept

Four teams compete to raise the heaviest pig during the guild's Birthday 2026 event.

Members earn a virtual event currency called `Pasza`, feed it to their team's pig, participate in randomly spawned Discord encounters, earn temporary team power-ups, upgrade their pig operation, and steal limited amounts of feed from opponents.

The intended core loop is:

```text
Guild activity
    -> personal Pasza
    -> feeding and spawned encounters
    -> team power-ups, upgrades, and theft
    -> permanent pig weight
    -> team and individual awards
```

## Design goals

- Reward broad participation rather than raw message spam.
- Give players frequent, visible interactions during a short event.
- Make teams coordinate without requiring everyone to be online simultaneously.
- Give the captain meaningful, reactive decisions.
- Allow theft and sabotage without deleting permanent progress or enabling harassment.
- Reuse the existing economy, team, activity, component, and message-queue infrastructure.
- Make the event understandable from one status message and a small command surface.
- Keep the result competitive until the end without arbitrary score manipulation.

## Agreed foundations

- There are four user teams.
- Each team has one captain; there is no deputy role.
- The event will probably last about one week.
- `Pasza` should reuse the shared economy as a virtual event currency.
- The pig's permanent weight is the main team score.
- Teams can unlock upgrades.
- Feed theft is part of the event, with safeguards and counterplay.
- Random encounters spawn similarly to Halloween 2025 encounters.
- Some encounters reward the first eligible participant.
- Some encounters require a threshold such as three distinct members of one team.
- Teams can earn temporary power-ups from encounters.
- The captain activates team-earned power-ups on demand.
- Captain decisions are reactive and can happen several times per day.
- Each pig has a dedicated status channel with an interactive, periodically updated status message.
- Every participant may spend Pasza to feed a rival pig exactly once during the event, causing a public message shaming them in their home team's channel.
- The special tryhard/saboteur player remains optional and must not become an unchecked kingmaker.

## Reuse from existing events

### Easter 2026

Reuse or adapt:

- Event start/end configuration.
- Team creation and Discord role mapping.
- Joining and administrative team movement.
- Status channels and periodically edited status messages.
- Captain assignment.
- Disabled activity channels.
- Scheduled bonus channels.
- Team and user rankings.
- Milestone-linked pig artwork.

Relevant implementation:

- `apps/bot/src/events/easter2026/index.tsx`
- `apps/bot/src/events/easter2026/teamService.ts`
- `apps/bot/src/events/easter2026/statusService.tsx`
- `apps/bot/src/events/easter2026/pointsService.ts`
- `packages/db/prisma/models/easter2026.prisma`

Do not use Easter's recomputed message total as a spendable balance. Currency awards must be persisted and idempotent.

### Halloween 2025

Reuse or adapt:

- A persisted spawn record linked to a Discord message.
- Button-based participation.
- Unique participation per user and spawn.
- Expiration through the persistent message queue.
- Resolution after expiration.
- Weighted/random encounter selection.
- Event-specific currency on top of the common economy.
- An event shop pattern if lasting or deliberately tradeable items are introduced.

Relevant implementation:

- `apps/bot/src/events/halloween2025/index.ts`
- `apps/bot/src/events/halloween2025/tokens.ts`
- `apps/bot/src/events/halloween2025/tokenShop.ts`
- `apps/bot/src/messageQueueBase.ts`
- `packages/db/prisma/models/halloween2025.prisma`

Repository note: the current tree contains creation of `halloween2025-catch:*` buttons and expiration processing, but no obvious interaction handler that creates `Halloween2025MonsterCatchAttempt`. Birthday 2026 must implement and test its participation handler explicitly rather than assuming the complete path can be copied.

## Economy design

### Personal Pasza

**Recommended:** create one guild-scoped `Currency` owned by the Birthday 2026 configuration and store its `currencyId` in that configuration.

Each participant receives a normal economy `Wallet` for this currency. Wallet balance represents personal, unspent Pasza.

Use the shared economy for:

- balance storage;
- credits from activity and encounters;
- debits when feeding or buying something;
- transfers caused by theft where appropriate;
- human-readable transaction history.

### Team Pasza wallet

The existing economy `Wallet` cannot directly represent a team balance because it requires a `userId`. Do not attach a shared balance to the captain's user wallet: captain replacement would change ownership, generic user commands would expose the wrong owner, and personal and team transactions would become mixed.

**Recommended:** add an event-owned `Birthday2026TeamWallet` and `Birthday2026TeamWalletTransaction`. The team wallet references the same Pasza `Currency`, but belongs one-to-one to `Birthday2026TeamConfig` rather than to a user.

The team wallet represents Pasza currently held in the team's trough and waiting to become permanent pig weight:

- feeding atomically debits the member's economy wallet, credits the team's wallet, and creates a contribution/feed-batch record;
- team encounter rewards may credit a team's wallet while creating a matching system-owned feed batch;
- digestion atomically debits the appropriate team-wallet amount and increments permanent pig weight;
- theft debits exposed feed from a team wallet and credits its configured destination;
- every team credit/debit receives an immutable team-wallet transaction entry and source reference;
- permanent pig weight is stored separately and never decreases when team-wallet Pasza is spent, stolen, or digested.

This keeps the shared economy for personal balances while providing a real team account without generalizing every existing wallet manager and command.

Store the following additional state in Birthday-specific models:

- permanent pig weight;
- team encounter progress;
- captain-controlled power-ups;
- team upgrades;
- active timed effects;
- feed batches waiting to become permanent weight;
- raid attempts, cooldowns, and daily caps.

Direct user-to-user Pasza transfers are not recommended initially because they enable funneling into one player, evading safe-balance rules, and win trading. Event-controlled theft is not an ordinary voluntary transfer.

## Feed lifecycle

Theft becomes irrelevant if players can instantly turn all earned Pasza into untouchable score. A vulnerable intermediate state is therefore recommended.

### Recommended states

| State | Owner | Meaning | Vulnerability |
|---|---|---|---|
| Personal wallet | User | Earned, not yet fed Pasza | Partially stealable above a protected floor |
| Team wallet/feed batch | User and team | Pasza placed in the team's trough, waiting to digest | A capped portion can be stolen |
| Pig weight | Team | Fully digested, permanent score | Never stealable |

Suggested flow:

1. A user earns Pasza into their wallet.
2. `/tucznik nakarm` atomically debits the personal wallet, credits the team wallet, and creates a feed batch.
3. The batch has an owner, team, amount, remaining amount, creation time, and digestion time.
4. Theft can affect only the configured exposed portion.
5. A queued job debits the remaining batch amount from the team wallet and increments permanent team weight.
6. Digested weight unlocks visual milestones and upgrade points.

This lifecycle is recommended, not yet agreed. The exact exposure rules are a blocking design question.

### Feeding command

Potential interface:

```text
/tucznik nakarm ilość:50
/tucznik nakarm wszystko:true
```

The response should show:

- amount fed;
- personal wallet remainder;
- expected digestion time;
- current exposed amount;
- resulting team milestone progress.

## Earning Pasza

### Passive activity

Potential sources:

- qualifying text activity;
- qualifying voice activity;
- a small daily participation task;
- bonus channels or scheduled guild activities;
- spawned encounters.

Use diminishing returns and separate daily caps. Avoid an indefinitely linear one-message/one-feed conversion.

Before selecting values, query Easter 2026 data and compare at least:

- median participating member;
- 75th percentile;
- 90th percentile;
- 95th percentile;
- top individual;
- expected active users per team;
- text/voice contribution by hour of day.

The target should let a highly active person matter without producing ten times the output of an ordinarily active participant.

### Idempotency

Every automatic award needs a durable unique source reference. `Transaction.reason` alone is insufficient.

Options:

- add generic transaction reference/idempotency fields; or
- create `Birthday2026ActivityAward` with a unique source key and credit the wallet in the same transaction.

Reprocessing messages, jobs, or interactions must not duplicate Pasza.

## Spawned encounters

Spawned encounters are a central source of moment-to-moment play.

### Lifecycle

1. The persistent message queue schedules a spawn.
2. The bot selects an enabled encounter definition using configured weights.
3. It sends an initially disabled/preparing message if needed.
4. It persists the spawn, Discord message IDs, start time, and expiry.
5. It schedules the expiration/resolution job in the same transaction.
6. It edits the live button or input prompt into the message.
7. Interactions are persisted with uniqueness constraints.
8. Progress and winners are claimed atomically.
9. The message is updated as progress changes.
10. Expiration disables input, distributes unresolved rewards, and schedules the next spawn.

Scheduling must survive process restarts. Avoid using an in-memory `setInterval` as the authoritative scheduler.

### Encounter types

#### Quick grab

Example:

> A sack of corn fell off a cart. First eligible person to grab it wins 10 Pasza.

Rules:

- one global winner;
- small reward;
- atomically set `winnerUserId` only while it is null;
- an individual quick-win cap prevents one person from claiming every spawn.

#### First team threshold

Example:

> The feed cart is stuck in mud. Three distinct members of one team must pull it free.

Rules:

- one participation per user;
- the first team to reach the configured distinct-member threshold wins;
- participating members may receive a small personal reward;
- the winning team receives a power-up, upgrade resource, feed batch, or score-neutral collectible.

#### Parallel team threshold

Every team can complete the threshold before expiry.

Recommended reward curve:

- first team: full reward plus a power-up chance;
- later teams: smaller but still meaningful reward;
- incomplete teams: participation reward only, if any.

This keeps a spawn useful after the first team finishes.

#### Global cooperative threshold

Every team must supply a small number of distinct participants. Completion grants a server-wide reward, special artwork, or temporary event modifier.

This gives the event cooperative moments without affecting which pig ultimately wins.

#### Prompt or puzzle

Instead of pure click speed, ask users to:

- send an exact phrase;
- choose the correct feed from several buttons;
- solve a short riddle;
- reproduce an emoji sequence;
- coordinate different buttons across several teammates.

Message-based winners require an atomic claim path equivalent to button-based winners.

#### Random draw among responders

For some encounters, collect eligible responses for 15-30 seconds and randomly choose a winner. This gives a broader set of active participants a chance while retaining urgency.

### Atomic resolution

Recommended persistence:

- unique `(spawnId, userId)` participation;
- unique `(spawnId, teamId)` progress row;
- nullable global `winnerUserId` or `winnerTeamId` claimed through a conditional update;
- `completedAt` claimed only once;
- rewards and claim state committed together;
- a unique reward reference preventing retry duplication.

For a three-person threshold, two nearly simultaneous third/fourth clicks must not award the team twice.

### Anti-monopoly controls

Use a mix of:

- daily or rolling cap on personal quick wins;
- larger rewards for distinct-member thresholds than first-click events;
- randomized responder draws;
- encounters at varied hours;
- per-user participation uniqueness;
- maximum reward contribution from spawns per user;
- diminishing reward after consecutive wins by one team;
- trailing-team assistance only if data shows it is necessary;
- short and long encounter durations so the same availability pattern does not win everything.

Do not use online presence as the only threshold input; Discord presence is unreliable and may be intentionally hidden.

## Social layer

The social layer should create conversation and shared stories without adding an unbounded second economy. The coding order does not require staggered player-facing availability; selected mechanics may all be available from the event start. The detailed proposal and content cadence live in the [social and live-ops plan](birthday-2026-social-live-ops.md).

**Recommended launch mechanics:**

- a preseason, staff-curated pig naming ballot for each team;
- a first-meal roll call that recognizes each distinct feeder without multiplying their Pasza;
- one daily team contract based on distinct members completing already-supported actions;
- visible assist credit for threshold encounters;
- a non-binding team pulse poll before the captain selects a permanent upgrade;
- cosmetic postcards, stickers, or pig facts from selected encounters;
- a daily barn newspaper that highlights participation, milestones, captain choices, and raid stories rather than only the leading score;
- a score-neutral cooperative keepsake encounter after competitive scoring locks.

Social rewards should normally be recognition, cosmetics, a small system-funded team batch, or a power-up chance. They must not enable direct Pasza transfers, public bounties on individuals, mandatory attendance streaks, or repeated personal targeting.

Prefer derived progress where the underlying action is already persisted. Ballots, guestbook entries, daily contract assignment/completion, and collectible ownership need durable event records if included. All free-text identity or guestbook content must be reviewable, optional, and independently disableable.

## Captain and team power-ups

There is one captain and no deputy.

Team members earn temporary power-ups from encounters and the captain chooses when to activate them.

### Recommended power-up inventory

Each team can store a small hand, for example three power-ups. Additional rewards may require using/discarding an existing power or may be converted into a smaller fallback reward.

Potential powers:

| Power-up | Effect |
|---|---|
| Lock the sty | Blocks or weakens the next raid during a limited window |
| Turbo digestion | Immediately digests a capped amount of exposed feed |
| Warehouse map | Improves the next personal or coordinated raid |
| Counterattack | Enables recovery of part of a recent theft |
| Golden trough | Protects newly fed Pasza for a limited time |
| Feed delivery | Opens a team-only claim encounter |

Potential commands:

```text
/tucznik moce
/tucznik aktywuj moc:<power-up>
```

Powers should be situational rather than unconditional permanent production multipliers. Activation and expiration should be visible in the public/team status log.

If the captain becomes unavailable, staff can replace them through an admin command.

## Permanent upgrades

Permanent upgrades are distinct from temporary power-ups.

**Recommended:** the pig reaching configured weight milestones grants a small number of upgrade points. The captain selects the upgrade, unless the design later chooses a team vote.

Possible branches:

- `Spichlerz`: raises protected personal feed or reduces raid loss.
- `Solidne koryto`: shortens digestion or protects more of each batch.
- `Płot pod napięciem`: improves raid defence and failed-raid consequences.
- `Wytrychy`: improves offensive raid odds or caps.
- `Dzwonek obiadowy`: improves encounter or team feeding utility.

Avoid large permanent feed-production multipliers because they compound an early lead.

Milestones should also reveal progressively larger, stranger, or more decorated pig artwork, adapting the Easter stage/status mechanism.

## Theft and raids

Theft must create interaction without enabling personal harassment or erasing permanent work.

### Recommended safeguards

- Permanent pig weight is never stealable.
- The first portion of a user's loose feed is protected.
- Only a configured fraction of a feed batch is exposed.
- A user has a maximum loss over a rolling or daily window.
- A recently attacked user receives temporary protection.
- New participants receive a grace period.
- Attackers choose an enemy team; the bot normally chooses an eligible victim.
- The same victim cannot be repeatedly selected.
- Failed attempts consume a charge and may transfer a small penalty to the defender.
- All material transfers are recorded and idempotent.
- Event-controlled theft conditionally debits its source balance inside the same transaction that records and credits the result.

### Individual theft

**Proposed:** users earn raid tickets or charges through activity/encounters. A limited command attempts to steal exposed Pasza from a bot-selected member of a chosen enemy team.

```text
/tucznik ukradnij drużyna:<team>
```

The ticket/charge should live in Birthday member state unless it is deliberately a tradeable inventory item.

### Coordinated team raid

**Proposed:** a captain power-up can open a short team raid. Distinct team members join via a button, and the raid resolves once or at expiry. The defender may respond with an appropriate stored power.

This provides captain-versus-captain interaction without allowing a captain to attack continuously.

### Catch-up behavior

Possible, but not yet agreed:

- slightly better raid value against the current leader;
- reduced reward for attacking last place;
- protection against several teams dogpiling the same target;
- delayed or approximate rankings to reduce focus fire.

Any catch-up modifier must be explicit to participants.

## Optional asymmetric player

The known highly active user may opt into a public fifth role such as `Dziki Knur`.

If included, recommended constraints are:

- separate personal victory condition that can coexist with a team victory;
- daily/rolling action energy cap;
- rotating contracts that discourage targeting one team repeatedly;
- better progress for varied targets or the current leader;
- a visible `Trop`/heat meter and team counterplay;
- maximum total influence on the main scores;
- most personal progress comes from completing varied sabotage objectives rather than destroying feed.

Example side victory:

> Complete contracts against all four teams and reach the required Chaos before the event ends.

This feature should be postponed until the four-team economy is balanced and may be omitted from the first release.

## Event pacing

For an approximately seven-day event, a possible structure is:

### Opening

- Join or assign teams.
- Announce captains.
- Let teams name their pigs if desired.
- Explain feeding and encounters.
- Consider a short theft-free grace period.

### Main event

- Passive Pasza awards.
- Random encounters throughout configured hours.
- Feeding and digestion.
- Permanent milestone upgrades.
- Personal theft and coordinated team raids.
- Captain power-up activations.

### Finale

Still open. Options include:

- disable theft for the final 12-24 hours;
- keep theft but lower its cap;
- lock new raids shortly before scoring;
- automatically settle every wallet and feed batch at a published cutoff;
- end with a cooperative final encounter.

The rules must prevent hoarding Pasza until a protected final phase from becoming the dominant strategy.

### Results

Primary winner:

- team with the greatest permanent pig weight.

Possible individual awards:

- most feed personally digested;
- most encounter participation;
- most successful or valuable theft;
- most raids blocked;
- funniest failed theft;
- optional `Wróg Publiczny #1` asymmetric-player result.

Personal awards should not change the team score after the event ends.

## Suggested command surface

Player commands:

```text
/tucznik dolacz
/tucznik info
/tucznik status
/tucznik nakarm
/tucznik ukradnij
/tucznik historia
/tucznik ranking-druzyny
/tucznik ranking-userzy
/tucznik moce
/tucznik aktywuj
```

Captain-only behavior should be enforced inside relevant handlers rather than exposed as a completely separate command group.

Admin commands should cover:

- configure dates, timezone, channels, caps, and spawn schedule;
- create/remove teams;
- move/remove members;
- appoint/replace captain;
- configure stages/artwork;
- enable/disable encounter definitions;
- force-spawn and cancel an encounter;
- grant/revoke Pasza or power-ups with an audit reason;
- inspect unresolved feed batches and event jobs;
- pause/resume earning, feeding, encounters, or theft independently;
- force final settlement;
- recalculate display state without duplicating rewards.

## Pig status channels and feed buttons

Each pig has its own dedicated status channel, following the Easter team-status pattern. The bot maintains one canonical status message in each channel and recreates it if it is deleted.

The four channels should be readable by all event participants so members can visit and interact with every pig. Ordinary posting permissions may remain team-specific or bot-only; the interactive status message itself is public to the event.

Each canonical status message includes a `Nakarm tucznika` button. Clicking it opens an amount picker/modal or applies a clearly displayed fixed amount, depending on the final feeding UX.

### Feeding your own pig

When the clicked pig belongs to the member's team:

1. Validate event state and membership.
2. Validate the member's personal Pasza balance.
3. Atomically debit their personal wallet.
4. Credit their team's Pasza wallet and create the feed batch/contribution.
5. Update the status message and reply ephemerally with the amount and digestion time.

The button and `/tucznik nakarm` command call the same service and enforce the same invariants.

### One-time foreign feeding and public shame

Every member may intentionally feed a pig belonging to another team exactly once across the entire event.

When a member clicks a rival pig's feed button:

1. Clearly show that the action feeds the rival and consumes the member's own Pasza.
2. Require a configured fixed amount or an explicit confirmation so the betrayal is deliberate.
3. Atomically debit the member, credit the rival team wallet, create a rival feed batch, and record the one-time action.
4. Post a humorous shame message in the member's home pig/team channel, for example:

   > HAŃBA! @User dokarmił tucznika drużyny @Rivals zamiast naszego. Zapamiętamy to przy podziale boczku.

5. Optionally post a celebratory message in the rival pig's channel.
6. Count the amount separately as `foreignFeed`; do not present it as a normal contribution to the member's home team.

The uniqueness rule is one foreign feeding per member for the whole event, not once per rival team. Discord cannot disable the shared button for only one viewer, so repeated attempts are rejected ephemerally by the handler.

The shame is cosmetic: the member loses only the Pasza they knowingly donated and receives no moderation penalty or role restriction.

## Status message contents

Each team status message should show at least:

- pig name and current artwork;
- permanent weight;
- next milestone and progress;
- captain;
- number/summary of stored power-ups;
- active timed effects;
- current vulnerable trough amount, if public;
- recent team actions;
- top contributors.

The message also contains the feed button and identifies whether the viewer is looking at their own or a rival pig through the interaction response.

The global status should show:

- team ranking;
- event phase and end time;
- next or currently active encounter;
- concise feeding/theft rules;
- links or commands for more detail.

Decide whether exact vulnerable balances are public. Public precision enables strategic targeting; hidden or approximate values reduce harassment and optimisation.

## Candidate data model

Names are illustrative.

### `Birthday2026Config`

- guild ID;
- event start/end;
- timezone;
- current phase or independent feature toggles;
- Pasza currency ID;
- encounter channel/status channel IDs;
- spawn scheduling bounds;
- earning caps;
- theft settings;
- final-settlement settings.

### `Birthday2026TeamConfig`

- generic `Team` relation;
- Discord role;
- dedicated pig status channel ID and canonical status message ID;
- optional team discussion/log channel ID if it differs from the pig status channel;
- captain user ID;
- pig name, color, current weight;
- active upgrade levels;
- stored power-up limit;
- active effect timestamps.

Add a Birthday relation to the generic `Team` model rather than overloading `Easter2026TeamConfig`.

### `Birthday2026TeamWallet`

- one-to-one team configuration relation;
- Pasza currency ID;
- current undigested/trough balance;
- created/updated timestamps;
- wallet transactions.

All debits must be conditional on sufficient balance. The team-wallet balance must equal the sum of unresolved feed-batch/reward balances, unless the design explicitly introduces another liquid team source.

### `Birthday2026TeamWalletTransaction`

- team wallet;
- positive amount plus debit/credit entry type;
- reason and source type/source ID;
- related personal economy transaction where applicable;
- related feed batch, encounter, raid, or digestion job where applicable;
- created timestamp;
- unique idempotency/source constraint.

### `Birthday2026MemberState`

- user/team relation;
- event join time;
- protected/grace timestamps;
- activity/feed contribution totals;
- encounter and quick-win counters;
- raid charges, attempts, wins, losses, and cooldowns;
- rolling/daily loss accounting.

A dedicated event membership/state row is safer than relying only on application-level checks over generic `TeamMember`, particularly under concurrent joins.

### `Birthday2026FeedBatch`

- owner user ID;
- team and team-wallet IDs;
- original and remaining amount;
- exposed/stolen amount;
- created/digest timestamps;
- digested/cancelled state;
- unique source/idempotency reference.

### `Birthday2026ForeignFeed`

- feeding user ID with a unique constraint for the entire event;
- member's home team ID;
- recipient team ID;
- amount;
- personal and team wallet transaction references;
- feed batch ID;
- shame-message ID if one was posted;
- created timestamp.

### `Birthday2026Stage`

- team configuration;
- required weight;
- artwork URL;
- completion timestamp;
- optional upgrade point reward.

### `Birthday2026EncounterDefinition`

Definitions may be code-based initially. If admin configurability is needed, persist:

- encounter type;
- weight/enabled state;
- duration;
- thresholds;
- reward specification;
- content/artwork;
- scheduling restrictions.

### `Birthday2026EncounterSpawn`

- definition/type;
- guild/channel/message;
- state;
- spawned/expiry/resolved timestamps;
- global winner user/team;
- payload or generated configuration;
- queued-job identity.

### `Birthday2026EncounterParticipation`

- spawn/user/team;
- timestamp;
- submitted choice/input where applicable;
- reward status;
- unique `(spawnId, userId)`.

### `Birthday2026EncounterTeamProgress`

- spawn/team;
- distinct participant count or derived status;
- completion rank/time;
- reward status;
- unique `(spawnId, teamId)`.

### `Birthday2026TeamPowerUp`

- team;
- power type;
- quantity or individual instance;
- earned source;
- earned/activated/expired timestamps;
- activating captain;
- target where applicable.

### `Birthday2026Raid`

- attacker user/team;
- selected target team and resolved victim;
- raid type;
- timestamps/status;
- success roll inputs and output;
- amount moved;
- related feed batch/wallet transaction references;
- idempotency key.

### `Birthday2026ActivityAward`

- user;
- source type and source ID;
- amount;
- timestamp/day bucket;
- related wallet transaction;
- unique source constraint.

### Optional social records

If the recommended social mechanics are accepted, persist only the state that cannot be derived safely:

- a changeable team ballot with one current vote per member and a published lock time;
- one configured daily team contract plus per-team completion/reward state;
- cosmetic collectible ownership or unlock state;
- optional moderated guestbook entries and public-display approval.

First-meal roll calls, encounter assists, captain choices, and newspaper statistics should be derived from canonical feed, participation, power-up, and upgrade records rather than copied into a second counter when practical.

## Concurrency and recovery requirements

- Personal and team wallet debits use conditional mutations that fail when the current balance is insufficient.
- Every Discord interaction can be safely retried.
- Every message-queue job can run more than once without duplicating effects.
- Joining cannot create multiple Birthday memberships.
- Encounter winners are claimed atomically.
- Team threshold rewards are issued once.
- Feed batches digest once.
- Theft moves a conserved amount exactly once.
- Power-ups activate once and cannot be double-spent by repeated clicks.
- A member can complete foreign feeding at most once, even if several button interactions arrive concurrently.
- Status-message failure does not roll back game state; it can be reconciled later.
- Restart recovery finds active encounters, scheduled digestion, and unresolved final settlement.

Use database uniqueness and conditional state transitions as the authority. An in-process lock can improve user experience but must not be the only correctness mechanism.

## Implementation strategy

Implementation should follow the [implementation slices](birthday-2026-implementation-slices.md). These are coding milestones, not player-facing chapters:

1. settle blocking decisions and measure prior activity;
2. build the event shell;
3. prove one complete Pasza-to-weight path;
4. complete earning, feeding, status, and rankings;
5. implement settlement, results, and staff operations;
6. add individual and team encounters;
7. add captain choices and optional social polish;
8. add raids only as stretch scope.

The first five items form the minimum shippable event. Feeding and permanent weight remain a complete competition even if encounters, captain mechanics, social extras, or raids are cut.

Incomplete features should remain unreachable while being developed, but the plan does not assume gradual activation during the live event. Prefer finishing and rehearsing the selected scope before the common event launch.

Calibration is continuous rather than a final phase:

- analyse Easter activity percentiles and hourly distribution before setting values;
- simulate earnings, feeding, encounters, and theft before enabling their slices;
- test team imbalance and late joins;
- load-test popular encounter buttons;
- test restarts, duplicate jobs, and reconciliation;
- rehearse emergency pause and final settlement before the event starts.

The optional asymmetric player remains a later experiment and is not a dependency of the minimum event or any other implementation slice.

## Questions before solidifying the design

The Must-ship decisions needed for Slices 1-4 are resolved in [Slice 0 decisions and measurement](birthday-2026-slice-0-decisions.md). The list below is retained as the wider design backlog; questions about raids, captain upgrades, encounter variety, and optional social mechanics do not block the event shell or core feeding competition.

### Blocking product questions

1. What are the exact start/end dates and authoritative timezone? Should spawned encounters run overnight or only during configured guild-active hours?
2. Is participation opt-in, automatic for existing members, or automatic only for members active during registration?
3. How are teams balanced: headcount, recent activity estimates, captain draft, or another method?
4. Does feeding create a timed vulnerable batch as recommended? Can thieves target loose wallet Pasza, trough Pasza, or both?
5. What happens to unspent wallet Pasza and undigested batches at the event cutoff?
6. Who chooses captains, and can a captain voluntarily transfer leadership without staff intervention?
7. Does the captain select permanent upgrades alone, or should the team vote while the captain breaks ties?
8. Are exact team weight, wallet balances, and vulnerable feed public, approximate, or private?

### Activity and balance questions

9. Which activity sources count: messages, voice, streams/video, reactions, daily tasks, or only selected sources?
10. Should Pasza be awarded immediately per qualifying action, periodically in batches, or through a claim command?
11. What behavior should bonus channels encourage, and how will low-quality spam be excluded?
12. Should late joiners receive any starter Pasza or simply begin earning from their join time?
13. Is team score raw total weight, or should it be normalized if team populations diverge?

### Encounter questions

14. Roughly how many encounters should a participant expect to see per day?
15. Should encounters ping team/event roles, post silently, or use an opt-in notification role?
16. For three-member thresholds, does the first team take everything, or can every team complete for decreasing rewards?
17. How much of total expected Pasza should come from encounters versus passive activity?
18. Do we want message/puzzle events at launch, or only buttons for the first version?
19. Should quick-event winners have a hard daily cap, diminishing rewards, or temporary ineligibility after a win?

### Captain and power-up questions

20. How many power-ups can a team store, and do unused powers expire?
21. Can a captain discard or exchange an unwanted power-up?
22. Should power-ups be publicly visible to enemies or hidden until activated?
23. Can captain actions directly affect an enemy, or only empower their own team's next raid/defence?
24. How frequently should an active team earn a captain decision: about two, four, or more times per day?

### Theft questions

25. Should attackers select only a team while the bot selects the victim, as recommended?
26. What is the maximum acceptable loss from one raid and from an entire day?
27. Are stolen resources transferred intact, partially destroyed, or placed into another vulnerable batch?
28. Should a failed thief pay feed to the victim, merely lose a ticket, or expose their team to a counterattack?
29. Should the final hours disable theft, reduce it, or keep it unchanged until cutoff?
30. Are voluntary Pasza transfers between teammates allowed? The recommendation is no for the first version.

### Event identity and rewards

31. Are the four pig/team names predetermined, chosen by captains, or voted on by team members?
32. What artwork is available, and how many pig evolution stages can be produced?
33. Are prizes purely Discord titles/roles/badges, or are existing economy rewards involved?
34. Is the `Dziki Knur` asymmetric player wanted for launch, and has the intended user explicitly opted in?
35. Should the event end with only a competitive result or also a guild-wide cooperative birthday milestone?
36. Should the status-message feed button use a fixed amount, open an amount modal, or offer several buttons such as `10`, `50`, and `all`?
37. How much Pasza does the one-time rival feeding consume, and should the shame announcement appear only in the member's home pig channel or in both teams' channels?

## Recommended next design session

Resolve questions 1-8 first. Those answers determine the schema and core state transitions. Then use Easter 2026 data to answer the numerical parts of questions 9-19. Theft percentages, power-up strength, and the optional asymmetric player should be finalized only after a simple economy simulation shows the expected one-week score distribution.
