# Fix wallet operations

Status: implementation handoff  
Created: 2026-07-19

## Objective

Make balance-consuming economy operations preserve their invariants under concurrent requests.

The primary invariant is:

> An operation that does not explicitly permit debt must never reduce a wallet below the required minimum balance, even when several operations target the same wallet concurrently.

## Background

The economy models are defined in `packages/db/prisma/models/economy.prisma`. The relevant services are:

- `apps/bot/src/economy/managers/transferManager.ts`
- `apps/bot/src/economy/managers/walletManager.ts`
- `apps/bot/src/economy/managers/shopService.ts`
- `packages/db/src/index.ts`
- `packages/db/src/transaction.ts`

All transfer and purchase steps are already wrapped in interactive Prisma transactions. This correctly provides all-or-nothing commit behavior, but it does not by itself protect a read-check-write balance invariant from concurrent transactions.

The project constructs `PrismaClient` without overriding transaction isolation. With PostgreSQL this normally means `READ COMMITTED`.

Example with a wallet balance of 100 and two concurrent spends of 80:

1. Transaction A reads 100.
2. Transaction B reads 100.
3. Both application-level checks pass.
4. Transaction A decrements the wallet to 20 and commits.
5. Transaction B updates the newly committed row and decrements it to -60.

The second update currently selects the wallet only by `id`, so it has no balance predicate to fail after PostgreSQL re-evaluates the row.

The global shop stock reservation already uses the desired pattern: its `updateMany` includes a `soldCount` predicate and checks the affected row count. The later wallet deduction does not.

## Scope

### Required

- Introduce one shared atomic debit/spend primitive.
- Use it for single-recipient transfers.
- Use it for multi-recipient transfers.
- Use it for shop purchases.
- Preserve transaction history and rollback behavior.
- Add real concurrent-operation tests.
- Review the `skipAmountCheck` escape hatch.

### Adjacent audit

The shop describes purchases as atomic, but only global stock is currently reserved using a conditional mutation. Concurrent requests may also bypass:

- `ShopItem.userPurchaseLimit`
- `Item.perUserLimit`

These limits should be audited and either fixed in this change or tracked as an explicit follow-up. The wallet fix must not claim the entire purchase operation is concurrency-safe if those limits remain vulnerable.

## Recommended design

### Atomic debit primitive

Add a low-level service that operates on the `PrismaTransaction` it receives. It must not start a nested transaction itself.

Conceptual interface:

```ts
type DebitWalletOptions = {
  prisma: PrismaTransaction;
  walletId: number;
  amount: number;
  transaction: {
    reason: string | null;
    transactionType: TransactionType;
    relatedUserId?: string | null;
    relatedWalletId?: number | null;
  };
};

const debitWallet = async (options: DebitWalletOptions): Promise<void> => {};
```

Required behavior:

1. Reject non-positive amounts for ordinary debits.
2. Conditionally decrement the balance:

```ts
const result = await tx.wallet.updateMany({
  where: {
    id: walletId,
    balance: { gte: amount },
  },
  data: {
    balance: { decrement: amount },
  },
});
```

3. If `result.count === 0`, distinguish a missing wallet if useful, otherwise throw `InsufficientBalanceError`.
4. Create the debit `Transaction` record only after the conditional update succeeds.
5. Keep both writes inside the caller's transaction so any later failure rolls them back.

An alternative implementation may decrement first, inspect the returned balance, and throw if it is negative. The conditional update is preferred because it expresses the invariant directly and never creates a temporarily invalid balance inside the transaction.

### `transferBalance`

Retain the existing transaction boundary and wallet lookup, then:

1. Validate the amount.
2. Resolve source and destination wallets.
3. Reject a transfer between the same wallet.
4. Atomically debit the source through the shared primitive.
5. Increment the destination and create its credit transaction.
6. Commit both sides together.

Do not rely on the earlier `fromWallet.balance < amount` read as the final guard. It may remain only as an optional early error; the conditional mutation is authoritative.

### `transferBalances`

Calculate the total debit from the de-duplicated destination list and validate it before writing:

```text
total = unique recipient count * amount
```

Then atomically debit the source once and credit all destination wallets inside the same transaction.

