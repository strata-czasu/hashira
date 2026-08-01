# Birthday 2026 Operations Runbook

## Before launch

1. Run `/urodziny-admin stan`. Require four teams, four Tucznicy, four approved
   personas, configured text/voice earning, zero reconciliation errors, and no
   missing digestion jobs.
2. Close registration and run `/urodziny-admin przydziel-zapisy`, then
   `/urodziny-admin synchronizuj-role` until every role succeeds.
3. Create each canonical status with `/urodziny-admin status-kanal`.
4. Open every event mechanic with `/urodziny-admin flagi aktywny:true`. Keep
   visibility independent only if the public launch is staged.

## Pause and recovery

- Pause the whole event with `/urodziny-admin flagi aktywny:false`. Earning,
  feeding, encounters, captain actions, and raids must all observe this switch.
- Inspect `/urodziny-admin status-ekonomii` and `/urodziny-admin stan`. A pending
  batch without a task or a wallet/batch mismatch must be resolved before final
  settlement. Re-running a due digestion is safe and idempotent.
- Use `/urodziny-admin daj-pasze` only for a documented correction. Its required
  reason, actor, Discord interaction ID, and ledger entry form the adjustment audit
  trail. Never edit balances or weight directly.

## Final settlement

1. Wait until the configured end. For an early emergency close, first set
   `aktywny:false`.
2. Run `/urodziny-admin stan` and confirm economy reconciliation.
3. Run `/urodziny-admin rozlicz potwierdz:true` once. Repeating it is safe.

Settlement atomically disables all inputs, force-digests pending feed batches,
expires unspent personal Pasza with ledger debits, cancels obsolete digestion jobs,
and snapshots team and individual results. Team ties are resolved by distinct
contributors, then team creation order.

Publish or regenerate the locked result with `/tucznik wyniki`. If Discord delivery
fails, fix the channel or permissions and run the same command again; do not adjust
the stored score.
