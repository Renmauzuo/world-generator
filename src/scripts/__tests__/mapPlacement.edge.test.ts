import { afterEach, describe, it, expect, vi } from 'vitest';
import type { ObjectTypeTemplate, WorldNode } from '../types';
import {
    generateMap,
    reconcilePlacements,
    setObjectTypesRef,
    getMapPlacement,
} from '../mapGenerator';

// Custom map placement: a child type whose template declares `mapPlacement: 'edge'` is
// placed on the outermost ring (perimeter, one tile deep) of its parent's Node_Map, framing
// its non-edge siblings. The coast use case: coasts sit on a continent's rim.

/** Template registry with a `coast` edge-type and a plain interior type. */
const objectTypes: Record<string, ObjectTypeTemplate> = {
    continent: { typeName: 'Continent' },
    coast: { typeName: 'Coast', mapPlacement: 'edge' },
    plains: { typeName: 'Plains' },
};

afterEach(() => {
    vi.restoreAllMocks();
});

/** True if (col,row) lies on the perimeter ring of an n×n grid. */
function onPerimeter(col: number, row: number, n: number): boolean {
    return col === 0 || row === 0 || col === n - 1 || row === n - 1;
}

/** Build a continent node with the given child types (each a distinct POI). */
function makeContinent(childTypes: string[]): WorldNode {
    const children: WorldNode[] = childTypes.map((type, i) => ({ type, name: `${type}#${i}` }));
    return { type: 'continent', name: 'root', children };
}

describe('custom map placement — edge rule', () => {
    it('getMapPlacement resolves the template rule', () => {
        setObjectTypesRef(objectTypes);
        expect(getMapPlacement('coast')).toBe('edge');
        expect(getMapPlacement('plains')).toBeUndefined();
        expect(getMapPlacement('unknownType')).toBeUndefined();
    });

    it('generateMap places every edge child on the grid perimeter', () => {
        setObjectTypesRef(objectTypes);
        // Mix of edge (coast) and interior (plains) children; enough to form a real ring.
        const node = makeContinent([
            'coast',
            'plains',
            'coast',
            'plains',
            'plains',
            'coast',
            'plains',
            'plains',
        ]);

        const map = generateMap(node);
        const n = map.gridSize;

        // Every coast placement is on the perimeter.
        node.children!.forEach((child, i) => {
            const placement = map.placements.find((p) => p.childRef === child.mapRef);
            expect(placement).toBeDefined();
            if (child.type === 'coast') {
                expect(onPerimeter(placement!.col, placement!.row, n)).toBe(true);
            }
        });

        // All tiles are still unique.
        const keys = map.placements.map((p) => `${p.col},${p.row}`);
        expect(new Set(keys).size).toBe(keys.length);
    });

    it('is deterministic in the drawn seed with edge children present', () => {
        setObjectTypesRef(objectTypes);
        vi.spyOn(Math, 'random').mockReturnValue(0.42);

        const a = generateMap(makeContinent(['coast', 'plains', 'coast', 'plains']));
        const b = generateMap(makeContinent(['coast', 'plains', 'coast', 'plains']));

        expect(a.layoutSeed).toBe(b.layoutSeed);
        expect(a.gridSize).toBe(b.gridSize);
        for (let i = 0; i < a.placements.length; i++) {
            expect(b.placements[i].col).toBe(a.placements[i].col);
            expect(b.placements[i].row).toBe(a.placements[i].row);
        }
    });

    it('auto-places a newly added edge child onto a free perimeter tile', () => {
        setObjectTypesRef(objectTypes);
        // Start with interior children only, generate the map, then add a coast and reconcile.
        const node = makeContinent(['plains', 'plains', 'plains']);
        const map = generateMap(node);
        const n0 = map.gridSize;

        const coast: WorldNode = { type: 'coast', name: 'new coast' };
        node.children!.push(coast);

        const changed = reconcilePlacements(node);
        expect(changed).toBe(true);

        const n = node.map!.gridSize;
        const placement = node.map!.placements.find((p) => p.childRef === coast.mapRef);
        expect(placement).toBeDefined();
        // The grid is at least as large as before and the coast sits on the perimeter
        // (unless the perimeter was somehow full, which it is not for this small set).
        expect(n).toBeGreaterThanOrEqual(n0);
        expect(onPerimeter(placement!.col, placement!.row, n)).toBe(true);
    });

    it('reduces to normal placement when no child carries an edge rule', () => {
        setObjectTypesRef(objectTypes);
        vi.spyOn(Math, 'random').mockReturnValue(0.1);
        // All-interior node: edge logic must not alter the all-plains layout vs. a repeat run.
        const a = generateMap(makeContinent(['plains', 'plains', 'plains', 'plains']));
        const b = generateMap(makeContinent(['plains', 'plains', 'plains', 'plains']));
        for (let i = 0; i < a.placements.length; i++) {
            expect(b.placements[i].col).toBe(a.placements[i].col);
            expect(b.placements[i].row).toBe(a.placements[i].row);
        }
    });
});
