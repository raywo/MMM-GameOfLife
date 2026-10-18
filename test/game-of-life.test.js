const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const GameOfLife = require("../game-of-life.js");


/*
  Builds a grid from rows of text, so tests read like the picture they
  describe: "#" is alive, "." is dead. Each string is one row of the
  picture (a fixed y), each character one cell along the x axis.
 */
function gridFromPicture(...lines) {
  const width = lines[0].length;
  const height = lines.length;
  const grid = GameOfLife.makeGrid(width, height);

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      grid[x][y] = lines[y][x] === "#" ? 1 : 0;
    }
  }

  return grid;
}


describe("gridSize", () => {
  it("divides the canvas into cells of resolution pixels", () => {
    assert.deepEqual(GameOfLife.gridSize(300, 200, 10), { width: 30, height: 20 });
  });

  it("uses only whole cells when the canvas is not a multiple of resolution", () => {
    const size = GameOfLife.gridSize(255, 307, 10);

    assert.deepEqual(size, { width: 25, height: 30 });
    assert.doesNotThrow(() => GameOfLife.makeGrid(size.width, size.height));
  });

  it("keeps at least one cell per axis when resolution exceeds the canvas", () => {
    const size = GameOfLife.gridSize(50, 80, 60);

    assert.deepEqual(size, { width: 1, height: 1 });

    const grid = GameOfLife.makeGrid(size.width, size.height);
    GameOfLife.fillGridRandomly(grid, () => 0.9);

    assert.doesNotThrow(() => GameOfLife.computeNextGeneration(grid));
  });
});


describe("makeGrid", () => {
  it("creates width columns of height cells", () => {
    const grid = GameOfLife.makeGrid(3, 5);

    assert.equal(grid.length, 3);
    assert.ok(grid.every(column => column.length === 5));
  });
});


describe("fillGridRandomly", () => {
  it("fills every cell from the passed random source", () => {
    const grid = GameOfLife.makeGrid(2, 2);
    const values = [0.1, 0.9, 0.5, 0.49];
    const random = () => values.shift();

    GameOfLife.fillGridRandomly(grid, random);

    assert.deepEqual(grid, [[0, 1], [1, 0]]);
  });
});


describe("countAliveNeighbors", () => {
  it("does not count the cell itself", () => {
    const grid = gridFromPicture(
      ".....",
      ".###.",
      ".###.",
      ".###.",
      "....."
    );

    assert.equal(GameOfLife.countAliveNeighbors(grid, 2, 2), 8);
  });

  it("wraps around at the edges", () => {
    const grid = gridFromPicture(
      "#...#",
      ".....",
      ".....",
      ".....",
      "#...#"
    );

    assert.equal(GameOfLife.countAliveNeighbors(grid, 0, 0), 3);
  });
});


describe("computeNextGeneration", () => {
  it("keeps a block unchanged (still life)", () => {
    const block = gridFromPicture(
      "....",
      ".##.",
      ".##.",
      "...."
    );

    assert.deepEqual(GameOfLife.computeNextGeneration(block), block);
  });

  it("flips a blinker and returns it after two generations (period 2)", () => {
    const horizontal = gridFromPicture(
      ".....",
      ".....",
      ".###.",
      ".....",
      "....."
    );
    const vertical = gridFromPicture(
      ".....",
      "..#..",
      "..#..",
      "..#..",
      "....."
    );

    const next = GameOfLife.computeNextGeneration(horizontal);

    assert.deepEqual(next, vertical);
    assert.deepEqual(GameOfLife.computeNextGeneration(next), horizontal);
  });

  it("wraps a blinker around the edges", () => {
    const horizontal = gridFromPicture(
      ".....",
      ".....",
      "##..#",
      ".....",
      "....."
    );
    const vertical = gridFromPicture(
      ".....",
      "#....",
      "#....",
      "#....",
      "....."
    );

    assert.deepEqual(GameOfLife.computeNextGeneration(horizontal), vertical);
  });

  it("handles grids wider than tall", () => {
    const grid = gridFromPicture(
      "........",
      "...###..",
      "........",
      "........",
      "........"
    );
    const expected = gridFromPicture(
      "....#...",
      "....#...",
      "....#...",
      "........",
      "........"
    );

    assert.deepEqual(GameOfLife.computeNextGeneration(grid), expected);
  });

  it("handles grids taller than wide", () => {
    const grid = gridFromPicture(
      ".....",
      ".....",
      ".....",
      ".....",
      ".....",
      "..#..",
      "..#..",
      "..#.."
    );
    const expected = gridFromPicture(
      ".....",
      ".....",
      ".....",
      ".....",
      ".....",
      ".....",
      ".###.",
      "....."
    );

    assert.deepEqual(GameOfLife.computeNextGeneration(grid), expected);
  });

  it("does not modify the current generation", () => {
    const grid = gridFromPicture(
      ".....",
      ".....",
      ".###.",
      ".....",
      "....."
    );
    const copy = structuredClone(grid);

    GameOfLife.computeNextGeneration(grid);

    assert.deepEqual(grid, copy);
  });
});


