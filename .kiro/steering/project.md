# World Generator — Project Steering

## What This Is

A browser-based random world generator for tabletop RPGs (D&D-flavored). The core philosophy is **selective randomization** — users can hand-craft as much as they want and let the tool fill in the rest. Most existing generators randomize everything; this one doesn't.

It is intended for public release eventually.

## Tech Stack

- **Source**: TypeScript (`src/scripts/`) + Pug (`src/pages/`) + SCSS (`src/styles/`)
- **Build**: Gulp 4 + Rollup (via `gulp-better-rollup`) + `rollup-plugin-typescript2`
- **CSS**: Dart Sass (`sass` package) + PostCSS + cssnano
- **Runtime**: jQuery (loaded from CDN), vanilla browser APIs
- **Packages**: `@toolkit5e/base`, `@toolkit5e/monster-scaler`, and `@toolkit5e/statblock`. Currently pointed at the sibling repo via `file:../toolkit5e/packages/<name>` references for local development (so unreleased package changes — like the content-source API — are picked up immediately). **Before a production release, bump these back to published npm version ranges (e.g. `^1.1.6`) once the toolkit5e packages carrying the new API are published, then `npm install` to refresh the lock file.** After changing package source, rebuild toolkit5e (`npm run build`) so the linked `dist/` reflects your changes.

**Stale-type gotcha:** `rollup-plugin-typescript2` caches resolved types in `node_modules/.cache/rollup-plugin-typescript2`. When you change a `file:`-linked package's types (e.g. adding to `@toolkit5e/base`), the world-generator build may fail with phantom "property does not exist" / argument-count errors against the *old* types even though the linked `dist/` is correct. Clear the cache and rebuild: `Remove-Item -Recurse -Force node_modules\.cache\rollup-plugin-typescript2 ; npm run build`.
- **Output**: `docs/` (GitHub Pages compatible)

### Build Commands

```bash
npm run build        # one-off build
npm run watch        # build + watch
npm run development  # NODE_ENV=development build
npm run production   # NODE_ENV=production build
```

On Windows, set `NODE_ENV` separately before running gulp directly:
```powershell
$env:NODE_ENV="development"; npx gulp build
```

## Source Structure

```
src/scripts/
├── types.ts                  # Shared interfaces (WorldNode, ObjectTypeTemplate, etc.)
├── helpers.ts                # Pure utility functions (rand, weightedRand, collectAncestorTags, etc.)
├── nameGenerators.ts         # Location/creature name generators + queuedName state
├── titleGenerator.ts         # Unified title generator — layered pool builder used by all name generators
├── npcNameGenerators.ts      # NPC name generators — master dispatcher + 9 racial generators
├── adventureHookGenerators.ts # NPC adventure hook generator — layered rumor/actionable pools + registry-backed world-aware hooks
├── attributeGenerators.ts    # Attribute value generators, categoryAttributes, attributeEditors, labels, deity/avatar/NPC setup
├── nodeRegistry.ts           # Global node registry for cross-tree references (deities, etc.)
├── scripts.ts                # Entry point — DOM logic, event handlers, save/load
└── data/
    ├── constants.ts          # Shared data constants (populationDensity, temperatureList, races, etc.)
    ├── objectTypes.ts        # Merge file — imports partials, spreads into objectTypes, runs category injection
    ├── objectTypes/
    │   ├── planarTypes.ts    # Multiverse, planes, planar biomes, divine realms, deities, avatars
    │   ├── geographyTypes.ts # Continents, oceans, regions, biomes, localities
    │   ├── settlementTypes.ts# Settlement tiers, districts, buildings (temples, shops), role NPC wrappers
    │   └── creatureTypes.ts  # Creature groups, individual creatures, base NPC types
    └── presets/
        ├── index.ts          # Preset interface + registry array
        ├── forgottenRealms.ts # SCRAPPED — copyrighted, do not ship/register (reference only)
        └── everquest.ts      # EverQuest world tree
```

The Rollup entry point is `src/scripts/scripts.ts` only — other files are imported as modules, not processed separately.

## Key Concepts

### WorldNode
The core data structure. A node has a `type` (key into `objectTypes`), optional `name`, optional `attributes`, optional `children`, and a reference to its `parent` and `domElement`. Parent and domElement are stripped before JSON serialization.

### objectTypes
The data-driven definition of every node type. Each entry defines:
- `typeName` — display name
- `categories` — inherits attribute sets from `categoryAttributes` (geography, plane, settlement)
- `attributes` — attribute definitions (arrays = picklist, functions = generator, `{min,max}` = range, or fixed strings like `alignment`)
- `children` — child generation rules with min/max, weightedRange, prerequisites, requiredSibling
- `nameGenerator` — optional function to generate a name
- `inheritAttributes` — list of attribute keys to copy from parent instead of generating fresh
- `creature` / `variant` — links to the monster-scaler companion tool
- `legendary` — `3 | 5` — if set, the creature is rendered with legendary resistances and auto-generated legendary actions. Also adds `&legendary=N` to the monster-scaler link.
- `dynamicCreature` — when true, creature/variant/legendary are resolved from node attributes at generation time instead of from the template. Used by deity types where the base creature is selected randomly based on planar context.
- `customSetup` — optional function called after attributes are generated and before the name generator. Used for complex multi-attribute logic where derived attributes depend on other attributes (e.g. deity domain → creature selection → variant).
- `registered` — when true, nodes of this type are added to the global node registry on creation. Other nodes can query the registry for cross-tree references (e.g. avatars referencing deities).
- `tags` — static metadata tags (e.g. `['water']`, `['forest', 'cold']`) describing what this type represents. Not stored on nodes or editable — used by code for context-aware decisions like avatar deity selection based on biome. Tags are collected from the ancestor chain via `collectAncestorTags()`.
- `mapPlacement` — optional special rule (`'edge'`) for how nodes of this type are positioned on their **parent's** Node_Map. The map subsystem (`mapGenerator.ts`) lays out children by type-aware grouping (like-with-like regions cluster together), but a type with a `mapPlacement` rule is placed first into reserved cells before the rest fill in. Grouping uses **multi-anchor patching**: a type-group is split into `ceil(size / PATCH_SIZE)` patches (PATCH_SIZE = 5), each with its own seeded anchor, so a dominant type (e.g. a planet's ~17 oceans) distributes into several contiguous clusters rather than one monolithic blob, while a small group (≤ 5) stays a single tight cluster. Tune via the `PATCH_SIZE` constant in `mapGenerator.ts`. `'edge'` reserves the grid's perimeter ring (one tile deep) so those children frame their siblings — e.g. `coast` is tagged `'edge'` so coasts sit on the rim of a continent. Honored by both `generateMap` (fresh layout) and `reconcilePlacements` (auto-placing newly added children). Resolved via `getMapPlacement(type)`; overflow beyond the perimeter falls back to normal interior placement. Extend the union in `types.ts` to add new rules.

