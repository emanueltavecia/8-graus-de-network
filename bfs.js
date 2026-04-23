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

        const queue = [[start]];
        const visited = new Set();
        visited.add(start);

        while (queue.length > 0) {
            const path = queue.shift();
            const node = path[path.length - 1];

            for (const neighbor of graph.get(node)) {
                if (neighbor === end) {
                    return [...path, neighbor];
                }
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push([...path, neighbor]);
                }
            }
        }
        return null;
    }

    /**
     * Returns all paths between start and end with at most 8 degrees of separation
     * (16 edges, since each degree = actor→movie→actor = 2 edges).
     * Results are returned in BFS order (shortest paths first).
     */
    function getBFSMax8Paths(graph, start, end) {
        if (!graph.has(start) || !graph.has(end)) return [];
        if (start === end) return [[start]];

        const validPaths = [];
        // Each queue entry: [path, visitedInPath]
        // Using a per-path visited set avoids cycles while allowing all distinct routes
        const queue = [[[start], new Set([start])]];

        while (queue.length > 0) {
            const [path, visited] = queue.shift();
            const node = path[path.length - 1];
            const currentEdges = path.length - 1;

            if (currentEdges >= MAX_EDGES) continue;

            for (const neighbor of (graph.get(node) || [])) {
                if (visited.has(neighbor)) continue;

                if (neighbor === end) {
                    validPaths.push([...path, neighbor]);
                } else {
                    const newVisited = new Set(visited);
                    newVisited.add(neighbor);
                    queue.push([[...path, neighbor], newVisited]);
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
