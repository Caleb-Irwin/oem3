# AI GENERATED REFERENCE - USE CAUTION: OEM3 Unified Tables: How to Add a New Unified Table (SPR)

This document explains the architecture of the OEM3 unifier system and provides a step-by-step guide to add a new unified table for SPR. It references the existing Unified Guild implementation as a concrete example and calls out every place you’ll need to modify.

Use this as a checklist when you introduce any new unified table.


## TL;DR checklist

- Define the new unified table schema (+ enums, relations, column enum) and the cell-config table.
- Export the new schema from the central DB schema aggregator so all modules can import it (like `../../db.schema`).
- Implement a new unifier config using `createUnifier` with:
  - getRow (joins to source rows and uniref)
  - transform mapping using the cell transformer
  - connections (primary + other tables with findConnections and deletion logic)
  - additional validators
  - version
- Create a worker wired to `updateUnifiedTable` for this unifier using `work(...)`.
- Create a router that:
  - Instantiates `managedWorker` for your new unified resource
  - Registers source hooks to invalidate/update by changeset types
  - Exposes `worker` and child routers
- Wire your router into the top-level routing surface so it’s reachable
- Add Drizzle migrations for: enums, unified table, cell-config table, uniref FK column (see notes), indexes
- Bump KV version and run an initial rebuild (`updateAll`) of the unified table
- Verify: run the worker; inspect rows; test changeset-driven updates; check cell-config overrides and errors


## Architecture overview (what exists today)

The unified system normalizes data from one or more source tables into a single “unified” row per logical product, with per-cell overrides via a cell-config table and a change history. A background worker reconciles connections and applies transformation logic.

Key pieces:

- Unifier engine: `server/src/unified/unifier.ts`
  - `createUnifier` returns `{ updateUnifiedTable, updateRow, verifyCellValue, ... }`
  - Handles connections (primary + other tables), applying cell overrides, validating, writing history, and publishing updates via callbacks
  - Tracks a `version` to force a full rebuild when your mapping changes

- Example unified resource: Unified Guild
  - Schema and helpers: `server/src/routers/guild/table.ts`
  - Unifier configuration: `server/src/routers/guild/guildUnifier.ts`
  - Worker: `server/src/routers/guild/worker.ts`
  - Router wiring (managed worker + change hooks): `server/src/routers/guild/index.ts`

- Shared types and registry
  - There is a central schema aggregator exported via `server/src/db.schema` (modules import unified tables and enums from `../../db.schema` in the current pattern).
  - The `uniref` table links a unified row to a global `uniId` and is used for publishing updates (`updateUnifiedTopicByUniId`). For each new unified table, ensure `uniref` can reference it (see Migration notes).


## Plan for a new Unified SPR table

You’ll mirror the Guild structure under `server/src/routers/spr/` (folder name can vary, but keep it consistent) and wire it up similarly.

### 1) Define the schema for Unified SPR

Create `server/src/routers/spr/table.ts`:

- Define any enums specific to SPR (or reuse shared enums if appropriate).
- Define the unified table, e.g., `unifiedSpr = pgTable('unifiedSpr', { ... })` with:
  - PK `id`
  - Stable business key (e.g., `sprId` or `productId`) with `unique()`
  - FK columns to source tables (primary + optional others) e.g., `dataRow`, `inventoryRow`, `flyerRow`, etc.
  - Normalized unified columns (title, description, pricing, etc.) relevant to SPR
  - Operational columns: `inventory`, `deleted`, `lastUpdated`
  - Indexes for lookup columns (IDs, part numbers, UPC, etc.)

- Define `relations` including:
  - `uniref` one-to-one: `fields: [unifiedSpr.id], references: [uniref.unifiedSpr]`
  - `dataRowContent`, `inventoryRowContent`, ... to join back to the source tables using FK columns

- Define a column enum for the cell-config system: `unifiedSprColumnEnum = pgEnum('unifiedSprColumn', [...])`. Include every configurable column (exclude `id` and `lastUpdated`).

- Create the cell-config table via `cellConfigTable({ originalTable: unifiedSpr, primaryKey: unifiedSpr.id, columnEnum: unifiedSprColumnEnum })`. Export both the `table` and `relations` the same way Guild does.

Tip: Use `server/src/routers/guild/table.ts` as a template and adapt names/types to SPR.


### 2) Export from the central DB schema aggregator

The Guild unifier imports from `../../db.schema`. Ensure your new unified SPR table, its enums, relations, and the cell-config table are exported from the same central aggregator file. This makes them available in the unifier and worker modules without deep import paths.

Changes needed:

- Add `unifiedSpr`, `unifiedSprRelations`, `unifiedSprColumnEnum`, `unifiedSprCellConfig` (and any SPR-specific enums) to `server/src/db.schema.ts` exports.
- Ensure `uniref` has a nullable FK column to `unifiedSpr.id` (see Migration notes).


### 3) Implement the SPR unifier

