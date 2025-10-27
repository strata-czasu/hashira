---
title: Prevent Discord.js Builder Mutation
tags: [discord, typescript, best-practice]
---

# Prevent Discord.js Builder Mutation

## Problem

Discord.js builders (ButtonBuilder, ActionRowBuilder, etc.) are mutable objects.
When using `Builder.from()` with a global constant, modifications to the builder
will mutate the original constant, causing state to leak across different usages.

## Anti-pattern

```typescript
// ❌ BAD: Global constant that can be mutated
const myButton = new ButtonBuilder()
  .setCustomId("my-button")
  .setLabel("Click me");

const myRow = new ActionRowBuilder().addComponents(myButton);

// Later in code...
ButtonBuilder.from(myRow.components[0]).setDisabled(true);
// This mutates the global myButton constant!
```

## Solution

Use factory functions that return fresh instances:

```typescript
// ✅ GOOD: Factory function that returns new instances
function createMyButtonRow() {
  const myButton = new ButtonBuilder()
    .setCustomId("my-button")
    .setLabel("Click me");
  
  return new ActionRowBuilder().addComponents(myButton);
}

// Later in code...
const row = createMyButtonRow();
ButtonBuilder.from(row.components[0]).setDisabled(true);
// This only affects the local instance
```

## Alternative: Clone with toJSON()

If you must use global constants, clone them first:

```typescript
// ✅ ACCEPTABLE: Clone before modifying
ButtonBuilder.from(myButton.toJSON()).setDisabled(true);
```

## GritQL Pattern

While Biome.js doesn't yet support custom GritQL patterns in version 2.2.5,
this pattern can be detected with external GritQL tooling:

```gql
pattern no_discord_builder_mutation() {
  or {
    // Detect ButtonBuilder.from() without .toJSON()
    `$builder.from($arg).$method($val)` where {
      $builder <: r"ButtonBuilder|SelectMenuBuilder|TextInputBuilder",
      $arg <: not r".*\.toJSON\(\)",
      $method <: r"set.*"
    },
    // Detect modifications to ActionRowBuilder components
    `$row.components[$index].$method($val)` where {
      $method <: r"set.*"
    }
  }
}
```

## Code Review Checklist

When reviewing Discord.js code, watch for:

- [ ] Are Discord.js builders defined as global constants?
- [ ] Are builders modified after being passed to `.from()`?
- [ ] Is `.toJSON()` used when cloning builders?
- [ ] Could factory functions eliminate the need for cloning?

## Related Issues

- [Fix button component mutation via toJSON() cloning](https://github.com/strata-czasu/hashira/pull/XXX)