Validate that:

- `amount > 0`
- the recipient list is not empty
- the total fits the database `Int` range
- the sender is not included in a way that creates a self-transfer loophole

### `purchaseShopItem`

Replace the read-only balance check followed by an unconditional decrement with the shared atomic debit.

It is safe for the global stock reservation to happen first because failure of the later debit rolls the complete purchase transaction back, including `soldCount`.

Preserve the existing transaction record convention unless the broader economy schema is intentionally changed:

```text
amount: positive purchase price
entryType: debit
reason: "Zakup: ..."
```

### `skipAmountCheck`

`skipAmountCheck` is currently used by `apps/bot/src/userTransfer/transfer.ts` to create a symbolic zero-value transfer during account migration.

The boolean also permits negative amounts, which would reverse debit/credit behavior unintentionally. Replace it with one of:

- an explicit `allowZero` option that still rejects negative amounts; or
- direct creation of the symbolic transaction in the account-transfer workflow.

The ordinary public transfer functions should always reject negative amounts.

Conditional writes are used here because they:

- guard the exact invariant at the write;
- work under PostgreSQL `READ COMMITTED`;
- compose with the existing `nestedTransaction` proxy.

If some shop limits cannot be expressed safely with conditional writes, a narrowly scoped serializable transaction with retry-on-conflict may be considered for `purchaseShopItem`.

## Shop limit audit

### Global stock

The current conditional `soldCount` reservation is concurrency-safe and should be retained.

### Per-user purchase limit

The current sequence reads the user's previous purchase count and increments it later. Two purchases can potentially pass the same check.

Potential solutions:

- Reserve the quantity through a conditionally updated counter row.
- Use a narrowly scoped serializable transaction with bounded retry.
- Lock a stable per-user/per-shop row before checking and incrementing.

The chosen approach must also handle the first purchase, when the counter row does not exist yet.

### Per-user inventory limit

Counting `InventoryItem` rows before inserting has the same concurrency concern. This is complicated by inventory transfers and administrator grants, which can add inventory outside the shop.

If it is not fixed in this handoff, add a separate issue and narrow the documentation in `shopService.ts` so it does not imply that this limit is race-safe.

## Tests

Mock-only unit tests are not sufficient to demonstrate the race is fixed. Add integration tests against PostgreSQL for the concurrency cases.

At minimum:

### Concurrent single transfers

- Source balance: 100.
- Launch two transfers of 80 concurrently.
- Exactly one succeeds.
- Source ends at 20.
- Only one destination is credited.
- Only the successful debit/credit transaction pair exists.

### Concurrent shop purchases

- Wallet balance permits only one of two purchases.
- Launch both purchases concurrently.
- Exactly one succeeds.
- Wallet is never negative.
- `soldCount`, inventory, purchase counter, and transaction history reflect one purchase.

### Rollback after debit

- Make a later operation in the transaction fail.
- Confirm the wallet debit and transaction record are both rolled back.

### Multi-recipient transfer

- Confirm recipient de-duplication.
- Confirm insufficient total balance credits nobody.
- Confirm a successful transfer creates one source debit and one credit per unique recipient.

### Zero and negative amounts

- Ordinary transfers reject zero and negative amounts.
- The account migration's intentional zero-value history marker still works through its dedicated path.

## Acceptance criteria

- No balance-consuming operation can overspend a wallet through concurrent calls.
- Transfer and purchase writes remain all-or-nothing.
- Transaction history matches committed balance changes.
- The global stock behavior remains correct.
- `skipAmountCheck` no longer permits negative transfers.
- Concurrent integration tests reproduce the old failure and pass with the fix.
- Any unresolved shop limit race is documented as a follow-up and no longer described as already safe.
- `bun run typecheck` passes.
- Relevant bot and database tests pass.

## Suggested implementation order

1. Add failing PostgreSQL concurrency tests for wallet transfers and purchases.
2. Add the atomic debit primitive.
3. Migrate `transferBalance` and `transferBalances`.
4. Migrate `purchaseShopItem`.
5. Replace or narrow `skipAmountCheck`.
6. Audit per-user shop and inventory limits.
7. Run type checking, economy tests, and the full relevant test suite.
