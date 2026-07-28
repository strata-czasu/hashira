# Birthday 2026: social and live-ops plan

Status: recommended companion plan  
Parent design: [birthday-2026-event.md](birthday-2026-event.md)  
Implementation: [birthday-2026-implementation-slices.md](birthday-2026-implementation-slices.md)

## Purpose

The social layer should make members feel seen, give teams reasons to talk, and create stories beyond the raw leaderboard. It should not create an unbounded second economy, force constant availability, or turn rivalry into personal targeting. These mechanics do not need to unlock in stages; selected mechanics can be present from the common event start.

## Social design rules

- Reward distinct participants and coordination more often than speed or volume.
- Give non-winners visible credit for assisting.
- Keep cosmetic recognition separate from permanent fictional Tucznik weight.
- Use only consenting human Tucznicy and approved names, mentions, likenesses,
  titles, and artwork.
- Treat displayed weight as a team-owned game score, never as commentary on the
  represented person's real body.
- Use team-selected or bot-selected targets; avoid public bounties on individual members.
- Prefer daily digests over a ping for every action.
- Give asynchronous players a meaningful action in each 24-hour period.
- Keep free-text inputs curated, reviewable, or optional.
- Do not introduce direct Pasza gifting in the first release.

## Recommended launch set

These mechanics fit naturally around the core event and mostly reuse actions already being persisted. Their implementation priority is defined in the implementation-slices plan.

### Human Tucznik persona ballot

During registration, each team votes on a title, costume/persona, motto, crest,
or emoji for its consenting human Tucznik from a staff- and subject-approved
shortlist. The represented person may veto any option before it becomes public.

Score impact: none.  
Why it helps: creates team conversation before grinding starts.  
Guardrail: one changeable ballot per member, locked before scoring.

### First-meal roll call

The first time a member feeds their own human Tucznik persona, their name is
added to that day's or the event's feeder roll call.

Score impact: only the Pasza actually fed.  
Why it helps: recognizes breadth without inventing a multiplier.  
Guardrail: do not expose members who opted out of public recognition.

### Daily team contract

One simple contract is active per day and uses supported actions, such as:

- five distinct members feed;
- three distinct members finish an encounter;
- the team completes two parallel encounters;
- members collectively activate a team-only delivery opened by the captain.

Score impact: small system-funded team batch, power-up chance, or cosmetic collectible.  
Why it helps: creates a shared objective for asynchronous players.  
Guardrail: scale distinct-member thresholds to team size and provide a non-score fallback reward.

### Assist credit

Threshold encounter results list all eligible helpers, and contribution history counts assists separately from wins.

Score impact: no extra reward unless explicitly configured.  
Why it helps: the third click is not the only socially valuable click.  
Guardrail: one assist per user per spawn.

### Captain pulse poll

Before selecting a permanent upgrade, the captain can open a short non-binding team poll. The captain still makes the final choice.

Score impact: the chosen upgrade only.  
Why it helps: makes the captain role collaborative without creating slow governance.  
Guardrail: poll expiry and a default choice prevent blocking progress.

### Cosmetic barn collection

Some encounters award postcards, stickers, recipe fragments, or absurd fictional
Tucznik facts rather than Pasza. Team status shows set progress, and completed
sets appear in the final recap.

Score impact: none.  
Why it helps: encounters remain interesting without inflating the economy.  
Guardrail: collection rewards should not be tradeable in the first version.

### Barn newspaper

A scheduled digest summarizes:

- milestone reveals;
- highest participation breadth;
- notable encounter assists;
- captain choices;
- largest legal raid and best defence;
- funny bot-authored mishaps;
- the next relevant encounter window or event deadline.

Score impact: none.  
Why it helps: members who were offline can re-enter the story.  
Guardrail: celebrate several categories and rotate featured teams; do not publish vulnerable personal balances.

### Cooperative final keepsake

After competitive scoring locks, all teams contribute to one final birthday interaction that unlocks shared artwork, a server keepsake, or a guestbook montage.

Score impact: none after lock.  
Why it helps: ends a competitive week with a guild-wide success.  
Guardrail: state clearly that it cannot change the winner.

## Optional follow-ups

Add these only if the launch set is stable.

### Cheers

Members can send a limited canned cheer to a teammate after a milestone or encounter. Cheers appear in a digest and do not transfer Pasza.

Useful when: the guild wants more lightweight recognition.  
Risk: notification spam.  
Control: one or two cheers per day, no direct ping by default.

### Rival taunts

Teams choose from staff-written taunts after a raid or milestone.

Useful when: rivalry is friendly and culturally appropriate.  
Risk: escalation into personal harassment.  
Control: canned text only, team-targeted, cooldown, staff disable switch.

### Team prediction

Before an encounter resolves, members can make a score-neutral prediction such as which feed choice is correct. Correct predictions add cosmetic profile marks or recap statistics.

Useful when: puzzle encounters exist.  
Risk: a shadow progression system.  
Control: no Pasza or raid advantage.