Create `server/src/routers/spr/sprUnifier.ts` with the pattern from `guildUnifier.ts`:

- `getRow(id, db)`: query `unifiedSpr.findFirst` joining `dataRowContent`, `inventoryRowContent`, `flyerRowContent` (as needed) and `uniref`. Throw if not found. Keep its return type to feed into `createUnifier<GuildRowType, typeof unifiedGuild>`-style generic typing.

- `createUnifier<YourRowType, typeof unifiedSpr>({...})` with:
  - `table: unifiedSpr, confTable: unifiedSprCellConfig, version: <number>` (start at 1)
  - `transform(item, t) => ({ ... })`: map from the joined source row(s) to unified columns using the provided transformer:
    - `t('colName', value)` basic mapping
    - `shouldMatch` to enforce equality across sources (primary vs secondary)
    - `shouldNotBeNull` for required fields
    - Build image URLs, price/compare logic, weight, etc., as needed for SPR
  - `connections`:
    - `primaryTable`: the canonical source table for SPR with `refCol` pointing to your FK (e.g., `dataRow`) and `findConnections` that returns all non-deleted candidate IDs for this SPR key; include `newRowTransform` to create a brand-new unified row for missing primaries
    - `otherTables`: additional connectable sources with `refCol`, `findConnections`, `isDeleted`
  - `additionalColValidators`: put specific validators (e.g., enum membership, numeric ranges, non-empty strings) to enrich error reporting in the cell-config system

Notes about `createUnifier` behavior to keep in mind:

- Connections are auto-matched if allowed by the cell-config setting and `findConnections` yields a single candidate; otherwise the unifier records match errors and may fall back to null if a match would create duplicates.
- When the primary source row is deleted, the unifier can set `deleted` on the unified row.
- `version` controls a KV entry; bump it when you change mapping logic to force a full rebuild.


### 4) Add a worker to build/update Unified SPR

Create `server/src/routers/spr/worker.ts`:

- Use `work({ process: async ({ progress, utils: { customMessage } }) => { await sprUnifier.updateUnifiedTable({ progress, onUpdateCallback: (uniId) => customMessage(uniId.toString()) }); } })` similar to Guild.
- This worker is invoked by `managedWorker` (see next step) to gradually reconcile the table with concurrency and publish `uniId` updates.


### 5) Router wiring and change hooks

Create `server/src/routers/spr/index.ts`:

- Instantiate a `managedWorker`:
  - `new URL('worker.ts', import.meta.url).href`
  - resource name: `'unifiedSpr'` (must match the unified table topic used elsewhere)
  - Provide the list of source hooks (e.g., `sprDataHook`, `sprInventoryHook`, etc.). These hooks should trigger invalidations via `updateByChangesetType('<sourceType>')` to enqueue rows for the worker.
  - In the callback, call `updateUnifiedTopicByUniId(msg)` if `msg` is present (mirrors Guild pattern).

- Export:
  - `runSprWorker` from `runWorker`
  - `sprHook` from `hook`
  - `sprRouter = router({ worker, data, inventory, flyer, ... })` binding any sub-routers for the sources

Integration points:

- Ensure `sprHook` calls `updateByChangesetType('<each SPR source type>')` so changes cascade to unified updates. See Guild’s `index.ts` for the exact pattern.
- Add `sprRouter` to the top-level API router so clients can control/inspect the worker as needed.


### 6) Migrations (Drizzle + SQL)

You must generate and apply migrations that represent:

- New enum types (e.g., `unifiedSprColumn` or any domain enums)
- The `unifiedSpr` table with all columns and indexes
- The `unifiedSprCellConfig` table created via `cellConfigTable`
- A new nullable FK column on `uniref` referencing `unifiedSpr.id` (if your `uniref` model follows the same pattern as Guild’s `unifiedGuild` FK). Also ensure corresponding `relations` are added in code.

Process outline:

- Define the schema in TypeScript (as above)
- Generate migrations (Drizzle)
- Inspect and adjust SQL if necessary (especially enum changes and FKs)
- Apply migrations to your development database

Indexing tips:

- Create indexes for frequently queried columns (IDs, business keys, UPC/SKU, search keys). Follow Guild’s `table.ts` as a pattern for `uniqueIndex` and `index` declarations.


### 7) Events, topics, and uniref

- The worker publishes `uniId` via `updateUnifiedTopicByUniId`. If your topic routing/handlers key off resource names, ensure they support `'unifiedSpr'` similarly to `'unifiedGuild'`.
- If `uniref` is modeled with one nullable FK per unified table (as Guild hints), add a `unifiedSpr` column and relations. If `uniref` is more generic in your codebase, wire the SPR relation accordingly.


### 8) Running and rebuilding

Initial sync:

