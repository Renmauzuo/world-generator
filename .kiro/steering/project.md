# World Generator — Project Steering

## What This Is

A browser-based random world generator for tabletop RPGs (D&D-flavored). The core philosophy is **selective randomization** — users can hand-craft as much as they want and let the tool fill in the rest. Most existing generators randomize everything; this one doesn't.

It is intended for public release eventually.

## Tech Stack

- **Source**: TypeScript (`src/scripts/`) + Pug (`src/pages/`) + SCSS (`src/styles/`)
- **Build**: Gulp 4 + Rollup (via `gulp-better-rollup`) + `rollup-plugin-typescript2`
- **CSS**: Dart Sass (`sass` package) + PostCSS + cssnano
- **Runtime**: jQuery (loaded from CDN), vanilla browser APIs
- **Packages**: `@toolkit5e/monster-scaler` and `@toolkit5e/statblock` (consumed from npm as a normal dependency)
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
├── helpers.ts                # Pure utility functions (rand, weightedRand, operators, etc.)
├── nameGenerators.ts         # Name generator functions + queuedName state
├── attributeGenerators.ts    # Attribute value generators, categoryAttributes, attributeEditors, labels
├── scripts.ts                # Entry point — DOM logic, event handlers, save/load
└── data/
    ├── constants.ts          # Shared data constants (populationDensity, temperatureList, etc.)
    └── objectTypes.ts        # The full objectTypes map + category attribute injection loop
```

The Rollup entry point is `src/scripts/scripts.ts` only — other files are imported as modules, not processed separately.

## Key Concepts

### WorldNode
The core data structure. A node has a `type` (key into `objectTypes`), optional `name`, optional `attributes`, optional `children`, and a reference to its `parent` and `domElement`. Parent and domElement are stripped before JSON serialization.

### objectTypes
The data-driven definition of every node type. Each entry defines:
- `typeName` — display name
- `categories` — inherits attribute sets from `categoryAttributes` (geography, plane, settlement)
- `attributes` — attribute definitions (arrays = picklist, functions = generator, `{min,max}` = range)
- `children` — child generation rules with min/max, weightedRange, prerequisites, requiredSibling
- `nameGenerator` — optional function to generate a name
- `inheritAttributes` — list of attribute keys to copy from parent instead of generating fresh
- `creature` / `variant` — links to the monster-scaler companion tool
- `referenceBook` / `referencePage` — reference text shown in info panel

### Category Attributes
Types that declare `categories` automatically get attributes injected from `categoryAttributes` in `attributeGenerators.ts`. This happens at module load time in `objectTypes.ts` via a post-definition loop.

### Child Generation
Children are generated lazily — only when a `<details>` node is expanded. The `needsChildren` flag tracks whether generation has happened yet.

Child templates support:
- `min`/`max` — random count in range
- `weightedRange` — weighted random count (e.g. `{1:1, 2:2, 3:3}`)
- `type` as a weighted object — weighted random type selection
- `conditions` — array of `Condition` objects evaluated as OR — child is valid if any condition passes. Each condition has `attribute`, `value`, and optional `match` (default `true` = must equal, `false` = must not equal)
- `requiredSibling` — always spawn this type alongside the child

- **Child generation** is now on-demand via a "Generate Children" button on each node. Clicking it generates and appends a set of children and opens the `<details>` element. The button can be clicked multiple times to add more children.

## Known TODOs / In-Flight

- **`races` / `racialDemographics`** will likely be removed — the project is moving toward shared npm packages for this kind of data
- **TypeScript strictness** is currently `strict: false` — plan to enable incrementally once the shared-package refactor stabilizes
- **Default root** is `multiverse` — `createRootNode('tundra')` in `scripts.ts` is a dev leftover and should be reverted
- Remaining `//TODO` stubs: planar layer geography, demiplane geography, moons/celestial bodies, coastal settlement children
- **Full creature coverage** — long-term goal is for every creature in `@toolkit5e/monster-scaler`'s `monsterList` to have a path in the world generator's node hierarchy. The typed `creature` field (`MonsterID`) ensures only valid keys are used. Currently referenced: all 27 monsterList entries. Remaining unplaced: `commoner`, `dolphinDelighter`.

## Content Coverage

### Regions (children of Continent)
Forests (rainforest, deciduous, coniferous), tundra, plains, hills, swamp, desert, savanna, coast, mountain range, sea, lake, river. Plus rare **Forgotten biomes** (forgotten island, forgotten forest, forgotten valley) that contain dinosaurs.

### Creature Groups
Wolf packs, bear dens, boar sounders, horse herds, shark packs, whale pods, spider nests, eagle nests, ape troops, dryad groves, awakened tree copses, crocodile dens, shadow haunts, camel caravans, elephant herds, mammoth herds, lion prides, hyena packs, jackal packs, zebra herds, gorilla troops, warthog sounders, monkey troops, baboon troops, vulture flocks, badger setts, bat colonies, alligator dens, triceratops herds, pterosaur flocks.

### Reskinned Creatures
The mammoth/elephant pattern — using one `monsterList` entry at different CRs or with different display names to represent related real-world animals:
- `saberToothedTiger` → lion (CR 1–4), panther (CR 0.25–1), tiger (CR 1–3)
- `ape` → gorilla (CR 2–7)
- `horse` riding → zebra (warm plains/savanna)
- `wolf` → hyena (CR 0.25–1), jackal (CR 0–0.25)
- `boar` → warthog (warm climate)
- `badger` → wolverine (CR 0.25–1, cold forests/tundra)
- `baboon` → monkey (tropical forest)
- `crocodile` → alligator (swamp)
- `eagle` → vulture (CR 0–0.125)
- `bat` → cave bats

- `elephant` triceratops → triceratops (CR 1–7, forgotten biomes)
- `trex` → tyrannosaurus rex (CR 6–10, forgotten biomes)
- `quetzalcoatlus` → pterosaur (CR 2–5, forgotten biomes)

### Forgotten Biomes
Rare ancient pockets where civilization hasn't reached and prehistoric creatures survived. Spawn as rare children (min 0, max 1) of warm continents, oceans/archipelagos, and mountain ranges. Each contains a mix of dinosaurs (T-Rex, triceratops herds, pterosaur flocks) alongside regular fauna. Named with evocative adjectives: "The Forgotten Island", "The Primeval Valley", etc.

### Name Generators
`forestNameGenerator` (temperature-aware), `mountainNameGenerator`, `mountainRangeNameGenerator`, `plainsNameGenerator`, `swampNameGenerator`, `desertNameGenerator`, `savannaNameGenerator`, `forgottenBiomeNameGenerator` (type-aware), `caveNameGenerator`, `lakeNameGenerator`, `riverNameGenerator` — plus the original planar/continent generators.

## Conventions

- New node types go in `src/scripts/data/objectTypes.ts`
- New shared constants go in `src/scripts/data/constants.ts`
- New attribute generator functions go in `src/scripts/attributeGenerators.ts`
- New name generators go in `src/scripts/nameGenerators.ts`
- Node type keys are camelCase (e.g. `coastalCityLarge`, `mammothHerd`)
- The hierarchy is roughly: Multiverse → Planar Cluster → Planet/Plane → Continent/Ocean → Region → Locality → Point of Interest / Creature

## Steering Maintenance

Keep this file up to date as the project evolves. After any session that changes architecture, adds new patterns, resolves a TODO, or introduces new conventions, update the relevant sections. Don't wait to be asked.
