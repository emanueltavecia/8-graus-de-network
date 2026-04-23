// Web Worker: runs BFS computations off the main thread to keep the UI responsive.
// The main thread serialises the graph (Map entries) and sends it once via 'init'.
// Subsequent 'bfs_shortest' / 'bfs_all8' messages trigger the BFS algorithms.

importScripts('./bfs.js');

var graph = null;

self.onmessage = function (e) {
    var msg = e.data;

    if (msg.type === 'init') {
        // Reconstruct the graph from the serialised entries sent by the main thread.
        graph = new Map(msg.graphEntries);
        self.postMessage({ type: 'ready' });
        return;
    }

    if (msg.type === 'bfs_shortest') {
        var path = BFS.getBFSShortestPath(graph, msg.start, msg.end);
        self.postMessage({ type: 'bfs_shortest_result', path: path });
        return;
    }

    if (msg.type === 'bfs_all8') {
        var paths = BFS.getBFSMax8Paths(graph, msg.start, msg.end);
        self.postMessage({ type: 'bfs_all8_result', paths: paths });
        return;
    }
};
