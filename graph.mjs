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

export function getAllPathsUpToDegrees(graph, start, end, maxDegrees = 8) {
  if (!graph.has(start) || !graph.has(end)) return []
  if (start === end) return [[start]]

  const distanceToEnd = computeDistancesFromTarget(graph, end, maxDegrees)
  if (!distanceToEnd.has(start)) return []

  const queue = [[start]]
  let head = 0
  const results = []

  while (head < queue.length) {
    const currentPath = queue[head++]
    const currentNode = currentPath[currentPath.length - 1]
    const depth = currentPath.length - 1

    if (currentNode === end) {
      results.push(currentPath)
      continue
    }

    if (depth >= maxDegrees) continue

    for (const neighbor of graph.get(currentNode) || []) {
      if (currentPath.includes(neighbor)) continue

      const minToEnd = distanceToEnd.get(neighbor)
      if (minToEnd === undefined) continue

      if (depth + 1 + minToEnd > maxDegrees) continue

      queue.push([...currentPath, neighbor])
    }
  }

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

  const distanceToEnd = computeDistancesFromTarget(graph, end, maxDegrees)
  if (!distanceToEnd.has(start)) return { count: 0, cancelled: false }

  const queue = [[start]]
  let head = 0

  let count = 0
  let steps = 0

  while (head < queue.length) {
    if (signal?.cancelled) {
      return { count, cancelled: true }
    }

    const currentPath = queue[head++]
    const currentNode = currentPath[currentPath.length - 1]
    const depth = currentPath.length - 1

    if (currentNode === end) {
      count += 1
      if (typeof onPath === 'function') onPath(currentPath)
      continue
    }

    if (depth >= maxDegrees) continue

    for (const neighbor of graph.get(currentNode) || []) {
      if (currentPath.includes(neighbor)) continue

      const minToEnd = distanceToEnd.get(neighbor)
      if (minToEnd === undefined) continue
      if (depth + 1 + minToEnd > maxDegrees) continue

      queue.push([...currentPath, neighbor])
    }

    steps += 1
    if (steps >= stepBudget) {
      steps = 0
      if (typeof onProgress === 'function') onProgress(count)

      if (head > 50000) {
        queue.splice(0, head)
        head = 0
      }

      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  if (typeof onProgress === 'function') onProgress(count)
  return { count, cancelled: false }
}
