export async function streamAllPathsUpToDegrees(
  graph,
  startName,
  endName,
  maxDegrees = 8,
  options = {}
) {
  const startId = normalizeActorId(startName);
  const endId = normalizeActorId(endName);
  const maxEdges = maxDegrees * 2;

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