describe("makeRunMonitor", () => {
  const neverStopping = Infinity;

  /* Period 3. */
  const pulsar = gridFromPicture(
    ".................",
    ".................",
    "....###...###....",
    ".................",
    "..#....#.#....#..",
    "..#....#.#....#..",
    "..#....#.#....#..",
    "....###...###....",
    ".................",
    "....###...###....",
    "..#....#.#....#..",
    "..#....#.#....#..",
    "..#....#.#....#..",
    ".................",
    "....###...###....",
    ".................",
    "................."
  );

  /* On this wrapped 10×10 grid it returns to its start after 40 generations. */
  const glider = gridFromPicture(
    "..#.......",
    "#.#.......",
    ".##.......",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    ".........."
  );

  /* Feeds the generations following seed to monitor until it reports stuck. */
  function generationsUntilStuck(monitor, seed, limit = 100) {
    let grid = seed;
    monitor.start(seed);

    for (let generation = 1; generation <= limit; generation++) {
      grid = GameOfLife.computeNextGeneration(grid);

      if (monitor.isStuck(grid)) {
        return generation;
      }
    }

    return undefined;
  }

  it("detects a still life", () => {
    const block = gridFromPicture(
      "....",
      ".##.",
      ".##.",
      "...."
    );

    assert.equal(generationsUntilStuck(GameOfLife.makeRunMonitor(neverStopping), block), 1);
  });

  it("detects a period-2 oscillator", () => {
    const blinker = gridFromPicture(
      ".....",
      ".....",
      ".###.",
      ".....",
      "....."
    );

    assert.equal(generationsUntilStuck(GameOfLife.makeRunMonitor(neverStopping), blinker), 2);
  });

  it("detects a period-3 oscillator", () => {
    assert.equal(generationsUntilStuck(GameOfLife.makeRunMonitor(neverStopping), pulsar), 3);
  });

  it("misses a period longer than historyLength", () => {
    assert.equal(generationsUntilStuck(GameOfLife.makeRunMonitor(neverStopping), glider), undefined);
  });

  it("reports a run as stuck after maxGenerations generations", () => {
    assert.equal(generationsUntilStuck(GameOfLife.makeRunMonitor(5), glider), 5);
  });

  it("forgets the previous run on start", () => {
    const monitor = GameOfLife.makeRunMonitor(5);

    generationsUntilStuck(monitor, glider);

    assert.equal(generationsUntilStuck(monitor, glider), 5);
  });

  it("forgets generations older than historyLength", () => {
    assert.equal(generationsUntilStuck(GameOfLife.makeRunMonitor(neverStopping, 2), pulsar), undefined);
  });

  it("tells apart grids taller than wide that differ beyond the width", () => {
    const seed = gridFromPicture(
      "...",
      "...",
      "...",
      "...",
      "...",
      "..."
    );
    const next = gridFromPicture(
      "...",
      "...",
      "...",
      "...",
      ".#.",
      "..."
    );
    const monitor = GameOfLife.makeRunMonitor(neverStopping);

    monitor.start(seed);

    assert.equal(monitor.isStuck(next), false);
  });
});
