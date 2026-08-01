# Birthday 2026: implementation slices

Status: recommended delivery plan  
Parent design: [birthday-2026-event.md](birthday-2026-event.md)  
Goal: build the event in small, mergeable vertical slices while keeping a coherent version ready if optional mechanics do not fit the schedule

## What these slices are

These are coding milestones, not player-facing event phases. All mechanics selected for Birthday 2026 may be enabled together when the event starts.

Each slice should:

- leave the bot buildable and existing features unaffected;
- include the persistence, service, Discord interface, and tests needed for one usable path;
- be safe to merge without unfinished buttons or commands becoming publicly usable;
- have an explicit stop point and a smaller fallback;
- avoid depending on a later optional slice.

The delivery order prioritizes a complete event over maximum scope:

```text
Complete feeding event
    -> encounters and broader participation
        -> captain strategy and social polish
            -> raids and advanced mechanics
```

If the schedule slips, cut from the bottom of that sequence.

## Scope tiers

### Must ship: complete feeding event

- configuration, teams, captains, membership, and permissions;
- Pasza currency and idempotent earning;
- personal and team wallets;
- feeding, digestion, permanent pig weight, and rankings;
- status channels/messages and at least a graceful pig visual;
- event start, cutoff, settlement, results, and staff controls.

This is a full event, not a technical demo. Four teams can compete for a week and produce a defensible winner without encounters, power-ups, or raids.

### Should ship: participation and encounters

- persistent encounter scheduling;
- one quick individual encounter;
- one distinct-member team encounter;
- assist credit and anti-monopoly controls;
- the one-time rival feed/shame action;
- one lightweight daily team contract if time permits.

This is the recommended product target because it adds social breadth without making the economy much harder to reason about.

### Could ship: team strategy and social depth

- captain power-up inventory and activation;
- one or two power-ups that work without raids;
- permanent milestone upgrade choice;
- non-binding team poll;
- cosmetic collectibles and daily recap.

### Stretch: adversarial mechanics

- individual raids;
- defensive powers and counterplay;
- coordinated raids;
- optional asymmetric `Dziki Knur` role.

Raids are deliberately last. They have the largest concurrency, balance, moderation, and audit surface, while the event remains coherent without them.

## Slice 0: decisions and measurement

**Outcome:** implementation can begin without inventing economic rules in handlers.

Working decision record: [birthday-2026-slice-0-decisions.md](birthday-2026-slice-0-decisions.md)

**Status:** complete.

Do:

- resolve event dates, timezone, registration behavior, team balancing, cutoff, and settlement;
- query Easter 2026 activity distributions;
- decide the initial Pasza sources and caps;
- select the feed lifecycle and digestion timing;
- write example score budgets for an ordinary, active, and extreme participant;
- identify the minimum artwork set and graceful placeholder;
- choose the Must/Should/Could/Stretch cutoff for the first estimate.

Do not block the whole project on:

- exact raid values;
- the complete power-up catalog;
- coordinated raids;
- the asymmetric player.

Done when:

- the Must-ship state transitions have no unresolved product question;
- illustrative values are good enough to implement behind configuration;
- the event can end deterministically.

Fallback:

- use conservative configurable values and omit every Stretch mechanic.

## Slice 1: event shell

**Outcome:** staff can configure an invisible Birthday event, create teams, assign members and captains, and inspect its state.

**Status:** complete. The schema, core event/team services, and private staff interface
are implemented; no player-facing Birthday command is registered yet.

Implement:

- `Birthday2026Config`;
- Birthday relation for generic teams;
- `Birthday2026MemberState`;
- event registration and date/time checks;
- staff configuration, team assignment, and captain replacement;
- event-wide visibility/enabled state;
- empty status command restricted to staff or test guild while incomplete;
- unique membership and team invariants.

Tests:

- duplicate joins or assignments do not create duplicate state;
- a member cannot belong to two Birthday teams;
- captain replacement preserves the team;
- event date and timezone boundaries are correct;
- public users cannot reach incomplete handlers.

Stop point:

- not a playable event, but a safe merged foundation with no public surface.

Avoid:

- building raid or encounter tables “just in case”;
- copying Easter configuration fields that Birthday does not need.

## Slice 2: one complete Pasza-to-weight path

**Outcome:** a staff-granted Pasza amount can be fed and becomes permanent weight exactly once.

Implement vertically:

1. create or resolve the event-owned Pasza currency;
2. credit a participant wallet through an audited staff/test source;
3. feed the participant's home pig;
4. atomically debit the personal wallet and credit the team wallet;
5. create a feed batch;
6. digest it through a persistent queued job;
7. debit the team wallet and increment permanent weight;
8. show the result in one basic status response.

