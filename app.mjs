import {
  buildGraphFromMovies,
  getBFSShortestPath,
  streamAllPathsUpToDegrees,
} from './graph.mjs'

let graph = new Map()
let sortedActorsList = []

const AUTOCOMPLETE_LIMIT = 50
const RENDER_BATCH_SIZE = 120

let activeStreamSignal = null

function formatPathHTML(path) {
  const lengthEdges = path.length - 1
  const degrees = lengthEdges / 2
  const pathString = path.join(' -> ')

  return `
        <div class="path-item">
            <span class="path-length">Comprimento: ${lengthEdges} arestas (${degrees} graus de separacao)</span>
            <div>${pathString}</div>
        </div>
    `
}

function renderResults(htmlContent) {
  document.getElementById('results').innerHTML = htmlContent
}

function setupAutocomplete(inputId, listId) {
  const input = document.getElementById(inputId)
  const list = document.getElementById(listId)
  let currentMatches = []
  let activeIndex = -1

  function setActiveIndex(nextIndex) {
    if (currentMatches.length === 0) {
      activeIndex = -1
      return
    }

    const normalizedIndex =
      ((nextIndex % currentMatches.length) + currentMatches.length) %
      currentMatches.length
    activeIndex = normalizedIndex

    const items = list.querySelectorAll('.autocomplete-item')
    items.forEach((item, index) => {
      item.classList.toggle('active', index === activeIndex)
      if (index === activeIndex) {
        item.scrollIntoView({ block: 'nearest' })
      }
    })
  }

  function selectMatch(match) {
    input.value = match
    currentMatches = []
    activeIndex = -1
    list.innerHTML = ''
    list.classList.remove('show')
  }

  function clearIfInvalid() {
    const value = input.value.trim()

    if (!value) {
      list.innerHTML = ''
      list.classList.remove('show')
      currentMatches = []
      activeIndex = -1
      return
    }

    if (!sortedActorsList.includes(value)) {
      input.value = ''
    }

    list.innerHTML = ''
    list.classList.remove('show')
    currentMatches = []
    activeIndex = -1
  }

  function renderList(showAllOnEmpty = false) {
    const val = input.value.trim().toLowerCase()
    list.innerHTML = ''
    currentMatches = []
    activeIndex = -1

    if (!val && !showAllOnEmpty) {
      list.classList.remove('show')
      return
    }

    currentMatches = (
      val
        ? sortedActorsList.filter((actor) => actor.toLowerCase().includes(val))
        : sortedActorsList
    ).slice(0, AUTOCOMPLETE_LIMIT)

    if (currentMatches.length === 0) {
      list.classList.remove('show')
      return
    }

    const fragment = document.createDocumentFragment()
    currentMatches.forEach((match, index) => {
      const li = document.createElement('li')
      li.className = 'autocomplete-item'
      li.textContent = match
      li.addEventListener('mousedown', (event) => {
        event.preventDefault()
        event.stopPropagation()
        selectMatch(match)
      })
      fragment.appendChild(li)
    })

    list.appendChild(fragment)
    list.classList.add('show')
    setActiveIndex(0)
  }

  function handleKeydown(event) {
    if (!list.classList.contains('show') || currentMatches.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex(activeIndex + 1)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex(activeIndex - 1)
      return
    }

    if (event.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < currentMatches.length) {
        event.preventDefault()
        selectMatch(currentMatches[activeIndex])
      }
    }
  }

  input.addEventListener('input', () => renderList(false))
  input.addEventListener('focus', () => renderList(true))
  input.addEventListener('blur', clearIfInvalid)
  input.addEventListener('keydown', handleKeydown)
}

function closeAutocompleteLists(event) {
  const lists = document.querySelectorAll('.autocomplete-list')
  lists.forEach((list) => {
    const inputId = list.id === 'listOrigin' ? 'actorOrigin' : 'actorDest'
    const input = document.getElementById(inputId)

    if (event.target !== input && !list.contains(event.target)) {
      list.classList.remove('show')
    }
  })
}