**Map-capable types** (`mapCapable: true` + `emptinessRatio`): a type opts into having its own Node_Map purely by setting `mapCapable: true` on its template; `emptinessRatio` tunes how much generic Terrain_Tile fill sits between child POIs (0 = continent-like, composed entirely of its children; >0 = biome-like, scattered POIs in generic terrain). No code changes are needed to add a map to a type — the whole subsystem reads these two fields via `isMapCapable`/`getEmptinessRatio`. The current map-capable set (pinned by `mapCapableTypeSet.test.ts`):
- **Ratio 0 (continent-like):** `planet` (continents + oceans tile the surface), `continent`.
- **Material regions, ratio > 0 (biome-like):** forest biomes `coniferousForest`/`deciduousForest`/`rainforest`/`forgottenForest` (2), open biomes `plains`/`savanna`/`tundra`/`hills`/`swamp` (2), `desert` (3 — sparser), water bodies `ocean`/`sea` (2), `coast` (1 — thin busy strip), `mountainRange` (1 — mostly its peaks/passes).
- **Planar biomes / localities, ratio > 0:** the element-, energy-, and alignment-conditioned geography that hangs off planar layers and demiplanes. Open elemental/energy expanses at 2 (`lavaLake`, `ashField`, `abyssalDepth`, `stoneForest`, `cloudIsland`, `stormFront`, `radiantGrove`, `lifeSpring`, `etherealMeadow`); desolate wastes at 3 (`boneWaste`, `chaosWaste`); built structures/strongholds at 1 (`coralPalace`, `crystalCavern`, `necropolis`, `infernalCitadel`, `abyssalFortress`, `celestialSpire`). `chaosWaste` and `etherealMeadow` carry no terrain tag, so they declare an explicit `mapColor`.

