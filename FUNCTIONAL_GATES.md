# Functional Gates

This file defines the baseline contract that must stay valid before and after each roadmap step.

## Goal

Any reliability/scaling refactor is allowed only if it preserves the current functional behavior of:

- Catalog sync from Data Layer,
- BI dashboards backed by Data Layer,
- shared DB catalog visibility,
- Bitrix-driven relevance of the mirrored data.

## Read-Only Gate

Run these checks before and after each non-trivial change:

```bash
python3 /Users/mi4gang/Documents/lab/sandbox/data-layer-sync/healthcheck.py --json
pnpm functional:gate
```

## Hard Fail Conditions

These must stay green for a change to be considered safe:

- Data Layer API is reachable:
  - `GET /api/sync/status`
  - `GET /api/dashboard/procontainer`
  - `GET /api/catalog/containers`
- Data Layer stock slice is internally consistent:
  - no duplicate container numbers in `stock`
  - no duplicate container numbers in `reserved`
  - no overlap between `stock` and `reserved`
  - `catalog/containers` matches the same stock identity set as dashboard stock
- Catalog shared DB is structurally healthy:
  - active containers have unique non-empty `externalId`
  - active containers have non-empty `name` and `size`
  - no orphan photos
  - no container has more than one main photo
  - sync settings row exists
- Data Layer MySQL mirror passes `healthcheck.py`

## Warning Conditions

Warnings do not block all work, but they must be reviewed before changing sync logic:

- Active catalog external IDs drift from Data Layer stock IDs
- Catalog has zero active containers
- Data Layer payload is empty while sync freshness is still green
- Generated payload timestamps look stale relative to expected sync cadence

## Manual Release-Time Gate

For changes that affect sync semantics, release validation must also include an operator scenario:

1. Change a known container state in Bitrix.
2. Trigger manual Data Layer sync.
3. Trigger manual Catalog sync.
4. Verify the container lands in the expected slice:
   - `stock`
   - `reserved`
   - catalog active/inactive state

This manual scenario is not part of the default read-only script because it mutates production state.