function executeBFS() {
  if (activeStreamSignal) {
    activeStreamSignal.cancelled = true
    activeStreamSignal = null
  }

  const origin = document.getElementById('actorOrigin').value.trim()
  const dest = document.getElementById('actorDest').value.trim()

  if (!origin || !dest) {
    renderResults(
      '<span class="error">Por favor, selecione dois atores validos.</span>',
    )
    return
  }

  const path = getBFSShortestPath(graph, origin, dest)

  if (!path) {
    renderResults(
      '<span class="error">Relacionamento inexistente entre os atores selecionados.</span>',
    )
    return
  }

  renderResults(formatPathHTML(path))
}

async function executeBFS8() {
  const origin = document.getElementById('actorOrigin').value.trim()
  const dest = document.getElementById('actorDest').value.trim()

  if (!origin || !dest) {
    renderResults(
      '<span class="error">Por favor, selecione dois atores validos.</span>',
    )
    return
  }

  if (activeStreamSignal) {
    activeStreamSignal.cancelled = true
  }

  const btnBfs8 = document.getElementById('btnBfs8')
  btnBfs8.disabled = true

  const signal = { cancelled: false }
  activeStreamSignal = signal

  renderResults(`
    <h3 id="pathsTitle">Caminhos encontrados (max 8 arestas): 0</h3>
    <div id="pathsStatus" class="loading">Buscando caminhos...</div>
    <div id="pathsContainer"></div>
  `)

  const titleEl = document.getElementById('pathsTitle')
  const statusEl = document.getElementById('pathsStatus')
  const containerEl = document.getElementById('pathsContainer')

  let totalCount = 0
  let htmlBuffer = ''
  let bufferedItems = 0

  function flushBuffer() {
    if (!htmlBuffer) return
    containerEl.insertAdjacentHTML('beforeend', htmlBuffer)
    htmlBuffer = ''
    bufferedItems = 0
  }

  const result = await streamAllPathsUpToDegrees(graph, origin, dest, 8, {
    signal,
    onPath(path) {
      totalCount += 1
      titleEl.textContent = `Caminhos encontrados (max 8 arestas): ${totalCount}`

      htmlBuffer += formatPathHTML(path)
      bufferedItems += 1

      if (bufferedItems >= RENDER_BATCH_SIZE) {
        flushBuffer()
      }
    },
    onProgress(foundSoFar) {
      statusEl.textContent = `Buscando caminhos... ${foundSoFar} encontrados.`
      flushBuffer()
    },
  })

  flushBuffer()

  if (result.cancelled) {
    statusEl.textContent = `Busca cancelada. ${totalCount} caminhos exibidos.`
  } else if (result.count === 0) {
    renderResults(
      '<span class="error">Relacionamento inexistente ou excede o limite de 8 graus.</span>',
    )
  } else {
    statusEl.textContent = 'Busca finalizada.'
  }

  if (activeStreamSignal === signal) {
    activeStreamSignal = null
  }

  btnBfs8.disabled = false
}

async function loadData() {
  try {
    const response = await fetch('./latest_movies.json')
    if (!response.ok)
      throw new Error('Falha na rede ao tentar carregar o arquivo.')

    const data = await response.json()
    const seeded = buildGraphFromMovies(data)
    graph = seeded.graph
    sortedActorsList = seeded.actors

    setupAutocomplete('actorOrigin', 'listOrigin')
    setupAutocomplete('actorDest', 'listDest')

    document.getElementById('statusMessage').style.display = 'none'
    document.getElementById('actorOrigin').disabled = false
    document.getElementById('actorDest').disabled = false
    document.getElementById('btnBfs').disabled = false
    document.getElementById('btnBfs8').disabled = false

    renderResults(
      'Dados carregados com sucesso. Selecione os atores e execute a busca.',
    )
  } catch (error) {
    document.getElementById('statusMessage').style.display = 'none'
    renderResults(
      `<span class="error">Erro ao carregar latest_movies.json: ${error.message}. Voce esta rodando a aplicacao em um servidor local?</span>`,
    )
  }
}

document.addEventListener('click', closeAutocompleteLists)
document.getElementById('btnBfs').addEventListener('click', executeBFS)
document.getElementById('btnBfs8').addEventListener('click', executeBFS8)
window.addEventListener('load', loadData)
