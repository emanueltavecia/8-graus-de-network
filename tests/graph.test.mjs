import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createGraph,
  addEdge,
  getBFSShortestPath,
  getAllPathsUpToDegrees,
  buildGraphFromMovies,
} from '../graph.mjs'

function buildGraph(edges) {
  const graph = createGraph()
  edges.forEach(([a, b]) => addEdge(graph, a, b))
  return graph
}

function serialize(paths) {
  return paths.map((path) => path.join(' > ')).sort()
}

test('buildGraphFromMovies creates actor and movie connections', () => {
  const data = [
    { title: 'Movie A', cast: ['Actor 1', 'Actor 2'] },
    { title: 'Movie B', cast: ['Actor 2', 'Actor 3'] },
  ]

  const { graph, actors } = buildGraphFromMovies(data)

  assert.equal(graph.get('Movie A').has('Actor 1'), true)
  assert.equal(graph.get('Movie A').has('Actor 2'), true)
  assert.equal(graph.get('Actor 2').has('Movie B'), true)
  assert.deepEqual(actors, ['Actor 1', 'Actor 2', 'Actor 3'])
})

test('getBFSShortestPath returns minimum path', () => {
  const graph = buildGraph([
    ['A', 'B'],
    ['B', 'C'],
    ['A', 'D'],
    ['D', 'E'],
    ['E', 'C'],
  ])

  const path = getBFSShortestPath(graph, 'A', 'C')
  assert.deepEqual(path, ['A', 'B', 'C'])
})

test('getAllPathsUpToDegrees returns all simple paths within edge limit', () => {
  const graph = buildGraph([
    ['A', 'B'],
    ['B', 'D'],
    ['A', 'C'],
    ['C', 'D'],
    ['A', 'E'],
    ['E', 'F'],
    ['F', 'D'],
  ])

  const paths = getAllPathsUpToDegrees(graph, 'A', 'D', 3)

  assert.deepEqual(serialize(paths), [
    'A > B > D',
    'A > C > D',
    'A > E > F > D',
  ])
})

test('getAllPathsUpToDegrees ignores cyclic expansions within edge limit', () => {
  const graph = buildGraph([
    ['A', 'B'],
    ['B', 'C'],
    ['C', 'A'],
    ['C', 'D'],
  ])

  const paths = getAllPathsUpToDegrees(graph, 'A', 'D', 3)
  assert.deepEqual(serialize(paths), ['A > B > C > D', 'A > C > D'])
})

test('getAllPathsUpToDegrees respects 8-edge maximum', () => {
  const graph = createGraph()

  const chain = ['S']
  for (let i = 1; i <= 8; i += 1) {
    chain.push(`N${i}`)
  }
  chain.push('T')

  for (let i = 0; i < chain.length - 1; i += 1) {
    addEdge(graph, chain[i], chain[i + 1])
  }

  const withinLimit = getAllPathsUpToDegrees(graph, 'S', 'N8', 8)
  assert.equal(withinLimit.length, 1)

  const overLimit = getAllPathsUpToDegrees(graph, 'S', 'T', 8)
  assert.equal(overLimit.length, 0)
})

test('all returned paths have at most 8 edges', () => {
  const graph = buildGraph([
    ['A', 'B'],
    ['B', 'C'],
    ['C', 'D'],
    ['D', 'E'],
    ['E', 'F'],
    ['F', 'G'],
    ['G', 'H'],
    ['H', 'I'],
    ['I', 'J'],
    ['A', 'K'],
    ['K', 'J'],
  ])

  const paths = getAllPathsUpToDegrees(graph, 'A', 'J', 8)
  assert.equal(paths.length > 0, true)

  paths.forEach((path) => {
    assert.equal(path.length - 1 <= 8, true)
  })
})

test('returns empty when there is no connection', () => {
  const graph = buildGraph([
    ['A', 'B'],
    ['C', 'D'],
  ])

  assert.equal(getBFSShortestPath(graph, 'A', 'D'), null)
  assert.deepEqual(getAllPathsUpToDegrees(graph, 'A', 'D', 8), [])
})
