(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    } else {
        root.BFS = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

    var MAX_DEGREES = 8;
    var MAX_EDGES = MAX_DEGREES * 2; // 16 edges = 8 degrees (actor→movie→actor)

    function addEdge(graph, v1, v2) {
        if (!graph.has(v1)) graph.set(v1, []);
        if (!graph.has(v2)) graph.set(v2, []);
        if (!graph.get(v1).includes(v2)) graph.get(v1).push(v2);
        if (!graph.get(v2).includes(v1)) graph.get(v2).push(v1);
    }

    function getBFSShortestPath(graph, start, end) {
        if (!graph.has(start) || !graph.has(end)) return null;
        if (start === end) return [start];

        // Parent-map BFS: no path copying per queue entry (O(V+E) time and space).
        const parent = new Map([[start, null]]);
        const queue = [start];
        let head = 0;

        while (head < queue.length) {
            const node = queue[head++];
            for (const neighbor of graph.get(node)) {
                if (neighbor === end) {
                    // Reconstruct path from parent pointers
                    const path = [end, node];
                    let cur = node;
                    while (parent.get(cur) !== null) {
                        cur = parent.get(cur);
                        path.push(cur);
                    }
                    return path.reverse();
                }
                if (!parent.has(neighbor)) {
                    parent.set(neighbor, node);
                    queue.push(neighbor);
                }
            }
        }
        return null;
    }

    /**
     * Returns all paths between start and end with at most 8 degrees of separation
     * (16 edges, since each degree = actor→movie→actor = 2 edges).
     * Results are returned in BFS order (shortest paths first).
     *
     * Optimisations over a naïve BFS:
     *  - Pre-computed distToEnd (reverse BFS from `end`): prunes any branch whose
     *    remaining edge budget can no longer reach `end`, eliminating huge subtrees
     *    early without sacrificing completeness.
     *  - Parent-pointer queue entries {node, parentIdx, depth}: no Set or path-array
     *    is cloned per queue entry; each entry is a tiny constant-size object.
     *  - Head-index queue: avoids the O(n) cost of Array.shift().
     *  - Ancestor set built by walking the O(depth ≤ 16) parent chain once per
     *    expanded node for cycle prevention.
     */
    function getBFSMax8Paths(graph, start, end) {
        if (!graph.has(start) || !graph.has(end)) return [];
        if (start === end) return [[start]];

        // --- Reverse BFS: minimum edges from every reachable node to `end` ---
        const distToEnd = new Map([[end, 0]]);
        {
            const q = [end];
            let h = 0;
            while (h < q.length) {
                const node = q[h++];
                const d = distToEnd.get(node);
                for (const nb of (graph.get(node) || [])) {
                    if (!distToEnd.has(nb)) {
                        distToEnd.set(nb, d + 1);
                        q.push(nb);
                    }
                }
            }
        }

        // Early exit if start can't reach end within the edge budget
        if (!distToEnd.has(start) || distToEnd.get(start) > MAX_EDGES) return [];

        const validPaths = [];
        // Queue of { node, parentIdx, depth }
        // parentIdx is the index into `queue` of the parent entry (-1 for root).
        const queue = [{ node: start, parentIdx: -1, depth: 0 }];
        let head = 0;

        while (head < queue.length) {
            const entry = queue[head];
            const { node, depth } = entry;
            const idx = head++;

            const remaining = MAX_EDGES - depth;
            if (remaining <= 0) continue;

            // Build the ancestor set for this path by walking parent pointers.
            // Cost is O(depth) ≤ O(MAX_EDGES) — cycle prevention without cloning.
            const ancestors = new Set();
            let cur = entry;
            while (cur.parentIdx !== -1) {
                ancestors.add(cur.node);
                cur = queue[cur.parentIdx];
            }
            ancestors.add(start);

            for (const neighbor of (graph.get(node) || [])) {
                if (ancestors.has(neighbor)) continue;

                if (neighbor === end) {
                    // Reconstruct the full path from parent pointers
                    const path = [neighbor];
                    let c = entry;
                    while (c.parentIdx !== -1) {
                        path.push(c.node);
                        c = queue[c.parentIdx];
                    }
                    path.push(start);
                    path.reverse();
                    validPaths.push(path);
                } else {
                    const d = distToEnd.get(neighbor);
                    // Prune: only explore if `neighbor` can still reach `end`
                    // within the remaining budget (1 edge is consumed to reach neighbor).
                    if (d !== undefined && d <= remaining - 1) {
                        queue.push({ node: neighbor, parentIdx: idx, depth: depth + 1 });
                    }
                }
            }
        }

        return validPaths;
    }

    return {
        MAX_DEGREES: MAX_DEGREES,
        MAX_EDGES: MAX_EDGES,
        addEdge: addEdge,
        getBFSShortestPath: getBFSShortestPath,
        getBFSMax8Paths: getBFSMax8Paths,
    };
});
