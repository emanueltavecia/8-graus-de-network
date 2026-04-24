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

export function getAllPathsUpToDegrees(graph, start, end, maxDegrees = 8) {
  if (!graph.has(start) || !graph.has(end)) return []
  if (start === end) return [[start]]

  const queue = [start]
  const distances = new Map([[start, 0]])
  const predecessors = new Map([[start, []]])
  let shortestDistance = -1

  while (queue.length > 0) {
    const current = queue.shift()
    const currentDist = distances.get(current)

    if (shortestDistance !== -1 && currentDist >= shortestDistance) {
      continue
    }

    if (currentDist >= maxDegrees) continue

    for (const neighbor of graph.get(current) || []) {
      if (!distances.has(neighbor)) {
        distances.set(neighbor, currentDist + 1)
        predecessors.set(neighbor, [current])
        queue.push(neighbor)

        if (neighbor === end) {
          shortestDistance = currentDist + 1
        }
      } else if (distances.get(neighbor) === currentDist + 1) {
        predecessors.get(neighbor).push(current)
      }
    }
  }

  if (shortestDistance === -1 || shortestDistance > maxDegrees) {
    return []
  }

  const results = []
  function backtrack(node, currentPath) {
    if (node === start) {
      results.push([start, ...currentPath])
      return
    }
    const preds = predecessors.get(node) || []
    for (const p of preds) {
      backtrack(p, [node, ...currentPath])
    }
  }

  backtrack(end, [end])
  return results
}

export async function streamAllPathsUpToDegrees(graph, start, end, maxDegrees = 8, options = {}) {
  const { onPath, onProgress, signal, stepBudget = 25000 } = options

  if (!graph.has(start) || !graph.has(end)) return { count: 0, cancelled: false }

  if (start === end) {
    if (typeof onPath === 'function') onPath([start])
    if (typeof onProgress === 'function') onProgress(1)
    return { count: 1, cancelled: false }
  }

  const queue = [start]
  let head = 0
  const distances = new Map([[start, 0]])
  const predecessors = new Map([[start, []]])
  let shortestDistance = -1
  let steps = 0

  while (head < queue.length) {
    if (signal?.cancelled) return { count: 0, cancelled: true }

    const current = queue[head++]
    const currentDist = distances.get(current)

    if (shortestDistance !== -1 && currentDist >= shortestDistance) continue
    if (currentDist >= maxDegrees) continue

    for (const neighbor of graph.get(current) || []) {
      if (!distances.has(neighbor)) {
        distances.set(neighbor, currentDist + 1)
        predecessors.set(neighbor, [current])
        queue.push(neighbor)

        if (neighbor === end) {
          shortestDistance = currentDist + 1
        }
      } else if (distances.get(neighbor) === currentDist + 1) {
        predecessors.get(neighbor).push(current)
      }
    }

    steps++
    if (steps >= stepBudget) {
      steps = 0
      if (typeof onProgress === 'function') onProgress(0)
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  if (shortestDistance === -1 || shortestDistance > maxDegrees) {
    if (typeof onProgress === 'function') onProgress(0)
    return { count: 0, cancelled: false }
  }

  let count = 0
  const stack = [{ node: end, path: [end] }]
  steps = 0

  while (stack.length > 0) {
    if (signal?.cancelled) return { count, cancelled: true }

    const { node, path } = stack.pop()

    if (node === start) {
      count++
      const finalPath = [...path].reverse()
      if (typeof onPath === 'function') onPath(finalPath)
    } else {
      const preds = predecessors.get(node) || []
      for (const p of preds) {
        stack.push({ node: p, path: [...path, p] })
      }
    }

    steps++
    if (steps >= stepBudget) {
      steps = 0
      if (typeof onProgress === 'function') onProgress(count)
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  if (typeof onProgress === 'function') onProgress(count)
  return { count, cancelled: false }
}
