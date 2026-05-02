# World Generator — Project Steering

## What This Is

A browser-based random world generator for tabletop RPGs (D&D-flavored). The core philosophy is **selective randomization** — users can hand-craft as much as they want and let the tool fill in the rest. Most existing generators randomize everything; this one doesn't.

It is intended for public release eventually.

## Tech Stack

- **Source**: TypeScript (`src/scripts/`) + Pug (`src/pages/`) + SCSS (`src/styles/`)
- **Build**: Gulp 4 + Rollup (via `gulp-better-rollup`) + `rollup-plugin-typescript2`
- **CSS**: Dart Sass (`sass` package) + PostCSS + cssnano
- **Runtime**: jQuery (loaded from CDN), vanilla browser APIs
- **Packages**: `@toolkit5e/base`, `@toolkit5e/monster-scaler`, and `@toolkit5e/statblock` (consumed via `file:` references to the local toolkit5e workspace for development)
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
        ├── forgottenRealms.ts # Forgotten Realms world tree
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

### Creature Alignment
Non-beast creature nodes have an `alignment` attribute (e.g. `'Chaotic Evil'`, `'Lawful Good'`). This is used by name generators to select appropriate titles without maintaining hardcoded type lists. The alignment strings match the planar system format.

### Category Attributes
Types that declare `categories` automatically get attributes injected from `categoryAttributes` in `attributeGenerators.ts`. This happens at module load time in `objectTypes.ts` via a post-definition loop. Type-specific attributes take precedence — category attributes are only added if not already defined on the type.

Current categories:
- `geography` — populationDensity, racialDemographics, temperature
- `plane` — alignment, element
- `settlement` — racialDemographics

### Settlements
Settlements are unified into a single set of tiers: `thorp`, `hamlet`, `village`, `townSmall`, `townLarge`, `citySmall`, `cityLarge`, `metropolis`. Each tier has a `settlementType` attribute set by `settlementSetup` based on the parent biome's tags:
- Parent with `water` tag → `'Coastal'`
- Parent with `underground` tag → `'Underground'`
- Default → `'Standard'`

The `settlementType` attribute is editable by users and drives condition-based children (e.g. a docks district only spawns in coastal settlements). This replaces the old pattern of duplicating settlement types per biome.

**Settlement hierarchy**: Cities (citySmall, cityLarge, metropolis) should only have **districts** as direct children. Districts and towns/villages have **buildings** as direct children. NPCs spawn inside buildings, not directly in settlements.

Current building types: `temple` (worship-based, contains acolytes and priests), `knighthoodOrder` (worship-based, contains grandmaster + knights + squires).

Current district types: `districtTemple` (contains temples and knighthood orders).

Parent biomes (coast, plains, etc.) spawn settlements using weighted random type selection based on population density.

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

- **TypeScript strictness** is currently `strict: false` — plan to enable incrementally once the shared-package refactor stabilizes
- **Default root** is `multiverse` — `createRootNode('districtTemple')` in `scripts.ts` is a dev leftover and should be reverted
- Remaining `//TODO` stubs: moons/celestial bodies
- **SRD creature coverage** — see `toolkit5e/srd-creatures.md` for the full checklist. NPC statblocks now cover: commoner, guard, bandit, bandit captain, thug, scout, noble, knight, veteran, mage, priest. Major categories remaining: other giants, monstrosities, more humanoid races (kobold, gnoll), constructs, oozes, more undead.
- **Settlement districts and buildings** — cities should only have districts as children, districts and towns have buildings. Currently NPCs spawn directly in settlements as a placeholder. Need to add more district types (market, residential, military, docks) and building types (tavern, shop, barracks, guild hall) to house NPCs properly.
- **Split creatureTypes.ts** — at ~1450 lines it's the largest partial file. Could be split further into NPCs (base NPC types), groups/encounters (wolf packs, demon hordes, etc.), and individual creatures (wolves, bears, dragons, etc.).
- **Racial higher-level spells** — elf and tiefling lineages grant spells at levels 3 and 5. Need a way to determine NPC "level" from CR to decide which spells are available.
- **Worship weighting** — deity selection for temples/NPCs could be weighted by geography (sea god near coast) and racial demographics (nature god in elven areas). Core system works, weighting is a refinement.
- **Lineage-aware demographics** — lineage selection is currently equal-weight random. Could be weighted by biome tags (more drow underground, more wood elves in forests).
- **Inheritance rethink** — `inheritAttributes` was designed for simple attribute copying but is now used for nuanced things like worship. Consider having `customSetup` handle inheritance explicitly by walking the parent chain, rather than requiring placeholder attributes.
- **NPC description pools** — current pools are a good start but could be expanded. Consider race-specific descriptions (dwarven braids, elven grace, etc.) and profession-specific ones (priest-specific religious items, guard-specific armor details).
- **Preset worlds** — preset data files exist but are disabled (copyrighted content). The infrastructure is in place for homebrew presets.
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

