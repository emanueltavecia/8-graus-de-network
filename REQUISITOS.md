# TD 01: Trabalho de Desenvolvimento 01

**Instituição:** UNESC — Ciência da Computação
**Disciplina:** Teoria de Grafos
**Professor:** André Faria Ruaro

---

## 1. Projeto: 8 Graus de Network

O desafio consiste em criar uma aplicação chamada **"8 Graus de Network"**, cujo objetivo é encontrar o relacionamento mais próximo entre dois atores.

### Estrutura do Grafo

- **Modelo:** Lista de Adjacências.
- **Vértices:** Cada filme e cada ator será representado por um vértice.
- **Arestas:** A ligação entre um filme e um ator representa uma aresta.
- **Direcionamento:** O grafo é **não direcionado**, o que exige a criação de arestas do filme para o ator e vice-versa.

---

## 2. Dados e Implementação

Os dados para as relações estão contidos no arquivo `latest_movies.json`.

### Requisitos Funcionais

- **Função Seed:** Criar uma função para popular o Grafo com os dados do arquivo JSON.
- **Função Show:** Mostrar os vértices e seus respectivos adjacentes.
- **Algoritmo Principal:** Implementar o **Broadth-First Search (BFS)** para encontrar o relacionamento mais próximo entre um ator de origem e um de destino.

### Notas Técnicas (Node.js/JavaScript)

- É possível importar o JSON utilizando `require`, `fetch` ou a biblioteca `fs`.
- Os inputs de seleção de atores podem ser implementados como `select` ou `datalist`.

---

## 3. Interface e Experiência do Usuário

A aplicação deve possuir uma interface amigável e criativa com os seguintes elementos:

- **Inputs:** Dois campos de entrada (Ator de Origem e Ator de Destino).
- **Botão BFS:** Executar a busca em largura simples.
- **Botão BFS Comprimento 8:** Executar uma adaptação do BFS para encontrar todos os relacionamentos mais próximos com, no máximo, **8 arestas** de distância.
- **Exibição de Resultados:**
  - Mostrar o **Caminho Mínimo** dos vértices (da origem ao destino).
  - Informar o **Comprimento** do caminho.
  - Tratar casos de **relacionamento inexistente**.

---

## 4. Referências Visuais de Busca (BFS)

O documento inclui diagramas ilustrando a ordem de visitação em uma Busca em Largura (Breadth-First Search), partindo de um nó raiz e explorando todos os vizinhos por nível antes de avançar para a profundidade seguinte.

---

**Bom trabalho!**
