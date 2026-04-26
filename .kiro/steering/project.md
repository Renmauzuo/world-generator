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
- Many node types have `//TODO` children stubs (ocean geography, forest children, etc.)
- **Full creature coverage** — long-term goal is for every creature in `@toolkit5e/monster-scaler`'s `monsterList` to have a path in the world generator's node hierarchy. The typed `creature` field (`MonsterID`) ensures only valid keys are used.

## Conventions

- New node types go in `src/scripts/data/objectTypes.ts`
- New shared constants go in `src/scripts/data/constants.ts`
- New attribute generator functions go in `src/scripts/attributeGenerators.ts`
- New name generators go in `src/scripts/nameGenerators.ts`
- Node type keys are camelCase (e.g. `coastalCityLarge`, `mammothHerd`)
- The hierarchy is roughly: Multiverse → Planar Cluster → Planet/Plane → Continent/Ocean → Region → Locality → Point of Interest / Creature

## Steering Maintenance

Keep this file up to date as the project evolves. After any session that changes architecture, adds new patterns, resolves a TODO, or introduces new conventions, update the relevant sections. Don't wait to be asked.
