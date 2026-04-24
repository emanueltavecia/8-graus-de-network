export function createGraph() {
  return new Map()
}

export function addEdge(graph, v1, v2) {
  if (!graph.has(v1)) graph.set(v1, new Set())
  if (!graph.has(v2)) graph.set(v2, new Set())

  graph.get(v1).add(v2)
  graph.get(v2).add(v1)
}

export function buildGraphFromMovies(data) {
  const graph = createGraph()
  const actorsSet = new Set()

  data.forEach((movie) => {
    const movieTitle = movie?.title
    if (!movieTitle || !Array.isArray(movie.cast)) return

    movie.cast.forEach((actor) => {
      addEdge(graph, movieTitle, actor)
      actorsSet.add(actor)
    })
  })

  const actors = Array.from(actorsSet).sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  )
  return { graph, actors }
}

export function getBFSShortestPath(graph, start, end) {
  if (!graph.has(start) || !graph.has(end)) return null
  if (start === end) return [start]

  const queue = [start]
  let head = 0
  const visited = new Set([start])
  const previous = new Map()

  while (head < queue.length) {
    const node = queue[head++]
    for (const neighbor of graph.get(node)) {
      if (visited.has(neighbor)) continue

      visited.add(neighbor)
      previous.set(neighbor, node)

      if (neighbor === end) {
        return reconstructPath(previous, start, end)
      }
      queue.push(neighbor)
    }
  }

  return null
}

function reconstructPath(previous, start, end) {
  const path = [end]
  let current = end

  while (current !== start) {
    current = previous.get(current)
    path.push(current)
  }

  path.reverse()
  return path
}

function computeDistancesFromTarget(graph, target, maxEdges) {
  const queue = [target]
  let head = 0
  const distances = new Map([[target, 0]])

  while (head < queue.length) {
    const node = queue[head++]
    const dist = distances.get(node)

    if (dist >= maxEdges) continue

    for (const neighbor of graph.get(node) || []) {
      if (distances.has(neighbor)) continue
      distances.set(neighbor, dist + 1)
      queue.push(neighbor)
    }
  }

  return distances
}

function buildOrderedNeighbors(graph, distanceToEnd) {
  const ordered = new Map()
  const infinity = Number.POSITIVE_INFINITY

  for (const [node, neighborsSet] of graph.entries()) {
    const neighbors = Array.from(neighborsSet)
    neighbors.sort((a, b) => {
      const da = distanceToEnd.get(a) ?? infinity
      const db = distanceToEnd.get(b) ?? infinity
      return da - db
    })
    ordered.set(node, neighbors)
  }

  return ordered
}

export function getAllPathsUpToDegrees(graph, start, end, maxDegrees = 8) {
  if (!graph.has(start) || !graph.has(end)) return []
  if (start === end) return [[start]]

  const maxEdges = maxDegrees
  const distanceToEnd = computeDistancesFromTarget(graph, end, maxEdges)
  const orderedNeighbors = buildOrderedNeighbors(graph, distanceToEnd)

  if (!distanceToEnd.has(start)) return []

  const path = [start]
  const inPath = new Set([start])
  const results = []

  function dfs(node, depth) {
    if (depth > maxEdges) return

    if (node === end) {
      results.push([...path])
      return
    }

    const minDistFromNode = distanceToEnd.get(node)
    if (minDistFromNode === undefined || depth + minDistFromNode > maxEdges) {
      return
    }

    const remainingEdges = maxEdges - depth

    for (const neighbor of orderedNeighbors.get(node) || []) {
      if (inPath.has(neighbor)) continue

      const minToEnd = distanceToEnd.get(neighbor)
      if (minToEnd === undefined) continue

      if (minToEnd > remainingEdges - 1) continue

      inPath.add(neighbor)
      path.push(neighbor)
      dfs(neighbor, depth + 1)
      path.pop()
      inPath.delete(neighbor)
    }
  }

  dfs(start, 0)
  return results
}

export async function streamAllPathsUpToDegrees(
  graph,
  start,
  end,
  maxDegrees = 8,
  options = {},
) {
  if (!graph.has(start) || !graph.has(end))
    return { count: 0, cancelled: false }

  const { onPath, onProgress, signal, stepBudget = 25000 } = options

  if (start === end) {
    if (typeof onPath === 'function') onPath([start])
    if (typeof onProgress === 'function') onProgress(1)
    return { count: 1, cancelled: false }
  }

  const maxEdges = maxDegrees
  const distanceToEnd = computeDistancesFromTarget(graph, end, maxEdges)
  if (!distanceToEnd.has(start)) return { count: 0, cancelled: false }

  const orderedNeighbors = buildOrderedNeighbors(graph, distanceToEnd)
  const path = [start]
  const inPath = new Set([start])
  const stack = [
    {
      node: start,
      depth: 0,
      neighbors: orderedNeighbors.get(start) || [],
      index: 0,
    },
  ]

  let count = 0
  let steps = 0

  while (stack.length > 0) {
    if (signal?.cancelled) {
      return { count, cancelled: true }
    }

    const frame = stack[stack.length - 1]

    if (frame.node === end) {
      count += 1
      if (typeof onPath === 'function') onPath([...path])

      stack.pop()
      path.pop()
      inPath.delete(frame.node)
      continue
    }

    const minDistFromNode = distanceToEnd.get(frame.node)
    if (
      minDistFromNode === undefined ||
      frame.depth + minDistFromNode > maxEdges ||
      frame.index >= frame.neighbors.length
    ) {
      stack.pop()
      if (stack.length > 0) {
        inPath.delete(frame.node)
        path.pop()
      }
      continue
    }

    const neighbor = frame.neighbors[frame.index]
    frame.index += 1
    steps += 1

    if (inPath.has(neighbor)) continue

    const nextDepth = frame.depth + 1
    if (nextDepth > maxEdges) continue

    const minToEnd = distanceToEnd.get(neighbor)
    if (minToEnd === undefined || nextDepth + minToEnd > maxEdges) continue

    inPath.add(neighbor)
    path.push(neighbor)

    stack.push({
      node: neighbor,
      depth: nextDepth,
      neighbors: orderedNeighbors.get(neighbor) || [],
      index: 0,
    })

    if (steps >= stepBudget) {
      steps = 0
      if (typeof onProgress === 'function') onProgress(count)
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  if (typeof onProgress === 'function') onProgress(count)
  return { count, cancelled: false }
}