**Planar ↔ material mapping:** the planar hierarchy mirrors the material one for maps — a **plane** is the analog of a **material plane** (diagram menu of its children), and a **planar layer / demiplane** is the analog of a **planet** (a continent-like grid map of its localities; we don't break planar layers down into separate continents yet, so think "planet with a single continent"). Planar biomes/localities are the analog of continents/regions (their own grid maps).

**Diagram layout mode** (`mapLayout: 'diagram'`): high-level containers whose children are "whole worlds/realms" with no meaningful relative geography present a **non-spatial "menu"** of shaded globe/discs (a solar-system-style diagram) instead of the cartographic grid. Resolved via `getMapLayout(type)` (default `'grid'`). Current diagram types: `materialPlane` (shows its planets as globes) and `plane` (shows its layers/demiplanes). `planarLayer`/`demiPlane` are NOT diagram — they're continent-like grid maps (ratio 0), like planets. Key differences from grid mode, all handled by branches in `mapModal.ts`:
- **No persisted `node.map`** — the layout is rebuilt fresh on every open from `node.children` (user explicitly didn't want saved positions), so there's no seeded placement, reconcile, terrain/void fill, or drag-to-reposition. The info-panel control is always a single "Open Map" (nothing to generate ahead of time).
- `renderDiagram` emits one `.map-diagram-disc` per child, reusing the **same `.map-tile` + `data-child-ref` contract** as grid tiles (the ref is the child's own `mapRef`, stamped via `assignChildRef`). This lets the shared delegated click/dblclick handlers resolve and drill discs with zero special-casing — children select/drill exactly like grid tiles. `resolveChildByRef` has a no-map fallback that matches the ref against `node.children`. The grid-size control is hidden.
- **Discs preview the child's actual map, not a flat tint:** for a *grid*-layout map-capable child (e.g. a planet) `renderDiagram` generates its `node.map` on demand (if absent) and embeds a `buildMiniGrid` miniature clipped to the circle, so the sphere shows the child's continents/oceans (markUnsaved once if any map was created). Planets additionally get a `--globe` `::before` shading overlay on top of the mini-map (and the square corner-fold `::after` is suppressed on discs). *Diagram*-layout children (if any — currently none, since a plane's children are grid-layout layers/demiplanes) would stay a flat `mapColor` disc. `planet` carries an explicit ocean-blue `mapColor` (`#2a6fb0`) so it reads as a world rather than the gray default; planar layers/demiplanes preview their localities the same way planets preview continents.
- **`buildMiniGrid` nesting depth:** takes `{ depth, generateMissing, generated }`. Depth 1 (default, used by the full-grid tile preview in `renderGrid`) draws grandchildren as flat swatches. The diagram discs request **depth 2** so each continent/region tile is itself textured with its sub-regions (a `.map-mini-cell--nested` hosting its own nested `.map-mini-grid`) rather than a solid block — this is what gives the planet globe real detail. `generateMissing: true` fills in the grandchildren's maps on demand so there's sub-geography to draw at the deeper level; the `generated` out-param (`{ value }`) threads back so `renderDiagram` can `markUnsaved` once. Recursion is bounded: a cell only nests while `depth > 1`, decrementing each level.
- **Drill-down chains through layouts:** `materialPlane`(diagram) → `planet`(grid) → continent/region(grid); `plane`(diagram) → `planarLayer`/`demiPlane`(grid) → planar locality(grid). `drillDownInto` and `openMapModal` branch on `getMapLayout`; `renderMapBody` dispatches grid-vs-diagram and clears the `map-modal-body--diagram` body modifier on the grid path.

**Intentional non-goals:** `river`/`lake` (linear/tiny features the square-grid area model misrepresents — a dedicated linear 1×N layout would require generalizing the persisted `NodeMap.gridSize: number` to non-square dimensions across the whole map subsystem + tests, not worth it for 0–3 strung-along children). `divineRealm` is not map-capable (a deity hierarchy container, not a spatial locality). Planes (material + outer) are not *grid*-capable — they present a diagram of their planet/layer children. Planar layers and demiplanes ARE grid-capable (planet-analogs). **`multiverse` and `planarCluster` are deliberately deferred (tree-only, no map):** a cosmology at that scale (the Great Wheel / World Tree / Great Tree) is a hand-authored topology of specific planes in specific adjacency/transitive relationships — not something the "lay out N children in a cluster/grid" model can mimic convincingly at random. They want a bespoke cosmology-diagram approach, to be designed later; don't shoehorn them into the disc-menu or grid.

When adding a new region/biome/planar-locality type, set `mapCapable`/`emptinessRatio` (and an explicit `mapColor` if it has no terrain tag); for a new high-level container use `mapCapable` + `mapLayout: 'diagram'`. Either way, update `mapCapableTypeSet.test.ts`.

**Map modal toolbar** (`mapModal.ts` + `index.pug`): the single `#map-modal` has a toolbar with "↑ Show parent" (navigate to nearest map-capable ancestor), "+ Generate Children" (populate the open node), a "Labels" checkbox (toggle child-tile labels via a `map-hide-labels` class on `#map-modal-body`), and a grid-size input. The modal keeps forward references to host functions rather than importing `scripts.ts` (circular): `setMarkUnsavedRef`, `setShowInfoRef`, `setGenerateChildrenRef`, `setObjectTypesRef` — all wired in `scripts.ts` on DOM ready. The "Generate Children" button reuses the host's `generateChildrenForNode` (so the main tree DOM stays in sync and the world is marked unsaved), then calls `reconcilePlacements` + `renderGrid` so new children appear as tiles while any user-positioned placements stay put. Each toolbar control self-hides when inapplicable (no map-capable parent / leaf type that can't generate children), so controls never dead-end — this makes the Generate button appear naturally when you drill into an empty map-capable child.

### Creature Alignment
Non-beast creature nodes have an `alignment` attribute (e.g. `'Chaotic Evil'`, `'Lawful Good'`). This is used by name generators to select appropriate titles without maintaining hardcoded type lists. The alignment strings match the planar system format.

### Magic Level
`magicLevel` (None / Low / Medium / High, defined in `constants.ts`) is a Material Plane–only attribute guiding child generation, like temperature/population density.
- **Hierarchy:** `materialPlane` seeds it (fresh weighted roll); `geography` types derive it via `magicLevelValue` (attributeGenerators.ts) with variance around the parent (High → mostly High but sometimes lower; Low → occasionally mystical regions). **None is absolute** — a None parent only yields None children. Anything under a node with an `element` (outer planes) resolves to High.
- **Resolution:** `getMagicLevel(node)` (helpers.ts) walks ancestors for the nearest `magicLevel`, so non-geography nodes (settlements, buildings) are covered too. Undefined (old saves) = no gating.
- **Which types are magical (`magic.ts`, `applyMagicTiers`)** — inferred at load, in this order: (1) manual: `magic` on the template, else the `magicalTypes` override table in `constants.ts` (`false` = force mundane); (2) creature-backed: base/variant creature type in `magicalCreatureTypes` (undead, fey, fiend, celestial, elemental, dragon, plant, ...) or `dynamicCreature` → `major`; any other `legendary` creature → `minor`; (3) containers (no `categories`): a guaranteed (`min ≥ 1`) magical child makes the container magical (dragon lairs), otherwise it's magical when more than half its child entries are. Children that have a `mundaneVariant` count as mundane for this (so temples aren't magical because of their priests). The override table only needs ambiguous cases (human casters, mixed groups).
- **Two layers of gating, in `generateChildrenForNode`:**
  1. *Central floor (code):* `resolveMagicSpawn` — a magical type never spawns under a **None** ancestor. It spawns its `mundaneVariant` instead if defined, otherwise is skipped. Always enforced, even when a parent has explicit rules.
  2. *Per-parent rules (data):* child templates may use `conditions: [{ attribute: 'magicLevel', value: ... }]`. These resolve through **ancestors** (not just the node's own attributes) so they work at any depth. A child template with magicLevel conditions owns its own probability (see swamp's `undeadCrypt` entries for the worked example).
  3. *Fallback chance:* magical child templates WITHOUT magicLevel conditions roll `magicSpawnChance[level][tier]` (Low .5 minor/.15 major, Medium 1/.5, High 1/1), so unconverted biomes still behave sensibly. Convert biomes to explicit rules gradually where flavor matters.
  Manual "Add Child" is never gated.
- **Mundane variants** (`mundaneVariants` table): `npcAcolyte`→`npcAcolyteMundane` (commoner), `npcPriest`→`npcPriestMundane` (noble statblock), `npcCourtMage`→`npcCourtAdvisor`. To add one: create the non-magical type and add it to `mundaneVariants`.
- **Overriding inference for a creature:** the override is per node *type*, not per spawned node. Set `magic: false` (mundane) or `'minor'`/`'major'` on the template to beat creature-type inference — e.g. a dragon turtle or carnivorous plant that is dragon/plant-typed but not innately magical. Containers holding it are judged on their children, so they follow automatically. A variant's own creature type is checked before the base creature's; for a mundane variant of a magical base with the same type, give it its own node type with `magic: false`. If exceptions pile up, the cleaner fix is a creature-level flag in monster-scaler (e.g. `innatelyMagical: false`) read before the creature type.
- **Adding new content:** usually nothing — undead/fey/fiend/dragon creatures and their groups are picked up automatically. Only add an override for ambiguous types. Known inferred oddity: `forestGrove` is major (awakened trees are `plant` type).
- Gotchas: conditions with `match: true` on a magic level fail when the level is undefined (old saves without the attribute); knights are un-gated (no spells in the statblock). Possible follow-ups: mundane variants for other casters, convert more biomes to explicit rules, weight pools instead of skip-on-fail.
### Category Attributes
Types that declare `categories` automatically get attributes injected from `categoryAttributes` in `attributeGenerators.ts`. This happens at module load time in `objectTypes.ts` via a post-definition loop. Type-specific attributes take precedence — category attributes are only added if not already defined on the type.

Current categories:
- `geography` — populationDensity, racialDemographics, temperature, magicLevel
- `plane` — alignment, element
- `settlement` — racialDemographics

### Settlements
Settlements are unified into a single set of tiers: `thorp`, `hamlet`, `village`, `townSmall`, `townLarge`, `citySmall`, `cityLarge`, `metropolis`. Each tier has a `settlementType` attribute set by `settlementSetup` based on the parent biome's tags:
- Parent with `water` tag → `'Coastal'`
- Parent with `underground` tag → `'Underground'`
- Default → `'Standard'`

The `settlementType` attribute is editable by users and drives condition-based children (e.g. a docks district only spawns in coastal settlements). This replaces the old pattern of duplicating settlement types per biome.

**Settlement hierarchy**:
- **Cities** (citySmall, cityLarge, metropolis) only have **districts** as direct children: `districtTemple`, `districtMercantile`, `districtResidential`, `districtWealthy`, `districtMilitary`, `districtUndercity`.
- **Districts** contain **buildings**: temples, shops, barracks, guard towers, thieves' guild, nobles' court, knighthood orders.
- **Towns** (townSmall, townLarge) have **buildings** directly: temples, shops, farms, knighthood orders.
- **Villages/hamlets** have minimal buildings: general store, tavern, farms, houses.
- **Thorps** have just houses and maybe a farm.

NPCs spawn inside buildings, not directly in settlements.

Current building types: `temple` (worship-based, contains acolytes and priests), `knighthoodOrder` (worship-based, contains grandmaster + knights + squires), `shop` (contains shopkeeper NPC), `barracks` (contains guards/veterans), `guardTower`, `thievesGuild` (contains bandits/thugs), `noblesCourt` (contains nobles), `tavern` (contains tavernkeeper), `generalStore` (contains shopkeeper), `farm` (contains farmer + crops/livestock), `house`.

Current district types: `districtTemple` (contains temples and knighthood orders), `districtMercantile` (contains shops), `districtResidential` (contains houses, taverns), `districtWealthy` (contains nobles' court, houses), `districtMilitary` (contains barracks, guard towers), `districtUndercity` (contains thieves' guild, taverns).

Parent biomes (coast, plains, etc.) spawn settlements using weighted random type selection based on population density.

### Child Generation
Children are generated on-demand via a "Generate Children" button. If a generation pass produces zero children (all `min: 0` rolls came up 0), it retries up to 3 times to avoid empty results.

Child templates support:
- `min`/`max` — random count in range
- `weightedRange` — weighted random count
- `type` as a weighted object — weighted random type selection
- `conditions` — array of `Condition` objects evaluated as OR
- `requiredSibling` — always spawn this type alongside the child

Child generation also filters by **content source** (see below): single-type children from a disabled source are skipped, weighted type pools drop disabled entries before weighting (so they don't consume probability), and a `requiredSibling` only spawns if its own source is enabled.

### Content Sources
Users can toggle which content sources are included in generation via checkboxes in the control panel ("Sources" section). Source handling lives in `sources.ts`:
- Source definitions come from `@toolkit5e/base` (`sources` registry, `sourceKeys`, `resolveSourceId`).
- **Per-domain defaults (important):** the default for untagged content differs by *what the content is*. Creature-backed types default to **SRD** (a scaled/reflavored SRD monster is still SRD content, resolved via `resolveCreatureSource`). Non-creature types — geography, settlements, districts, buildings — are structural scaffolding, not ruleset content, so untagged ones default to the source-agnostic **`common`** source (`filterPolicy: 'always'`, never filtered). This avoids privileging SRD 5.1: a pure SRD 5.2 (or any single-ruleset) campaign still gets a fully populated world, because the scaffolding generates regardless of which ruleset sources are enabled.
- `ObjectTypeTemplate.source` — optional source id for a node type. For creature-backed types, the creature's (and variant's) own source takes precedence — resolved via `resolveCreatureSource` from `@toolkit5e/monster-scaler`. Dynamic-creature types (deities/avatars) fall back to the template source since their creature is picked at generation time (so their explicit `toolkit5e` tag wins).
- `resolveTypeSource(nodeType)` resolves a type's effective source (`common` for unknown/untagged non-creature types, SRD for untagged creatures); `isTypeSourceEnabled(nodeType)` is the generation gate. Unknown source ids are treated as always-on.
- The enabled-source set is a `Set<string>` persisted to `localStorage['enabledSources']`. `getAllSources` / `getToggleableSources` / `isSourceEnabled` / `setSourceEnabled` are the public API.

**Filter policy** (`Source.filterPolicy` from base): attribution (what content *is*) is independent of filtering (whether it generates). Each source declares a policy:
- `'default'` — user-toggleable checkbox, enabled by default. SRD and toolkit5e are both `'default'`.
- `'always'` — exempt from filtering: `isSourceEnabled` always returns true, no checkbox rendered. For purely-flavor content that should appear in any setting.
- `'setting'` — opt-in only: starts disabled, rendered under a separate "Settings" subheading. For campaign-setting-specific content (the planned EverQuest/Norrath preset will use this — tag EQ-unique creatures and geography with a `'setting'` source so they never bleed into a generic D&D world, and have the preset auto-enable that source on load).

The default enabled set is every `'default'`-policy source (so `'setting'` sources start off; `'always'` sources like `common` aren't in the set because they're never filtered). An empty saved set is respected (user turned everything off); only absent/corrupt storage falls back to defaults. `setSourceEnabled` is a no-op for `'always'` sources.
- UI: `renderSourceToggles()` builds a checkbox per *toggleable* source (`getToggleableSources` omits `'always'`) into `#sources-list`, splitting core vs. `'setting'` sources (the latter under an `h4.sources-subheading`). A delegated `change` handler on `#sources-list .source-checkbox` calls `setSourceEnabled`. Styles under `#sources-panel` in `styles.scss`.

**Decision log**: creature settlements (feyVillage, undeadCrypt, etc.) and their custom leaders stay implicitly **SRD** — they're flavor arrangements of SRD creatures and take no rules liberties, so an SRD-only setting still gets geography/settlements. Deities and avatars are tagged `toolkit5e` (filterable) since they're genuinely custom. If settlement attribution ever needs to be accurate while staying unfiltered, that's the use case for an `'always'`-policy toolkit5e-flavor source — not built yet.

To add a new source: define it in `sourceKeys`/`sources` in `@toolkit5e/base`, then tag content with `source: sourceKeys.<key>` (on `MonsterTemplate`/`MonsterVariant` for creatures, or `ObjectTypeTemplate` for world-gen types). The checkbox appears automatically.

**Currently tagged `toolkit5e`:** the deity tiers (`greaterDeity`, `lesserDeity`, `demigod`) and `avatar`. These are heavily custom concepts (dynamic creature scoring, auto-generated legendary actions, divine title generation) that aren't in the core rules, even though they borrow SRD creatures as a base — so users who disable the toolkit5e source won't generate them. Everything else is implicitly SRD: our creatures are SRD monsters reflavored or scaled a few CRs, which we treat as SRD. The one creature-level exception lives in the package: the `squid` variant on `cephalopod` (tagged `toolkit5e` in monster-scaler). Because deity/avatar types are `dynamicCreature: true`, `resolveTypeSource` reads the template `source` for them (it skips the creature-source lookup, since their base creature is chosen at generation time).

### Node Registry
A global `Map<string, WorldNode[]>` in `nodeRegistry.ts` that tracks nodes by type for cross-tree references. Only types with `registered: true` on their template are tracked. The registry is:
- Populated in `generateNode` after a registered node is created
- Cleared and rebuilt from the tree when loading/importing a world from JSON
- Cleared when generating a new world

Currently registered types: `greaterDeity`, `lesserDeity`, `demigod` (deity references), and `npcBanditCaptain`, `undeadCrypt`, `demonicFortress` (adventure hook quest targets). Used by avatars to reference a source deity, by NPCs for patron deity selection, and by the adventure hook generator to reference real quest targets by name.

To avoid circular imports, `nodeRegistry.ts` does not import `objectTypes.ts` — the `registered` check happens in `scripts.ts` before calling `registerNode`. The `registerTree` function accepts a `Set<string>` of registered type keys for the load/import path.

### Preset Worlds
Pre-built world skeletons defined as typed `WorldNode` trees in `src/scripts/data/presets/`. Bundled directly into the JS at build time — no fetch/CORS issues. The UI shows a "Load preset" dropdown in the control panel (hidden when `presets` is empty).

Presets provide the high-level structure (planes, continents, major regions) with names and attributes set. Users generate children to fill in the details with random content.

**Current status: no presets are registered.** The registry array in `index.ts` (`export const presets: Preset[] = []`) is empty, so the dropdown is hidden. Two preset *files* exist on disk but are not imported/registered:
- `forgottenRealms.ts` — **scrapped and must not be shipped.** Forgotten Realms is copyrighted/not distributable. Kept on disk for reference only; do not re-register it.
- `everquest.ts` — Norrath (Antonica, Odus, Faydwer, Kunark, Velious; Luclin; the Planes of Power). Considered OK to ship. This is the candidate to re-enable once the EverQuest *setting source* (see below) exists so its unique content can be scoped.

To add/enable a preset: create (or keep) a file in `src/scripts/data/presets/`, export the `WorldNode`, `import` it in `index.ts`, and push a `{ name, data }` entry onto the `presets` array.

Presets also serve as a **litmus test for the generator's expressiveness**. If a preset requires hand-placing content that the random generator can't produce naturally, that's a signal the generation algorithm needs refinement. The goal is that a fully random world should be able to produce something resembling any of the preset settings — the presets just give it a head start with named locations and creatures. (The existing `everquest.ts` is built entirely from generic types, which is a good sign the structure is expressive — the EQ session's job is to add the setting-*specific* flavor, scoped behind a setting source.)

### Building a Setting Source (EverQuest / Norrath — planned, own session)
A "setting source" packages content unique to a specific campaign world (e.g. Norrath's froglok/Kerran races, EQ-specific creatures and geography) so it only generates when the user opts in, and never bleeds into a generic D&D world. The infrastructure is fully in place from the content-source work; the EQ session should be **pure content**, no new plumbing. Steps:

1. **Define the source** in `@toolkit5e/base`: add a key to `sourceKeys` (e.g. `everquest: 'everquest'`) and a `sources` entry with `filterPolicy: 'setting'` and `homebrew: true`. Rebuild the base package (and clear the rpt2 cache in the world generator — see the stale-type gotcha above).
2. **Tag setting-unique content** with `source: sourceKeys.everquest`:
   - EQ-only creatures → `MonsterTemplate`/`MonsterVariant` `source` in `@toolkit5e/monster-scaler`.
   - EQ-only world-gen types (unique geography, settlements, named-flavor node types) → `ObjectTypeTemplate.source` in the world generator.
   - Leave genuinely generic scaffolding untagged (stays `common`) and generic SRD creatures untagged (stay SRD) — only tag what's truly EQ-specific.
3. **Auto-enable on preset load**: when the Norrath preset is loaded, call `setSourceEnabled('everquest', true)` so its content starts generating. (Decide whether loading a preset should also *disable* unrelated setting sources — likely yes for a clean setting experience.) A `'setting'` source is off by default, so without this step a loaded Norrath world would generate no EQ-specific content.
4. **Re-register the preset** in `presets/index.ts` once its setting content exists.

The UI already groups `'setting'` sources under a "Settings" subheading and omits `'always'` sources, so the EverQuest checkbox appears automatically once the source is defined.

## Known TODOs / In-Flight

- **TypeScript strictness** is currently `strict: false` — plan to enable incrementally once the shared-package refactor stabilizes
- **Save migration** — stale saves lack newer attributes (e.g. `magicLevel`), so those nodes show no setting in the info panel and aren't gated by it. Plan a "migrate" action (separate session) that backfills missing template attributes on load, deriving from the parent chain where a generator supports it (e.g. `magicLevelValue`). Decide whether it runs automatically or on demand, and whether it keeps a backup of the original save.
- **Default root** is `multiverse` — `createRootNode('districtTemple')` in `scripts.ts` is a dev leftover and should be reverted
- Remaining `//TODO` stubs: moons/celestial bodies
- **SRD creature coverage** — see `toolkit5e/srd-creatures.md` for the full checklist. NPC statblocks now cover: commoner, guard, bandit, bandit captain, thug, scout, noble, knight, veteran, mage, priest. Major categories remaining: other giants, monstrosities, more humanoid races (kobold, gnoll), constructs, oozes, more undead.
- ~~**Settlement districts and buildings**~~ — DONE. Cities have 6 district types (temple, mercantile, residential, wealthy, military, undercity), districts/towns have buildings (temples, shops, barracks, guard towers, taverns, farms, etc.), villages/hamlets have minimal buildings, thorps have houses.
- ~~**Worship dropdown**~~ — DONE. Deity/domain/dedication options + custom text field.
- ~~**Save button and auto-save**~~ — DONE. Save button + debounced auto-save to localStorage via `markUnsaved()`.
- ~~**Delete node button**~~ — DONE. Removes selected node and its subtree from the tree.
- ~~**Add Child UI**~~ — DONE. Dropdown with valid child types for the selected node, plus an "all types" dropdown for manual overrides.
- **Split creatureTypes.ts** — at ~1450 lines it's the largest partial file. Could be split further into NPCs (base NPC types), groups/encounters (wolf packs, demon hordes, etc.), and individual creatures (wolves, bears, dragons, etc.).
- **Creature settlement expansion** — when adding new creature types to the monster scaler, consider whether they should be added to existing creature settlements: `feyVillage` (fey), `undeadCrypt` (undead), `demonicFortress` (demons), `angelicCitadel` (celestials), `devilBastion` (devils). Also consider whether new creature types warrant their own settlement pattern (e.g. a lich's lair for a new lich template, an elemental nexus for new elementals, a giant stronghold, etc.).
- **Racial higher-level spells** — elf and tiefling lineages grant spells at levels 3 and 5. Need a way to determine NPC "level" from CR to decide which spells are available.
- **Worship weighting** — deity selection for temples/NPCs could be weighted by geography (sea god near coast) and racial demographics (nature god in elven areas). Core system works, weighting is a refinement.
- **Lineage-aware demographics** — lineage selection is currently equal-weight random. Could be weighted by biome tags (more drow underground, more wood elves in forests).
- **Inheritance rethink** — `inheritAttributes` was designed for simple attribute copying but is now used for nuanced things like worship. Consider having `customSetup` handle inheritance explicitly by walking the parent chain, rather than requiring placeholder attributes.
- **NPC description pools** — current pools are a good start but could be expanded. Consider race-specific descriptions (dwarven braids, elven grace, etc.) and profession-specific ones (priest-specific religious items, guard-specific armor details).
- **Preset worlds** — the `presets` registry is empty (dropdown hidden). `forgottenRealms.ts` is scrapped (copyrighted, not distributable — kept for reference only, do not re-register). `everquest.ts` (Norrath) is OK to ship and is the next planned preset — to be re-enabled alongside a dedicated EverQuest **setting source** (`filterPolicy: 'setting'`) so its unique content is opt-in. See "Building a Setting Source" above for the step-by-step. **Next session.**
- **`book` constant in `constants.ts`** — may be unused now, can be cleaned up.

## Content Coverage

### Prime Material — Regions (children of Continent)
Forests (rainforest, deciduous, coniferous), tundra, plains, hills, swamp, desert, savanna, coast, mountain range, sea, lake, river. Plus rare **Forgotten biomes** (forgotten island, forgotten forest, forgotten valley) with dinosaurs.

### Planar Geography
Planar layers inherit alignment and element from their parent plane. Element-conditioned biomes:
- **Fire**: Lava Lakes, Ash Fields
- **Water**: Abyssal Depths, Coral Palaces
- **Earth**: Crystal Caverns, Stone Forests
- **Air**: Cloud Islands, Storm Fronts
- **Positive Energy**: Radiant Groves, Life Springs
- **Negative Energy**: Necropolises, Bone Wastes
- **None**: Chaos Wastes, Ethereal Meadows

Alignment-conditioned biomes:
- **Evil**: Infernal Citadels (devils), Abyssal Fortresses (demons)
- **Good**: Celestial Spires (angels)

### Divine Realms
Planar layers can spawn a Divine Realm (max 1 per layer) — the seat of a deity's power. Divine realms inherit alignment and element from their parent layer and contain a deity hierarchy:
- **Greater Deity** (max 1) — CR 26–30, `legendary: 5`. Can have lesser deities and demigods as attendants.
- **Lesser Deity** (max 2) — CR 22–26, `legendary: 5`. Can have demigods as attendants.
- **Demigod** (max 3) — CR 20–24, `legendary: 3`. Leaf node (no children).

Deity types use `dynamicCreature: true` — the base creature is dynamically selected at generation time by scoring every creature in `monsterList` for fitness. The `creature`, `variant`, and `legendary` values are stored on the node's attributes so they persist through save/load and are editable by users.

The dynamic creature scorer (`scoreCreatureForDeity`) evaluates each creature based on:
- **Max real CR** — highest benchmark with actual stats (checks for `hitDice`), capped at 20. Creatures below CR 2 are excluded.
- **Creature type affinity** — celestials on good planes, fiends on evil planes, dragons everywhere, etc. Hard exclusions for mismatches (celestial on evil plane = 0).
- **Alignment compatibility** — exact match, partial axis match, or neutral/unaligned flexibility.
- **Element inference from immunities** — fire immunity on a fire plane, cold immunity on water/air, etc.
- **Domain affinity** — creature type mapped to compatible domains (beast → nature/beasts, fiend → war/trickery/death, etc.)

This system is self-maintaining — new creatures added to `monsterList` are automatically considered without updating any pool or list.

Each deity is assigned a **domain** (portfolio) at generation time — War, Nature, Knowledge, Death, Life, Tempest, Forge, Trickery, Light, Shadow, Sea, Beasts, or Arcana. Domains are filtered by alignment and element compatibility (e.g. no Death on positive energy planes, no Life on negative energy). The domain influences:
- **Creature selection** — the domain key is passed to the scorer, which gives bonus weight to creatures whose type has affinity with that domain
- **Title generation** — each domain contributes its own title pool to the name generator (e.g. War adds "the Conqueror", "Lord of Battles")

Divine realms also spawn alignment-appropriate attendant creatures (angel patrols, devil patrols, demon hordes).

### Avatars
Avatars are manifestations of deities outside their home plane. They spawn as rare encounters (`min: 0, max: 1`) inside biomes and locations — both on the material plane (forests, seas, mountains, etc.) and on planar biomes (lava lakes, celestial spires, etc.). CR 15–22, `legendary: 3`.

The `avatarSetup` function uses two signals to select an appropriate deity:
1. **Node registry** — queries for existing deities, weighted by tier (greater > lesser > demigod)
2. **Location tags** — collected from the ancestor chain via `collectAncestorTags()`. Tags like `water`, `forest`, `mountain` are matched against deity domains via `tagToDomains` mapping. A Sea domain deity gets a 3x weight boost when the avatar spawns in a `water`-tagged biome.

If no deities exist yet, the avatar falls back to tag-aware domain selection (`selectDomainByTags`), then standard alignment/element-based creature selection.

### Tags
Static metadata on `ObjectTypeTemplate` describing what a type represents. Current tag vocabulary:
- **Element**: `water`, `fire`, `earth`, `air`
- **Biome**: `forest`, `mountain`, `plains`, `desert`, `swamp`, `hills`
- **Climate**: `cold`
- **Other**: `underground`, `undead`, `evil`, `good`

Tags are mapped to deity domains via `tagToDomains` in `attributeGenerators.ts` (e.g. `water` → Sea/Tempest, `forest` → Nature/Beasts). This mapping is the single source of truth for tag-to-domain relationships.

### Creature Groups
Beasts: wolf packs, bear dens, boar sounders, horse herds, shark packs, whale pods, spider nests, eagle nests, ape troops, dryad groves, awakened tree copses, crocodile dens, camel caravans, elephant/mammoth herds, lion prides, hyena packs, jackal packs, zebra herds, gorilla troops, warthog sounders, monkey/baboon troops, vulture flocks, badger setts, bat colonies, alligator dens, triceratops herds, pterosaur flocks, elk herds, constrictor/poisonous snake nests, rhinoceros crashes, goat herds, owl nests, scorpion nests, giant toad dens, octopus dens, squid shoals, giant wasp nests, rat warrens, worg packs.

Undead: shadow haunts, skeleton crypts, zombie hordes, ghoul packs.

Fiends: demon hordes, demon warbands, devil patrols, devil legions.

Humanoids: goblin warbands (with runt/veteran/chief hierarchy), frost giant patrols, ogre gangs.

### Creature Settlements
Large, diverse gatherings of a creature type with internal structure and rare leadership nodes:
- **Fey Village** (`feyVillage`) — spawns in forests, forgotten biomes, positive energy planes. Contains dryad groves, sprite nests, satyr circles, centaur patrols, blink dog packs, fey huts, and rarely an Archfey's Court with a legendary CR 15–22 archfey (random sentient fey base).
- **Ancient Crypt** (`undeadCrypt`) — spawns in swamps, hills, necropolis, bone waste. Contains skeleton crypts, zombie hordes, shadow haunts, ghoul packs, wights, wraiths, specters, and rarely a Crypt Lord's Chamber.
- **Demonic Fortress** (`demonicFortress`) — spawns in abyssal fortresses. Contains demon hordes, warbands, mariliths, balors, and rarely a Demon Lord's Throne with a balor + marilith retinue.
- **Angelic Citadel** (`angelicCitadel`) — spawns in celestial spires. Contains angel patrols, solars, and rarely a Solar's Court.
- **Devil Bastion** (`devilBastion`) — spawns in infernal citadels. Contains devil patrols, legions, erinyes, ice devils, pit fiends, and rarely a Pit Fiend's Court with a full infernal hierarchy.

When adding new creature types, consider whether they belong in an existing creature settlement or warrant a new one.

### NPCs
NPC types use `customSetup` (`npcSetup`) to select race, gender, worship, and alignment at generation time.

**Race selection** (`selectNpcRace`): walks up the parent chain looking for `racialDemographics`, then does a weighted random pick. Falls back to equal probability across all races if no demographics found.

**Racial demographics**: stored as `Record<string, number>` on geography and settlement nodes. Generated fresh (0–30 per race) at the top level, inherited with ±10 variation by children. A race at 0 stays at 0 in all descendants (that race doesn't exist in this region). All-zero guard ensures at least one race has presence.

**Available races** (12 total, SRD 5.2 + legacy): dragonborn, dwarf, elf, gnome, goliath, half-elf (legacy), half-orc (legacy), halfling, human, orc, tiefling. Each has alignment bias weights in `constants.ts` (except human — equal probability). Race data updated to SRD 5.2 mechanics (speed, darkvision, traits).

**Lineages**: Races with lineages (dragonborn 10 colors, elf drow/high/wood, gnome forest/rock, goliath 6 giant ancestries, tiefling abyssal/chthonic/infernal) get a random lineage at generation time via `selectNpcLineage`. Lineage is stored on the node and editable. Races without lineages (dwarf, halfling, human, half-elf, half-orc, orc) get an empty string.

**Gender**: Male (45%), Female (45%), Non-binary (10%). Stored as a string on the node.

**Worship**: NPCs may worship a named deity (from the registry), a divine domain ("War", "Nature"), or an alignment cause ("Lawful Good", "the Balance"). Temples select worship once via `templeSetup`, and all child NPCs inherit it via `inheritAttributes`. NPCs outside temples select their own.

**Alignment** (`selectNpcAlignment`): derived from worship context. Priority order:
1. Named deity worship → use that deity's alignment from the registry
2. Alignment dedication (e.g. "Lawful Good") → use directly
3. Alignment-adjacent dedication (e.g. "Law and Order") → pick from compatible alignments
4. Domain worship (e.g. "War") → pick from alignments compatible with that domain's constraints
5. Fallback → random with racial bias from `RaceData.alignmentBias` (weighted random), or equal probability for races without bias (humans)

Racial alignment biases are defined on `RaceData` in `constants.ts`. Most races lean toward their SRD tendencies (dwarves toward lawful good, elves toward chaotic good, tieflings toward chaotic, etc.). Humans have no bias — equal probability across all alignments.

Alignment is passed to the statblock modal (`statblock.alignment`) and appended as `&alignment=` on the monster scaler link.

**Adventure Hooks** (`adventureHookGenerators.ts`): every NPC gets an `adventureHook` attribute — free text (editable `'textarea'`) pointing players toward adventure. Hooks span a spectrum from passive rumors ("heard something lurks in the woods") to actionable requests ("wants someone to hunt down Grix the Cleaver"). Generated in `npcSetup` (runs last, after alignment/worship resolve).

The generator mirrors the layered-pool approach of `generateTitle`: `buildHookProfile(node, typeMap)` inspects signals the NPC already carries — base `creature` (martial vs. civilian), `typeName` (fine role), parent building type, `alignment`, `worship`, and ancestor tags — and accumulates (a) an `actionableChance` score and (b) a set of applicable pools. It then rolls rumor-vs-actionable and picks from the assembled pools. No per-type maintenance map: new NPC types inherit behavior from their base creature, tags, worship, and parent building.

- **Rumor pools**: `genericRumors` (always) + tag-flavored pools keyed by ancestor tag (`forest`, `water`, `mountain`, `desert`, `swamp`, `underground`, `undead`, `cold`, `fire`).
- **Actionable pools**: `selfContainedActionable` (always — lost heirloom, escort), `combatActionable` (martial creatures), `shadyActionable` (criminal parent or evil alignment), `faithActionable` (has worship).
- **Actionable weighting**: baseline 15%; +45 for martial base creatures, +15 for leadership roles (bandit captain/noble/knight), +15 for social/gossip parents (tavern, court, shop), +10 for criminal/evil context. Clamped at 85%.

**World-aware actionable hooks** (registry-backed): when an actionable hook fires, ~50% of the time it tries `tryWorldAwareHook()`, which queries the registry for a real quest target (`npcBanditCaptain`, `undeadCrypt`, `demonicFortress`) and **bakes the target's name into the hook string as a snapshot** — no live node reference to serialize. This survives the target being moved, renamed, or deleted (the NPC simply "heard" about it). If no candidate exists in the registry yet, it falls back to a self-contained actionable hook or rumor.

**Geographic-neighbor rumors** (tree-walk-backed): when a rumor fires, ~40% of the time it tries `tryNeighborRumor()`, which references a named region *elsewhere on the same landmass* ("strange creatures prowling [Forest name]"). Unlike the registry (a flat global bucket, good for "any bandit captain anywhere"), geographic neighbors are inherently relative to where the NPC stands, so this uses **tree-walking** instead: `findNeighborRegions()` walks up to the nearest `continent`-tagged ancestor (scope), then walks back *down* collecting named `region`-tagged nodes that are NOT on the NPC's own ancestor path (so a plains-town NPC talks about the *forest* on the same continent, not its own plains). The neighbor's biome tag selects a flavored pool (`neighborRumorsByTag`), falling back to `genericNeighborRumors`. Name is snapshotted like all other hooks. If no named neighbor exists yet (e.g. sibling regions not generated), it falls back to local rumor pools.

Both mechanisms embody the same compromise: reference real nodes when they exist, degrade gracefully when they don't. The registry is right for distance-agnostic targets; tree-walking is right for locality-relative ones (avoids storing back-references / the ID-serialization problem).

**Name generation** (`npcNameGenerator` in `npcNameGenerators.ts`): master dispatcher that reads race and gender, delegates to one of 9 racial generators. Each generator has gendered first name pools and family/clan name pools. Non-binary NPCs draw from either gendered pool randomly. Half-elves draw from both human and elven pools.

Current NPC types:
- **Religious**: `npcAcolyte` (CR 1/4–1, priest/healer), `npcPriest` (CR 2–5, priest/healer)
- **Military**: `npcGuard` (CR 1/8–1, guard), `npcVeteran` (CR 2–5, veteran), `npcKnight` (CR 3–6, knight), `npcKnightGrandmaster` (CR 5–8, knight, inherits worship), `npcKnightMember` (CR 3–5, knight, inherits worship), `npcSquire` (CR 1/2–2, guard, inherits worship)
- **Civilian**: `npcNoble` (CR 1/8–1, noble), `npcCommoner` (CR 0, commoner), `npcMage` (CR 4–8, mage)
- **Criminal**: `npcBandit` (CR 1/8–1/2, bandit), `npcBanditCaptain` (CR 2–4, banditCaptain), `npcThug` (CR 1/2–2, thug)
- **Wilderness**: `npcScout` (CR 1/2–2, scout)

**Lineage**: NPCs get a random lineage from their race's available lineages (equal weight). Stored as `node.attributes.lineage` (the lineage name string). Editable via a dropdown in the info panel that rebuilds when race changes. Passed to `scaleMonster` as `options.lineage` (resolved to index) for the statblock modal and monster scaler link. Races without lineages (human, half-elf, half-orc) get an empty string.

**Knighthood Orders**: Similar to temples — worship-based organizations containing a grandmaster, knights, and squires. Named via `knighthoodOrderNameGenerator` (worship-based, flavor symbol, or named order). Spawn in temple districts for cities, directly in large towns.

**Role-specific NPC wrappers**: Reuse base creature templates (commoner, guard, etc.) with descriptive `typeName` values for context. Examples: `npcShopkeeper` (commoner), `npcBlacksmith` (commoner), `npcTavernkeeper` (commoner), `npcButler` (commoner), `npcCook` (commoner). These spawn inside their respective buildings and inherit worship/demographics from the parent chain.

**Wilderness NPC groups**: Spawn in biomes alongside beast/monster groups:
- `merchantCaravan` — traders with guards, spawn on roads/plains
- `guardPatrol` — guards + veteran leader
- `knightsErrant` — wandering knights
- `undeadHunters` — scouts/veterans specializing in undead areas
- `monsterHunters` — scouts/veterans in dangerous biomes
- `scoutParty` — scouts in wilderness
- `banditCamp` / `banditPatrol` — bandits + captain in lawless areas
- `pirateShip` — bandits/thugs on coastal/water biomes

**Dragon lairs**: `dragonLair` is an area type that sets a `dragonColor` attribute and spawns an adult dragon + young dragons + dragonborn servants. The lair's `dragonColor` is inherited by children. Uses `dragonbornNpcSetup` for color-specific dragonborn (pre-sets race to dragonborn with matching lineage before `npcSetup` runs, so `npcSetup` skips race/lineage selection).

**Environmental variants**: Temperature-conditioned caves can spawn ice goblins (cold biomes) or fire goblins (fire/hot biomes) using condition-based children with temperature/element checks.

**Profession commoners**: Biome-specific civilian NPCs using the commoner template with role typeNames: `npcFarmer` (plains/farms), `npcFisher` (coast/water), `npcLumberjack` (forest), `npcMiner` (mountain/underground), `npcShepherd` (hills/plains).

**Farms**: A building type (`farm`) that contains farmer NPCs, crops (flavor children), and livestock (beast groups like chicken coops, pig pens, cattle herds). Spawn in towns, villages, hamlets, and thorps.

### Info Panel — Special Renderers
- **Creature/Variant** (dynamic creature nodes): creature dropdown with friendly names from `monsterList`, variant dropdown that rebuilds when creature changes, hidden when no variants exist
- **Challenge Rating**: always a dropdown of all valid CRs with `stringForCR` display (1/8, 1/4, 1/2, etc.)
- **Alignment**: dropdown of all 9 standard alignments (from `alignmentList`)
- **Racial Demographics**: collapsible `<details>` group with a number input per race
- **Race**: dropdown of all race keys with label display
- **Lineage**: dropdown of lineages for the selected race, rebuilds when race changes. Hidden for races without lineages.
- **Gender**: dropdown (Male, Female, Non-binary)
- **Settlement Type**: dropdown (Standard, Coastal, Underground)
- **Description / Adventure Hook**: multi-line `<textarea>` (registered as `'textarea'` in `attributeEditors`)
- Generic select options use `labels` map for display text when available

### Legendary Creatures
Rare, high-CR creatures with `legendary: 3` that spawn with legendary resistances and auto-generated legendary actions:
- **Mythological beasts**: Dread Wolf, Dire Boar, Thunderbird, Broodmother, Megalodon
- **Aquatic**: Kraken (real SRD entry, CR 23)
- **Dragons**: All 10 colors (5 chromatic + 5 metallic), CR 6–24
- **Demons**: Marilith (CR 14–18), Balor (CR 17–22)
- **Devils**: Pit Fiend (CR 18–22)
- **Angels**: Solar (CR 18–24)
- **Undead**: Crypt Lord, Dread Wraith

### Title Generator
`generateTitle(options: TitleOptions)` in `titleGenerator.ts` — a unified title generator that builds a pool from layered sources based on context, then returns a single random title. All creature and deity name generators delegate to this function instead of maintaining their own title pools.

**Pool layers** (each adds titles to the combined pool when the relevant option is provided):
1. **Generic** — always available: "the Ancient", "the Undying", "the Veiled", etc.
2. **Power tier** (CR-gated) — humble titles below CR 5, notable at 5+, epic at 12+, cosmic at 20+
3. **Alignment** — good/evil/lawful/chaotic titles, plus combined axis titles (e.g. lawful evil gets "the Tyrant", "Lord of Chains")
4. **Element** — fire/water/earth/air/positive/negative energy titles
5. **Creature type** — dragon, celestial, fiend, undead, fey, elemental, beast, giant, humanoid, plant
6. **Domain** — pulled from `deityDomains[domain].titles` (domain data stays in `attributeGenerators.ts`)
7. **Deity tier** — greater/lesser/demigod/avatar-specific titles
8. **Dragon color** — color-specific element titles (red → fire, white → ice, etc.)

**TitleOptions fields** (all optional): `alignment`, `element`, `cr`, `creatureType`, `domain`, `tier`, `dragonColor`.

Callers control title probability themselves (e.g. dragons scale with CR, deities are nearly guaranteed). The generator just builds the pool and picks — it always returns a title when called.

### Name Generators
- `planarNameGenerator` — three formats: title only ("The Realm of Fire"), name only ("Eryslai"), or name + title ("Disia, the Kingdom of Angels"). Planar layers get layer-specific place nouns (Layer, Stratum, Tier, etc.).
- `dragonNameGenerator` — draconic syllable pools + titles via `generateTitle` with alignment, CR, creatureType, and dragonColor. Title probability scales with CR.
- `extraplanarNameGenerator` — shared by angels, demons, and devils. Biblical/Enochian syllable pools. Titles via `generateTitle` with alignment, CR, and inferred creatureType (celestial/fiend). Small chance of title-only for ancient beings.
- `deityNameGenerator` — three paths: exotic divine name (most common), creature-derived name (ascended mortal, uses base creature's name generator), or title-only (ancient beings). Titles via `generateTitle` with alignment, element, domain, CR, and deity tier.
- `avatarNameGenerator` — "Avatar of [Deity Name]" (70%) or "[Own Name], Avatar of [Deity Name]" (30%), with deity name generator fallback for standalone avatars.
- `npcNameGenerator` (in `npcNameGenerators.ts`) — master dispatcher with 9 racial generators: human (European fantasy), dwarf (Norse/Germanic + clan), elf (melodic/flowing), halfling (English countryside), gnome (whimsical), half-elf (mixed human/elven pools), half-orc (guttural, optional clan), dragonborn (draconic + clan), tiefling (infernal + virtue names).
- `feyNameGenerator` — nature-inspired names with titles via `generateTitle` with CR and creatureType 'fey'.
- `knighthoodOrderNameGenerator` — three paths: worship-based ("Knights of War"), flavor symbol ("Order of the White Rose"), or named ("The Silver Brotherhood").
- `forestNameGenerator`, `mountainNameGenerator`, `mountainRangeNameGenerator`, `plainsNameGenerator`, `swampNameGenerator`, `desertNameGenerator`, `savannaNameGenerator`, `forgottenBiomeNameGenerator`, `caveNameGenerator`, `lakeNameGenerator`, `riverNameGenerator`, `continentNameGenerator`.

### Reskinned Creatures
Using one `monsterList` entry at different CRs or with different display names:
- `saberToothedTiger` → lion, panther, tiger
- `ape` → gorilla
- `horse` riding → zebra
- `wolf` → hyena, jackal
- `boar` → warthog
- `badger` → wolverine
- `baboon` → monkey
- `crocodile` → alligator
- `eagle` → vulture (now has own entry)
- `bat` → cave bats
- `cephalopod` squid → squid
- `elephant` → mammoth, triceratops
- `trex` → tyrannosaurus rex
- `quetzalcoatlus` → pterosaur

## Conventions

- New node types go in `src/scripts/data/objectTypes.ts`
- New shared constants go in `src/scripts/data/constants.ts`
- New attribute generator functions go in `src/scripts/attributeGenerators.ts`
- New location/creature name generators go in `src/scripts/nameGenerators.ts`
- New NPC name generators go in `src/scripts/npcNameGenerators.ts`
- Node type keys are camelCase (e.g. `coastalCityLarge`, `mammothHerd`)
- Non-beast creature nodes should have an `alignment` attribute for name generator compatibility
- The hierarchy is: Multiverse → Planar Cluster → Planet/Plane → Continent/Ocean (or Planar Layer) → Region/Biome → Locality/Settlement → District/Building → NPC/Creature
- Cities (citySmall+) should only have districts as direct children. Districts and towns/villages have buildings as direct children. NPCs spawn inside buildings, not directly in settlements.
- Creatures and creature groups should spawn inside biomes/localities, not directly on regions or layers
- Dynamic creature types (like deities) use `dynamicCreature: true` on the template and store `creature`, `variant`, and `legendary` as node attributes. The statblock modal and link builder check node attributes when `dynamicCreature` is true.
- `customSetup` runs after attribute generation and before the name generator. It's the right place for any logic that needs to read resolved attributes and set derived ones. Used by deities (`deitySetup`), avatars (`avatarSetup`), NPCs (`npcSetup`), temples (`templeSetup`), and settlements (`settlementSetup`).
- Attribute generation handles primitive values (string, number, boolean) as fixed defaults — useful for fallback values when inheritance fails.
- Category attribute injection uses "set if not already defined" — type-specific attributes take precedence over category defaults.
- The tree UI uses custom `div.node` markup with separate click targets: `.node-toggle` for expand/collapse, `.node-label` for selection. Not `<details>`/`<summary>`.
- `attributeEditors` overrides the default editor for specific attributes (e.g. CR → dropdown, race → dropdown, gender → dropdown). The generic select renderer uses the `labels` map for display text.
- `npcSetup` skips race/lineage selection if already set on the node — allows pre-set race for specific NPC types (e.g. dragonborn servants in dragon lairs via `dragonbornNpcSetup`).
- `attributeGenerators.ts` now has its own `objectTypesRef` forward reference (via `setObjectTypesRef`, wired in `objectTypes.ts` alongside the partial-file refs). This lets setup functions there (e.g. `npcSetup`) read template metadata and ancestor tags — needed by the adventure hook generator — without importing `objectTypes` and creating a circular dependency.
- `markUnsaved()` replaces direct `saved = false` — debounces auto-save to localStorage so rapid edits don't thrash storage.
- The info panel change handler skips elements without an `id` or with class `add-child-select` to avoid triggering saves on UI-only controls.
- `recursivePostParseProcess` cleans up stale `"undefined"` attribute keys from older saves during tree load/import.
- **Design philosophy**: data defines what exists, code defines what makes sense. `objectTypes` is the backbone (what can spawn where), while `customSetup` functions, the dynamic creature scorer, and tag-based selection add the intelligence that makes generated worlds feel coherent.

## Steering Maintenance

Keep this file up to date as the project evolves. After any session that changes architecture, adds new patterns, resolves a TODO, or introduces new conventions, update the relevant sections. Don't wait to be asked.
