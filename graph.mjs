export function createGraph() {
  return {
    adjacencyList: new Map(),
    vertices: new Map() 
  };
}

export function addEdge(graph, v1Id, v2Id) {
  if (!graph.adjacencyList.has(v1Id)) graph.adjacencyList.set(v1Id, new Set());
  if (!graph.adjacencyList.has(v2Id)) graph.adjacencyList.set(v2Id, new Set());

  graph.adjacencyList.get(v1Id).add(v2Id);
  graph.adjacencyList.get(v2Id).add(v1Id);
}

export function buildGraphFromMovies(data) {
  const graph = createGraph();
  const actorsSet = new Set();

  data.forEach((movie) => {
    const movieTitle = movie?.title;
    if (!movieTitle || !Array.isArray(movie.cast)) return;

    const movieId = `movie_${movie.id}`;
    graph.vertices.set(movieId, { name: movieTitle, type: 'movie' });

    movie.cast.forEach((actor) => {
      const actorId = normalizeActorId(actor);
      graph.vertices.set(actorId, { name: actor, type: 'actor' });
      
      addEdge(graph, actorId, movieId);
      actorsSet.add(actor);
    });
  });

  const actors = Array.from(actorsSet).sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  );
  
  return { graph, actors };
}

export function getBFSShortestPath(graph, startName, endName) {
  const startId = normalizeActorId(startName);
  const endId = normalizeActorId(endName);

  if (!graph.adjacencyList.has(startId) || !graph.adjacencyList.has(endId)) return null;
  if (startId === endId) return [startName];

  const queue = [startId];
  const visited = new Set([startId]);
  const previous = new Map();

  while (queue.length > 0) {
    const node = queue.shift();

    for (const neighbor of graph.adjacencyList.get(node)) {
      if (visited.has(neighbor)) continue;

      visited.add(neighbor);
      previous.set(neighbor, node);

      if (neighbor === endId) {
        return reconstructPath(previous, startId, endId).map(id => 
          graph.vertices.get(id).name
        );
      }
      queue.push(neighbor);
    }
  }

  return null;
}

function reconstructPath(previous, start, end) {
  const path = [end];
  let current = end;
  while (current !== start) {
    current = previous.get(current);
    path.push(current);
  }
  return path.reverse();
}

export function getAllPathsUpToDegrees(graph, startName, endName, maxDegrees = 8) {
  const startId = normalizeActorId(startName);
  const endId = normalizeActorId(endName);
  const maxEdges = maxDegrees; 

  if (!graph.adjacencyList.has(startId) || !graph.adjacencyList.has(endId)) return [];
  
  const distanceToEnd = computeDistancesFromTarget(graph, endId, maxEdges);
  if (!distanceToEnd.has(startId)) return [];

  const paths = [];
  const stack = [[startId]];

  while (stack.length > 0) {
    const currentPath = stack.pop();
    const currentId = currentPath[currentPath.length - 1];
    const edgeCount = currentPath.length - 1;

    for (const neighborId of graph.adjacencyList.get(currentId) || []) {
      if (currentPath.includes(neighborId)) continue;

      const minToEnd = distanceToEnd.get(neighborId);
      if (minToEnd === undefined || edgeCount + 1 + minToEnd > maxEdges) continue;

      const newPath = [...currentPath, neighborId];

      if (neighborId === endId) {
        paths.push(newPath.map(id => graph.vertices.get(id).name));
        continue;
      }

      stack.push(newPath);
    }
  }

  return paths.sort((a, b) => a.length - b.length);
}

export async function streamAllPathsUpToDegrees(
  graph,
  startName,
  endName,
  maxDegrees = 8,
  options = {}
) {
  const startId = normalizeActorId(startName);
  const endId = normalizeActorId(endName);
  const maxEdges = maxDegrees;

  const { onPath, onProgress, signal, stepBudget = 5000 } = options;

  if (!graph.adjacencyList.has(startId) || !graph.adjacencyList.has(endId))
    return { count: 0, cancelled: false };

  if (startId === endId) {
    if (typeof onPath === 'function') onPath([startName]);
    return { count: 1, cancelled: false };
  }

  const distanceToEnd = computeDistancesFromTarget(graph, endId, maxEdges);
  if (!distanceToEnd.has(startId)) return { count: 0, cancelled: false };

  const stack = [[startId]];
  let count = 0;
  let steps = 0;

  while (stack.length > 0) {
    if (signal?.cancelled) {
      return { count, cancelled: true };
    }

    const currentPath = stack.pop();
    const currentId = currentPath[currentPath.length - 1];
    const edgeCount = currentPath.length - 1;

    for (const neighborId of graph.adjacencyList.get(currentId) || []) {
      if (currentPath.includes(neighborId)) continue;

      const minToEnd = distanceToEnd.get(neighborId);
      
      if (minToEnd === undefined || edgeCount + 1 + minToEnd > maxEdges) continue;

      const newPath = [...currentPath, neighborId];

      if (neighborId === endId) {
        count += 1;
        if (typeof onPath === 'function') {
          onPath(newPath.map(id => graph.vertices.get(id).name));
        }
        continue;
      }

      stack.push(newPath);
    }

    steps += 1;
    if (steps >= stepBudget) {
      steps = 0;
      if (typeof onProgress === 'function') onProgress(count);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  if (typeof onProgress === 'function') onProgress(count);
  return { count, cancelled: false };
}

function computeDistancesFromTarget(graph, targetId, maxEdges) {
  const queue = [targetId];
  const distances = new Map([[targetId, 0]]);
  let head = 0;

  while (head < queue.length) {
    const node = queue[head++];
    const dist = distances.get(node);
    if (dist >= maxEdges) continue;

    for (const neighbor of graph.adjacencyList.get(node) || []) {
      if (!distances.has(neighbor)) {
        distances.set(neighbor, dist + 1);
        queue.push(neighbor);
      }
    }
  }
  return distances;
}

function normalizeActorId(name) {
  return name.trim().toLowerCase().replace(/\s+/g, '_');
}