### Coordinated raid

A captain opens a short participation window and distinct teammates join before resolution.

Useful when: individual raids are already stable.  
Risk: dogpiling and availability advantage.  
Control: limited charges, broad window, defence counterplay, and strict loss caps.

### `Dziki Knur`

The asymmetric player remains a separate experiment, not a normal implementation milestone. It needs an opt-in participant, independent win condition, influence budget, and its own balance simulation.

## Mechanics deliberately excluded from the first release

- unrestricted Pasza transfers or gifting;
- member-authored public bounties;
- stealing permanent fictional Tucznik weight;
- rewards based on invite spam, mass mentions, or reaction farming;
- mandatory streaks that punish missing a day;
- live presence requirements as the only way to qualify;
- public exact balances for individual theft targets;
- unlimited free-text taunts or shame messages.

## Default content rhythm

| Moment | Message purpose | Notification |
|---|---|---|
| Preseason reveal | approved silhouette, Tucznik teaser, or persona-ballot reminder | event channel; at most one daily ping |
| Rules reveal | explain selected launch mechanics and score impact | one event-role ping |
| Encounter | immediate participation opportunity | silent or opt-in encounter role |
| Milestone | celebrate team progress and reveal art | no broad ping |
| Daily digest | help offline members catch up | silent |
| Rule or health change | explain the change and effective time | event-role ping when competitively material |
| Finale countdown | publish raid, earning, feeding, and settlement cutoffs | one or two scheduled event-role pings |
| Results | winners, awards, and shared recap | one event-role ping |

Recommended notification ceiling:

- no more than one broad event-role ping per ordinary day;
- encounter notifications use a separate opt-in role;
- transactional team updates do not ping the whole team by default;
- emergency rule changes are exempt but must be rare and explicit.

## Draft hype sequence

The exact Polish copy can be written later. Hype happens around the event launch, not through staggered feature releases:

1. Strange noises and silhouettes appear before registration.
2. Teams discover their consenting human Tucznik and choose an approved title/persona.
3. A rules preview introduces the selected launch mechanics without revealing every encounter or artwork stage.
4. The troughs open and the configured event begins with all finished mechanics available.
5. Daily newspapers, milestones, and encounter copy keep the story alive during the week.
6. The kitchen closes, the final meal ends, and scores lock.
7. The guild completes one shared birthday moment.
8. The weigh-in and recap are published.

Do not tease a mechanic unless it is within the committed launch scope. A generic narrative clue is safer than promising an optional feature that may be cut.

## Content and asset checklist

Prepare before registration:

- four approved silhouettes/avatars and first-stage Tucznik persona images;
- title/persona shortlists and reserved approved defaults;
- human Tucznik/captain introduction prompt;
- rules summary and notification-role copy;
- opening, delay, pause, and cancellation messages.

Prepare before the event:

- milestone artwork or graceful placeholders;
- encounter copy variants;
- daily contract templates;
- power-up and upgrade descriptions;
- raid result and anti-harassment copy;
- daily newspaper template;
- final cooperative artwork;
- winner, tie, delayed-result, and recap templates.

Dynamic copy should render correctly when a team has no captain, the operational
captain differs from its Tucznik, an encounter has no winner, a raid moves zero
Pasza, or results are delayed.

## Moderation and safety

- Staff can disable guestbook entries, taunts, shame messages, and raid announcements independently from mechanics.
- Free-text Tucznik titles/personas, mottos, and guestbook entries follow normal
  guild rules and require review by staff and the represented person before
  appearing in canonical status.
- A human Tucznik may withdraw permission for a likeness or joke without changing
  team score; the status falls back to an approved text/avatar/silhouette form.
- Avoid real-weight claims, body alteration, and humour that depends on
  humiliating the represented person.
- Shame and raid messages describe the game action, not a member's character or real-life traits.
- Repeated targeting protections are enforced by the database, not by moderator judgment alone.
- A member may opt out of public personal awards while their team contribution still counts.
- Corrections use an auditable staff action and a public note if the change affects competitive state.

## Live health review

At least once per day, staff review:

- active members and distinct contributors per team;
- Pasza earned, fed, digested, stolen, and unspent;
- encounter participation and win concentration;
- daily contract completion by team;
- captain action frequency;
- raid victim concentration and protected losses;
- notification count;
- failed jobs, unresolved batches, and reconciliation drift;
- moderation reports or signs that social copy is landing badly.

Prefer changing future caps, spawn weights, or schedules at a published boundary. Never quietly rewrite permanent weight. Any competitively material change should include its reason and effective time.

## Success signals

The social layer is working when:

- more members contribute at least once than in a score-only event;
- encounter assists are distributed more broadly than encounter wins;
- daily contracts are achievable by most teams without one player carrying them;
- daily digests bring inactive members back into a later action;
- captain polls receive input without delaying choices;
- no individual becomes a repeated raid or shame target;
- players remember team moments, names, and mishaps in addition to the final ranking.
