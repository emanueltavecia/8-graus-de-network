const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { addEdge, getBFSShortestPath, getBFSMax8Paths, MAX_EDGES, MAX_RESULTS } = require('./bfs.js');

// Helper to build a fresh graph for each test
function makeGraph() {
    return new Map();
}

// Helper to sort paths for deterministic comparison
function sortPaths(paths) {
    return paths.map(p => p.join('>')).sort();
}

// ---------------------------------------------------------------------------
// getBFSShortestPath
// ---------------------------------------------------------------------------

describe('getBFSShortestPath', () => {
    test('returns null when start actor is not in the graph', () => {
        const g = makeGraph();
        addEdge(g, 'A', 'M1');
        assert.equal(getBFSShortestPath(g, 'Unknown', 'A'), null);
    });

    test('returns null when end actor is not in the graph', () => {
        const g = makeGraph();
        addEdge(g, 'A', 'M1');
        assert.equal(getBFSShortestPath(g, 'A', 'Unknown'), null);
    });

    test('returns [actor] when start equals end', () => {
        const g = makeGraph();
        addEdge(g, 'A', 'M1');
        assert.deepEqual(getBFSShortestPath(g, 'A', 'A'), ['A']);
    });

    test('returns null when no path exists between two actors', () => {
        const g = makeGraph();
        addEdge(g, 'A', 'M1');
        addEdge(g, 'B', 'M2'); // disconnected component
        assert.equal(getBFSShortestPath(g, 'A', 'B'), null);
    });

    test('finds direct 1-degree path (2 edges)', () => {
        const g = makeGraph();
        addEdge(g, 'A', 'M1');
        addEdge(g, 'B', 'M1');
        const path = getBFSShortestPath(g, 'A', 'B');
        assert.deepEqual(path, ['A', 'M1', 'B']);
    });

    test('finds shortest 2-degree path (4 edges) over longer paths', () => {
        // A→M1→X→M2→B (4 edges = 2 degrees, shortest)
        // Also a longer path exists via Y
        const g = makeGraph();
        addEdge(g, 'A', 'M1'); addEdge(g, 'X', 'M1');
        addEdge(g, 'X', 'M2'); addEdge(g, 'B', 'M2');
        addEdge(g, 'A', 'M3'); addEdge(g, 'Y', 'M3');
        addEdge(g, 'Y', 'M4'); addEdge(g, 'Z', 'M4');
        addEdge(g, 'Z', 'M5'); addEdge(g, 'B', 'M5');
        const path = getBFSShortestPath(g, 'A', 'B');
        assert.equal(path.length - 1, 4, `Expected 4 edges, got ${path.length - 1}`);
    });

    test('returns the correct path nodes', () => {
        const g = makeGraph();
        addEdge(g, 'A', 'M1'); addEdge(g, 'B', 'M1');
        addEdge(g, 'B', 'M2'); addEdge(g, 'C', 'M2');
        const path = getBFSShortestPath(g, 'A', 'C');
        assert.deepEqual(path, ['A', 'M1', 'B', 'M2', 'C']);
    });
});

// ---------------------------------------------------------------------------
// getBFSMax8Paths
// ---------------------------------------------------------------------------