Include:

- personal wallet transaction reference;
- event-owned team wallet and immutable transaction history;
- unique source/idempotency constraints;
- conditional debits;
- restart-safe digestion;
- a reconciliation query for team wallet versus unresolved batches.

Tests:

- retrying feed or digestion does not duplicate value;
- concurrent attempts cannot overspend;
- the amount is conserved across personal wallet, team wallet, batch, and weight;
- a restarted worker completes due digestion once;
- status failure does not roll back game state.

Stop point:

- an end-to-end economic walking skeleton, testable without automatic activity awards.

Fallback:

- if timed digestion proves too risky and product agrees, use an explicitly configured immediate-digestion mode while retaining the same ledger boundary.

## Slice 3: minimum playable event

**Outcome:** members can earn Pasza from normal activity, feed their pig, see progress, and reach a final result.

Implement:

- idempotent qualifying activity awards;
- daily caps and diminishing returns;
- `/tucznik info`, balance/history, feed, status, and rankings;
- canonical pig status messages and recovery after deletion;
- feed-button routing through the same service as the command;
- permanent artwork milestones;
- registration/join UX if participation is opt-in;
- disabled-channel and staff adjustment behavior.

Add breadth-focused social details that are cheap because the data already exists:

- first-meal roll call derived from feed records;
- distinct contributor count;
- milestone announcements;
- captain and pig identity in status.

Tests:

- reprocessed activity does not award twice;
- caps hold across concurrent activity;
- command and button feeding enforce identical rules;
- status reconciliation does not change score;
- permissions work for participant, captain, staff, and non-participant.

Stop point:

- the core competition is playable, but do not call the project launch-ready until Slice 4 closes the operational loop.

Fallback:

- omit first-meal presentation and use static artwork; earning, feeding, and rankings remain intact.

## Slice 4: event closure and operations

**Outcome:** the minimum event can safely start, run, pause, finish, and publish reproducible results.

Implement:

- independent pause controls for earning and feeding;
- cutoff behavior for unspent Pasza and undigested batches;
- idempotent final settlement;
- atomic final score lock;
- team winner and agreed individual awards;
- results regeneration from locked state;
- reconciliation and unresolved-job diagnostics;
- staff runbook and emergency adjustment audit trail.

Tests:

- settlement run twice produces the same result;
- inputs cannot change a locked event;
- tie behavior follows the published rule;
- unresolved batches follow the configured cutoff policy;
- restart during settlement is recoverable;
- result regeneration cannot choose a different winner.

Stop point: **minimum shippable event**.

At this point it is reasonable to freeze optional development if the remaining calendar is needed for balancing, artwork, or operational rehearsal.

Fallback:

- pause all inputs, run the rehearsed settlement command, and delay the announcement rather than manually editing scores.

## Slice 5: first encounter end to end

**Outcome:** one persisted quick encounter can spawn, accept participation, resolve, reward, expire, and schedule the next spawn.

Implement only the framework required for one encounter:

- persisted definition or code definition;
- spawn/message record;
- persistent scheduling and expiration jobs;
- one interaction per user;
- atomic winner claim;
- idempotent reward;
- live message update and disabled expired state;
- force-spawn, cancel, and inspect commands.

Recommended first type:

- random draw among responders for a short window, or quick grab with a strict per-user win cap.

A random draw is socially fairer; quick grab is mechanically simpler. Choose one, complete it, and avoid generalizing prematurely.

Tests:

- simultaneous clicks award once;
- restart does not lose expiration or schedule two next spawns;
- reward retries do not duplicate Pasza;
- a deleted Discord message leaves recoverable persisted state;
- the anti-monopoly cap is enforced atomically.

Stop point:

- the event now has moment-to-moment activity; all encounter code can still be disabled without affecting feeding.

Fallback:

- disable new spawns and let the feeding event continue.

## Slice 6: team encounter and daily contract

**Outcome:** distinct teammates have a reason to coordinate, including asynchronously.

Implement:

- per-team progress for one threshold encounter;
- unique member participation;
- first-team or parallel-team completion, based on the selected design;
- visible assist credit;
- bounded team reward;
- optionally, one daily contract using already-persisted actions.

Keep the first daily contract derived and simple, such as:

- a configured number of distinct members feed; or
- a configured number of members participate in encounters.

Do not build a generic quest engine unless several confirmed contract types require it.

Tests:

