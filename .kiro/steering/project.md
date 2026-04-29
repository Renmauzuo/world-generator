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
├── attributeGenerators.ts    # Attribute value generators, categoryAttributes, attributeEditors, labels, deity/avatar setup
├── nodeRegistry.ts           # Global node registry for cross-tree references (deities, etc.)
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
- `referenceBook` / `referencePage` — reference text shown in info panel

### Creature Alignment
Non-beast creature nodes have an `alignment` attribute (e.g. `'Chaotic Evil'`, `'Lawful Good'`). This is used by name generators to select appropriate titles without maintaining hardcoded type lists. The alignment strings match the planar system format.

### Category Attributes
Types that declare `categories` automatically get attributes injected from `categoryAttributes` in `attributeGenerators.ts`. This happens at module load time in `objectTypes.ts` via a post-definition loop.

### Child Generation
Children are generated on-demand via a "Generate Children" button. If a generation pass produces zero children (all `min: 0` rolls came up 0), it retries up to 3 times to avoid empty results.

Child templates support:
- `min`/`max` — random count in range
- `weightedRange` — weighted random count
- `type` as a weighted object — weighted random type selection
- `conditions` — array of `Condition` objects evaluated as OR
- `requiredSibling` — always spawn this type alongside the child

### Node Registry
A global `Map<string, WorldNode[]>` in `nodeRegistry.ts` that tracks nodes by type for cross-tree references. Only types with `registered: true` on their template are tracked. The registry is:
- Populated in `generateNode` after a registered node is created
- Cleared and rebuilt from the tree when loading/importing a world from JSON
- Cleared when generating a new world

Currently registered types: `greaterDeity`, `lesserDeity`, `demigod`. Used by avatars to reference a source deity, and will be used by NPCs for patron deity selection.

To avoid circular imports, `nodeRegistry.ts` does not import `objectTypes.ts` — the `registered` check happens in `scripts.ts` before calling `registerNode`. The `registerTree` function accepts a `Set<string>` of registered type keys for the load/import path.

### Preset Worlds
Pre-built world skeletons defined in `src/scripts/data/presets.ts` as typed `WorldNode` trees. Bundled directly into the JS at build time — no fetch/CORS issues. The UI shows a "Load preset" dropdown in the control panel.

Presets provide the high-level structure (planes, continents, major regions) with names and attributes set. Users generate children to fill in the details with random content.

Current presets:
- **Forgotten Realms** — Toril with Faerûn, Kara-Tur, Maztica, Zakhara; the Great Wheel outer planes; inner elemental planes; Feywild and Shadowfell
- **EverQuest** — Norrath with Antonica, Odus, Faydwer, Kunark, Velious; Luclin; the Planes of Power (Fire, Water, Earth, Air, Valor, Growth, Hate, Fear, etc.)

To add a new preset: create a new file in `src/scripts/data/presets/`, export the `WorldNode`, and add it to the array in `index.ts`.

Presets also serve as a **litmus test for the generator's expressiveness**. If a preset requires hand-placing content that the random generator can't produce naturally, that's a signal the generation algorithm needs refinement. The goal is that a fully random world should be able to produce something resembling any of the preset settings — the presets just give it a head start with named locations and creatures.

## Known TODOs / In-Flight

- **`races` / `racialDemographics`** will likely be removed — the project is moving toward shared npm packages for this kind of data
- **TypeScript strictness** is currently `strict: false` — plan to enable incrementally once the shared-package refactor stabilizes
- **Default root** is `multiverse` — `createRootNode('tundra')` in `scripts.ts` is a dev leftover and should be reverted
- Remaining `//TODO` stubs: moons/celestial bodies, coastal settlement children
- **SRD creature coverage** — see `toolkit5e/srd-creatures.md` for the full checklist. Major categories remaining: giants, monstrosities (owlbear, griffon, manticore, etc.), humanoid races (goblin, orc, kobold), NPC statblocks, constructs, oozes, and more undead (vampire, lich).

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

### Legendary Creatures
Rare, high-CR creatures with `legendary: 3` that spawn with legendary resistances and auto-generated legendary actions:
- **Mythological beasts**: Dread Wolf, Dire Boar, Thunderbird, Broodmother, Megalodon
- **Aquatic**: Kraken (real SRD entry, CR 23)
- **Dragons**: All 10 colors (5 chromatic + 5 metallic), CR 6–24
- **Demons**: Marilith (CR 14–18), Balor (CR 17–22)
- **Devils**: Pit Fiend (CR 18–22)
- **Angels**: Solar (CR 18–24)
- **Undead**: Crypt Lord, Dread Wraith

### Name Generators
- `planarNameGenerator` — three formats: title only ("The Realm of Fire"), name only ("Eryslai"), or name + title ("Disia, the Kingdom of Angels"). Planar layers get layer-specific place nouns (Layer, Stratum, Tier, etc.).
- `dragonNameGenerator` — draconic syllable pools + alignment-based and element-based titles. Title probability scales with CR.
- `extraplanarNameGenerator` — shared by angels, demons, and devils. Biblical/Enochian syllable pools. Titles vary by alignment (celestial/demonic/infernal) and CR. Small chance of title-only for ancient beings.
- `deityNameGenerator` — three paths: exotic divine name (most common), creature-derived name (ascended mortal, uses base creature's name generator), or title-only (ancient beings). Titles scale with deity tier and are flavored by alignment. Greater deities get grander titles ("the Almighty", "Creator of Worlds").
- `feyNameGenerator` — nature-inspired names with optional nature-themed titles.
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
- New name generators go in `src/scripts/nameGenerators.ts`
- Node type keys are camelCase (e.g. `coastalCityLarge`, `mammothHerd`)
- Non-beast creature nodes should have an `alignment` attribute for name generator compatibility
- The hierarchy is: Multiverse → Planar Cluster → Planet/Plane → Continent/Ocean (or Planar Layer) → Region/Biome → Locality → Point of Interest / Creature
- Creatures and creature groups should spawn inside biomes/localities, not directly on regions or layers
- Dynamic creature types (like deities) use `dynamicCreature: true` on the template and store `creature`, `variant`, and `legendary` as node attributes. The `customSetup` function in `attributeGenerators.ts` handles all derived attribute logic (domain selection, creature selection, variant, legendary). The statblock modal and link builder check node attributes when `dynamicCreature` is true.
- `customSetup` runs after attribute generation and before the name generator. It's the right place for any logic that needs to read resolved attributes and set derived ones. Deity setup (`deitySetup`) is the first user of this pattern.
- Attribute generation now handles primitive values (string, number, boolean) as fixed defaults — useful for fallback values when inheritance fails.

## Steering Maintenance

Keep this file up to date as the project evolves. After any session that changes architecture, adds new patterns, resolves a TODO, or introduces new conventions, update the relevant sections. Don't wait to be asked.