describe('getBFSMax8Paths', () => {
    test('returns [] when start actor is not in the graph', () => {
        const g = makeGraph();
        addEdge(g, 'A', 'M1');
        assert.deepEqual(getBFSMax8Paths(g, 'Unknown', 'A'), []);
    });

    test('returns [] when end actor is not in the graph', () => {
        const g = makeGraph();
        addEdge(g, 'A', 'M1');
        assert.deepEqual(getBFSMax8Paths(g, 'A', 'Unknown'), []);
    });

    test('returns [[actor]] when start equals end', () => {
        const g = makeGraph();
        addEdge(g, 'A', 'M1');
        assert.deepEqual(getBFSMax8Paths(g, 'A', 'A'), [['A']]);
    });

    test('returns [] when no path exists between two actors', () => {
        const g = makeGraph();
        addEdge(g, 'A', 'M1');
        addEdge(g, 'B', 'M2'); // disconnected component
        assert.deepEqual(getBFSMax8Paths(g, 'A', 'B'), []);
    });

    test('finds the only 1-degree path when actors share one movie', () => {
        const g = makeGraph();
        addEdge(g, 'A', 'M1'); addEdge(g, 'B', 'M1');
        const paths = getBFSMax8Paths(g, 'A', 'B');
        assert.deepEqual(sortPaths(paths), ['A>M1>B']);
    });

    test('finds ALL 1-degree paths when actors share multiple movies', () => {
        const g = makeGraph();
        addEdge(g, 'A', 'M1'); addEdge(g, 'B', 'M1');
        addEdge(g, 'A', 'M2'); addEdge(g, 'B', 'M2');
        addEdge(g, 'A', 'M3'); addEdge(g, 'B', 'M3');
        const paths = getBFSMax8Paths(g, 'A', 'B');
        assert.deepEqual(sortPaths(paths), ['A>M1>B', 'A>M2>B', 'A>M3>B']);
    });

    test('finds all 2-degree paths through a shared co-star', () => {
        // A shares M1 and M2 with X; X shares M3 and M4 with B
        // Expected 4 paths: A-M1-X-M3-B, A-M1-X-M4-B, A-M2-X-M3-B, A-M2-X-M4-B
        const g = makeGraph();
        addEdge(g, 'A', 'M1'); addEdge(g, 'X', 'M1');
        addEdge(g, 'A', 'M2'); addEdge(g, 'X', 'M2');
        addEdge(g, 'X', 'M3'); addEdge(g, 'B', 'M3');
        addEdge(g, 'X', 'M4'); addEdge(g, 'B', 'M4');
        const paths = getBFSMax8Paths(g, 'A', 'B');
        const expected = ['A>M1>X>M3>B', 'A>M1>X>M4>B', 'A>M2>X>M3>B', 'A>M2>X>M4>B'];
        assert.deepEqual(sortPaths(paths), expected.sort());
    });

    test('returns paths of ALL lengths up to 8 degrees, not only the shortest', () => {
        // Direct 1-degree path: A-M1-B
        // AND longer 2-degree path: A-M2-X-M3-B
        // Both should be returned (not just the shortest)
        const g = makeGraph();
        addEdge(g, 'A', 'M1'); addEdge(g, 'B', 'M1');     // 1 degree
        addEdge(g, 'A', 'M2'); addEdge(g, 'X', 'M2');
        addEdge(g, 'X', 'M3'); addEdge(g, 'B', 'M3');     // 2 degrees
        const paths = getBFSMax8Paths(g, 'A', 'B');
        const joined = sortPaths(paths);
        assert.ok(joined.includes('A>M1>B'), 'Should include 1-degree path');
        assert.ok(joined.includes('A>M2>X>M3>B'), 'Should include 2-degree path');
    });

    test('finds a 5-degree path (10 edges) within the 8-degree limit', () => {
        // A→Ma→N1→Mb→N2→Mc→N3→Md→N4→Me→B = 10 edges = 5 degrees
        const g = makeGraph();
        addEdge(g, 'A', 'Ma');  addEdge(g, 'N1', 'Ma');
        addEdge(g, 'N1', 'Mb'); addEdge(g, 'N2', 'Mb');
        addEdge(g, 'N2', 'Mc'); addEdge(g, 'N3', 'Mc');
        addEdge(g, 'N3', 'Md'); addEdge(g, 'N4', 'Md');
        addEdge(g, 'N4', 'Me'); addEdge(g, 'B', 'Me');
        const paths = getBFSMax8Paths(g, 'A', 'B');
        assert.equal(paths.length, 1);
        assert.equal(paths[0].length - 1, 10, 'Path should be 10 edges (5 degrees)');
    });

    test('finds an 8-degree path (16 edges, the maximum allowed)', () => {
        // A→M1→N1→M2→N2→M3→N3→M4→N4→M5→N5→M6→N6→M7→N7→M8→B = 16 edges = 8 degrees
        const g = makeGraph();
        const chain = ['A', 'M1', 'N1', 'M2', 'N2', 'M3', 'N3', 'M4', 'N4', 'M5', 'N5', 'M6', 'N6', 'M7', 'N7', 'M8', 'B'];
        for (let i = 0; i < chain.length - 1; i++) {
            addEdge(g, chain[i], chain[i + 1]);
        }
        assert.equal(chain.length - 1, MAX_EDGES, `Chain should be exactly ${MAX_EDGES} edges`);
        const paths = getBFSMax8Paths(g, 'A', 'B');
        assert.equal(paths.length, 1);
        assert.deepEqual(paths[0], chain);
    });

    test('does NOT find a path requiring more than 8 degrees (17 edges)', () => {
        // 17-edge chain (8.5 degrees) — must NOT be returned
        const g = makeGraph();
        const chain = ['A', 'M1', 'N1', 'M2', 'N2', 'M3', 'N3', 'M4', 'N4', 'M5', 'N5', 'M6', 'N6', 'M7', 'N7', 'M8', 'N8', 'B'];
        for (let i = 0; i < chain.length - 1; i++) {
            addEdge(g, chain[i], chain[i + 1]);
        }
        const paths = getBFSMax8Paths(g, 'A', 'B');
        assert.equal(paths.length, 0);
    });

    test('does NOT find a 9-degree path (18 edges) even when it is the only path', () => {
        // 18-edge chain (9 degrees) — must NOT be returned
        const g = makeGraph();
        const chain = ['A', 'Ma', 'Na', 'Mb', 'Nb', 'Mc', 'Nc', 'Md', 'Nd', 'Me', 'Ne', 'Mf', 'Nf', 'Mg', 'Ng', 'Mh', 'Nh', 'Mi', 'B'];
        for (let i = 0; i < chain.length - 1; i++) {
            addEdge(g, chain[i], chain[i + 1]);
        }
        const paths = getBFSMax8Paths(g, 'A', 'B');
        assert.equal(paths.length, 0);
    });

    test('paths are returned shortest first (BFS order)', () => {
        // 1-degree path exists AND a 2-degree path exists
        const g = makeGraph();
        addEdge(g, 'A', 'M1'); addEdge(g, 'B', 'M1');     // 2-edge path
        addEdge(g, 'A', 'M2'); addEdge(g, 'X', 'M2');
        addEdge(g, 'X', 'M3'); addEdge(g, 'B', 'M3');     // 4-edge path
        const paths = getBFSMax8Paths(g, 'A', 'B');
        // Shortest path should come first
        assert.equal(paths[0].length - 1, 2, 'First path should be the shortest (2 edges)');
    });

    test('does not include cycles within a path', () => {
        // Graph with a cycle: A-M1-X-M2-A (cycle back to A)
        // Only valid path to B: A-M1-X-M3-B
        const g = makeGraph();
        addEdge(g, 'A', 'M1'); addEdge(g, 'X', 'M1');
        addEdge(g, 'X', 'M2'); addEdge(g, 'A', 'M2'); // cycle back
        addEdge(g, 'X', 'M3'); addEdge(g, 'B', 'M3');
        const paths = getBFSMax8Paths(g, 'A', 'B');
        // All paths should not revisit A
        for (const path of paths) {
            const countA = path.filter(n => n === 'A').length;
            assert.equal(countA, 1, 'Path should not revisit start actor A');
        }
    });

    test('cap is applied and does not throw for large result sets', () => {
        // Create a graph where many paths exist by having many intermediary actors
        const g = makeGraph();
        // A shares movie with 10 actors; each of those shares a movie with B
        for (let i = 0; i < 30; i++) {
            addEdge(g, 'A', `M_A${i}`);
            addEdge(g, `X${i}`, `M_A${i}`);
            addEdge(g, `X${i}`, `M_B${i}`);
            addEdge(g, 'B', `M_B${i}`);
        }
        const paths = getBFSMax8Paths(g, 'A', 'B');
        assert.ok(paths.length <= MAX_RESULTS, `Should not exceed MAX_RESULTS (${MAX_RESULTS})`);
        assert.ok(paths.length > 0, 'Should find at least some paths');
    });
});