- Bump the `version` in `sprUnifier.ts` when first created or any time you change the mapping; the KV at `unifier/<tableName>` triggers a full rebuild when the stored version is lower than your code’s version.
- Start the server and run the SPR worker. For parity with Guild, you should be able to trigger it via the router’s `worker` endpoint or by calling `runSprWorker` if your bootstrapping does that.

Operational notes:

- `updateUnifiedTable({ updateAll })` supports full rebuilds and incremental runs based on last-updated markers per source.
- The worker handles concurrency via a `PromisePool` and will publish per-row updates on completion.


### 9) Validation, overrides, and history

- Column overrides: The cell-config table allows configuring specific cells to override automatic values or matching behavior (including disabling auto-match for connections). Use the `CellConfigurator` underlying API through `createUnifier`.
- Validators: Add domain-specific validators in `additionalColValidators` to proactively surface bad data (e.g., enum membership, numeric ranges, non-empty strings). See Guild’s `um` and `category` validators.
- History: The unifier records update history entries when changes occur; verify that your `resourceType` passed to the history system matches the table name.


### 10) Testing and verification

- Create a few SPR source rows and ensure the unifier:
  - Creates missing unified rows for new primaries
  - Auto-matches other sources when unambiguous; records match errors otherwise
  - Marks unified rows as `deleted` when the primary source is deleted
  - Applies overrides and preserves them across re-runs
  - Publishes `uniId` on updates

- Query checks (examples):

  - unified SPR row exists for your SPR key
  - `dataRowContent`, `inventoryRowContent`, etc., are correctly connected
  - Derived columns (e.g., pricing logic) match expectations


## Concrete references (Guild example)

Use these as canonical patterns while creating SPR equivalents:

- Schema: `server/src/routers/guild/table.ts`
  - Enums (`categoryEnum`), unified table (`unifiedGuild`), relations, `unifiedGuildColumnEnum`, `unifiedGuildCellConfig`
  - Indexes for lookup fields; operational columns like `deleted`, `lastUpdated`

- Unifier config: `server/src/routers/guild/guildUnifier.ts`
  - `getRow` loads unified row + `dataRowContent`/`inventoryRowContent`/`flyerRowContent` + `uniref`
  - `transform` builds unified columns, uses `shouldMatch` and `shouldNotBeNull`
  - `connections` describes how to find and validate cross-table matches
  - `additionalColValidators` for enums like `um` and `category`

- Worker: `server/src/routers/guild/worker.ts`
  - Runs `guildUnifier.updateUnifiedTable` and publishes `uniId`

- Router: `server/src/routers/guild/index.ts`
  - `managedWorker(..., 'unifiedGuild', [guildDataHook, guildFlyerHook, guildInventoryHook, guildDescHook], ...)`
  - `hook(() => { updateByChangesetType('guildData'); updateByChangesetType('guildInventory'); updateByChangesetType('guildFlyer'); })`
  - Exposes `runGuildWorker`, `guildHook`, `guildRouter`

- Unifier engine: `server/src/unified/unifier.ts`
  - `createUnifier` contract: transform signature, connection behavior, updates, history, KV versioning


## Gotchas and tips

- Keep the unified table’s business key unique (e.g., `gid` for guild). Decide early for SPR and index it.
- Always include `deleted` and `lastUpdated` on unified tables; the unifier relies on these.
- Bump the `version` whenever your transform or connection logic changes to force a rebuild.
- Ensure `findConnections` never returns deleted candidates; the unifier assumes they are filtered out.
- Add indexes for any column you use in `findConnections` conditions (e.g., keys, UPC, SKU) to keep the worker efficient.
- When wiring source hooks, make sure the changeset type strings match what `updateByChangesetType` expects for those sources.
- If you see duplicate-match errors, consider enriching `findConnections` logic or disabling auto-match via cell-config for tricky rows.


## Deliverables summary when adding Unified SPR

- New files under `server/src/routers/spr/`:
  - `table.ts` (schema, relations, column enum, cell-config table)
  - `sprUnifier.ts` (unifier config)
  - `worker.ts` (worker process)
  - `index.ts` (managed worker + router + hooks)

- Updated central exports:
  - `server/src/db.schema.ts` to include unified SPR artifacts
  - `uniref` updated to include a FK to `unifiedSpr` (if following Guild relation pattern)

- Routing integration:
  - Top-level router includes `sprRouter`

- Migrations:
  - SQL for enums, tables, FKs, indexes

- Verification steps executed:
  - Initial build run
  - Spot-checks of data and auto-matching


## Appendix: Minimal unifier contract (quick reference)

Inputs/outputs:

- Input: unified row id; joined source rows via `getRow`
- Output: updated unified row; history entry; published `uniId`; cell errors updated

Error modes:

- Invalid matches (would cause duplicate): auto falls back to null and records error
- Invalid data type (enum, etc.): recorded on cell-config
- Conflicts on save: retried in a transaction with fallback to null or error

Success criteria:

- Connections reflect best-known state within constraints
- Transformed columns match business rules
- Overrides respected; validators enforced; history captured; updates published