- the third and fourth simultaneous clicks cannot reward twice;
- repeated clicks do not increase distinct-member progress;
- thresholds scale or are configured fairly for team size;
- contract completion and reward are idempotent;
- later teams can still interact when using parallel completion.

Stop point: **recommended shippable event**.

Fallback:

- ship the individual encounter only, or omit daily contracts while retaining the team threshold.

## Slice 7: captain choice

**Outcome:** a team can earn one useful power-up, the captain can activate it once, and its effect expires safely.

Implement:

- capped team power-up inventory;
- one earning source;
- captain-only activation;
- one timed or immediate effect;
- status/action log;
- staff captain replacement;
- optional non-binding team poll.

Start with a power that does not depend on raids:

- turbo digestion;
- golden trough protection for newly fed Pasza;
- team-only feed delivery encounter.

Add permanent upgrades only after the first power-up path works. Start with one milestone, one choice, and no production multiplier.

Tests:

- repeated activation cannot double-spend inventory;
- expiration reconciles after restart;
- captain replacement does not lose or duplicate powers;
- a poll cannot block the configured default or captain decision;
- an upgrade applies once.

Stop point:

- captain strategy is present without the adversarial complexity of raids.

Fallback:

- convert power-up rewards to a published small team batch or cosmetic reward.

## Slice 8: social polish

**Outcome:** existing actions create a richer story without changing the core economy.

Choose only the highest-value items from the [social and live-ops plan](birthday-2026-social-live-ops.md):

- curated pig naming ballot;
- cosmetic barn collection;
- daily barn newspaper;
- guestbook or cooperative finale keepsake;
- limited canned cheers.

Implementation rule:

- derive summaries from canonical feed, encounter, and captain records;
- persist only ballot state, approved free text, or collectible ownership that cannot be derived;
- keep cosmetics and recognition score-neutral.

Stop point:

- the event has more personality and recap material, but none of this is required for a valid winner.

Fallback:

- use staff-curated names, static recap copy, and no free-text input.

## Slice 9: individual raid

**Outcome:** one limited raid command moves an auditable, bounded amount of vulnerable Pasza exactly once.

Implement:

- raid charges;
- enemy team selection;
- bot-selected eligible source/victim;
- protected floors, loss caps, grace, cooldown, and anti-repeat targeting;
- conditional source debit and atomic destination credit;
- result history and staff audit view;
- independent raid disable control.

Do not implement coordinated raids in this slice.

Tests:

- permanent weight is never eligible;
- value is conserved under retries and concurrency;
- the same member cannot exceed loss or targeting caps;
- failed raids consume the configured charge exactly once;
- every transfer is explainable from audit history;
- disabling raids does not affect earning, feeding, or encounters.

Stop point:

- a conservative, testable adversarial mechanic that can still be cut entirely before launch.

Fallback:

- leave raids disabled and keep any raid-specific powers out of the reward pool.

## Slice 10: advanced stretch mechanics

Consider only after the previous slices are stable and simulated:

- coordinated team raids;
- defensive response windows;
- counterattacks;
- puzzle and multi-button encounters;
- additional upgrade branches;
- asymmetric `Dziki Knur`.

Each one needs its own vertical slice and stop point. Do not group them into one “finish advanced mechanics” task.

## Recommended delivery checkpoints

| Checkpoint | Included slices | Delivery confidence |
|---|---|---|
| Economic skeleton | 0-2 | Core transactions proven |
| Minimum playable | 0-3 | Week-long feeding race works |
| Minimum shippable | 0-4 | Event can be operated and closed |
| Recommended target | 0-6 | Encounters add broad participation |
| Rich target | 0-8 | Captain choices and social identity |
| Stretch target | 0-10 | Raids and advanced mechanics |

Estimate and track the project against **Minimum shippable** first. Treat every checkpoint above it as separately negotiable scope.

## Definition of done for a slice

- schema and migration contain only the state required by that slice;
- core service owns invariants rather than Discord handlers;
- commands and buttons call the same service path;
- retries and concurrent interactions are tested;
- staff can inspect and reconcile the new state;
- incomplete UI is unreachable;
- the feature can be disabled without corrupting earlier slices;
- documentation states the next safe stop point;
- no later optional mechanic is required for the slice to make sense.

## Suggested task breakdown inside a slice

Keep pull requests small where practical:

1. schema and migration;
2. service and invariant tests;
3. Discord command/button or queued-job adapter;
4. status presentation and staff diagnostics;
5. concurrency, restart, and reconciliation tests.

The vertical slice is complete only after the full path works. A merged schema alone is progress, but not a delivery checkpoint.