**Name generation** (`npcNameGenerator` in `npcNameGenerators.ts`): master dispatcher that reads race and gender, delegates to one of 9 racial generators. Each generator has gendered first name pools and family/clan name pools. Non-binary NPCs draw from either gendered pool randomly. Half-elves draw from both human and elven pools.

Current NPC types:
- **Religious**: `npcAcolyte` (CR 1/4–1, priest/healer), `npcPriest` (CR 2–5, priest/healer)
- **Military**: `npcGuard` (CR 1/8–1, guard), `npcVeteran` (CR 2–5, veteran), `npcKnight` (CR 3–6, knight), `npcKnightGrandmaster` (CR 5–8, knight, inherits worship), `npcKnightMember` (CR 3–5, knight, inherits worship), `npcSquire` (CR 1/2–2, guard, inherits worship)
- **Civilian**: `npcNoble` (CR 1/8–1, noble), `npcCommoner` (CR 0, commoner), `npcMage` (CR 4–8, mage)
- **Criminal**: `npcBandit` (CR 1/8–1/2, bandit), `npcBanditCaptain` (CR 2–4, banditCaptain), `npcThug` (CR 1/2–2, thug)
- **Wilderness**: `npcScout` (CR 1/2–2, scout)

**Lineage**: NPCs get a random lineage from their race's available lineages (equal weight). Stored as `node.attributes.lineage` (the lineage name string). Editable via a dropdown in the info panel that rebuilds when race changes. Passed to `scaleMonster` as `options.lineage` (resolved to index) for the statblock modal and monster scaler link. Races without lineages (human, half-elf, half-orc) get an empty string.

**Knighthood Orders**: Similar to temples — worship-based organizations containing a grandmaster, knights, and squires. Named via `knighthoodOrderNameGenerator` (worship-based, flavor symbol, or named order). Spawn in temple districts for cities, directly in large towns.

### Info Panel — Special Renderers
- **Creature/Variant** (dynamic creature nodes): creature dropdown with friendly names from `monsterList`, variant dropdown that rebuilds when creature changes, hidden when no variants exist
- **Challenge Rating**: always a dropdown of all valid CRs with `stringForCR` display (1/8, 1/4, 1/2, etc.)
- **Alignment**: dropdown of all 9 standard alignments (from `alignmentList`)
- **Racial Demographics**: collapsible `<details>` group with a number input per race
- **Race**: dropdown of all race keys with label display
- **Lineage**: dropdown of lineages for the selected race, rebuilds when race changes. Hidden for races without lineages.
- **Gender**: dropdown (Male, Female, Non-binary)
- **Settlement Type**: dropdown (Standard, Coastal, Underground)
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
- **Design philosophy**: data defines what exists, code defines what makes sense. `objectTypes` is the backbone (what can spawn where), while `customSetup` functions, the dynamic creature scorer, and tag-based selection add the intelligence that makes generated worlds feel coherent.

## Steering Maintenance

Keep this file up to date as the project evolves. After any session that changes architecture, adds new patterns, resolves a TODO, or introduces new conventions, update the relevant sections. Don't wait to be asked.
