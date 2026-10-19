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

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      grid.cells[y * width + x] = lines[y][x] === "#" ? 1 : 0;
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
  it("creates width times height dead cells", () => {
    const grid = GameOfLife.makeGrid(3, 5);

    assert.equal(grid.width, 3);
    assert.equal(grid.height, 5);
    assert.deepEqual(grid.cells, new Uint8Array(15));
  });
});


describe("fillGridRandomly", () => {
  it("fills every cell from the passed random source", () => {
    const grid = GameOfLife.makeGrid(2, 2);
    const values = [0.1, 0.9, 0.5, 0.49];
    const random = () => values.shift();

    GameOfLife.fillGridRandomly(grid, random);

    assert.deepEqual(grid, gridFromPicture(
      ".#",
      "#."
    ));
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

  it("writes into the passed next generation and returns it", () => {
    const horizontal = gridFromPicture(
      ".....",
      ".....",
      ".###.",
      ".....",
      "....."
    );
    const nextGen = gridFromPicture(
      "#####",
      "#####",
      "#####",
      "#####",
      "#####"
    );

    const result = GameOfLife.computeNextGeneration(horizontal, nextGen);

    assert.equal(result, nextGen);
    assert.deepEqual(nextGen, gridFromPicture(
      ".....",
      "..#..",
      "..#..",
      "..#..",
      "....."
    ));
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

  it("keeps its own copy of generations whose grids are reused", () => {
    const monitor = GameOfLife.makeRunMonitor(neverStopping);
    let currentGen = structuredClone(glider);
    let nextGen = GameOfLife.makeGrid(glider.width, glider.height);
    let stuckAt;

    monitor.start(currentGen);

    for (let generation = 1; generation <= 10 && !stuckAt; generation++) {
      GameOfLife.computeNextGeneration(currentGen, nextGen);

      if (monitor.isStuck(nextGen)) {
        stuckAt = generation;
      }

      [currentGen, nextGen] = [nextGen, currentGen];
    }

    assert.equal(stuckAt, undefined);
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


describe("updateCellAges", () => {
  it("counts a newborn cell as alive for one generation", () => {
    const grid = gridFromPicture("#.");
    const ages = GameOfLife.makeCellAges(2, 1);

    GameOfLife.updateCellAges(ages, grid);

    assert.deepEqual(ages.aliveFor, Uint8Array.of(1, 0));
    assert.deepEqual(ages.deadFor, Uint8Array.of(0, 0));
  });

  it("counts the generations a cell stays alive", () => {
    const grid = gridFromPicture("#");
    const ages = GameOfLife.makeCellAges(1, 1);

    for (let i = 0; i < 3; i++) {
      GameOfLife.updateCellAges(ages, grid);
    }

    assert.deepEqual(ages.aliveFor, Uint8Array.of(3));
  });

  it("counts the generations since a cell died", () => {
    const ages = GameOfLife.makeCellAges(1, 1);

    GameOfLife.updateCellAges(ages, gridFromPicture("#"));
    GameOfLife.updateCellAges(ages, gridFromPicture("."));
    GameOfLife.updateCellAges(ages, gridFromPicture("."));

    assert.deepEqual(ages.deadFor, Uint8Array.of(2));
  });

  it("remembers how long a dead cell lived", () => {
    const ages = GameOfLife.makeCellAges(1, 1);

    GameOfLife.updateCellAges(ages, gridFromPicture("#"));
    GameOfLife.updateCellAges(ages, gridFromPicture("#"));
    GameOfLife.updateCellAges(ages, gridFromPicture("."));
    GameOfLife.updateCellAges(ages, gridFromPicture("."));

    assert.deepEqual(ages.aliveFor, Uint8Array.of(2));
  });

  it("restarts the count when a dead cell is born again", () => {
    const ages = GameOfLife.makeCellAges(1, 1);

    GameOfLife.updateCellAges(ages, gridFromPicture("#"));
    GameOfLife.updateCellAges(ages, gridFromPicture("#"));
    GameOfLife.updateCellAges(ages, gridFromPicture("."));
    GameOfLife.updateCellAges(ages, gridFromPicture("#"));

    assert.deepEqual(ages.aliveFor, Uint8Array.of(1));
    assert.deepEqual(ages.deadFor, Uint8Array.of(0));
  });

  it("leaves cells that have never lived at zero", () => {
    const ages = GameOfLife.makeCellAges(1, 1);

    GameOfLife.updateCellAges(ages, gridFromPicture("."));
    GameOfLife.updateCellAges(ages, gridFromPicture("."));

    assert.deepEqual(ages.deadFor, Uint8Array.of(0));
  });

  it("stops counting at 255", () => {
    const ages = GameOfLife.makeCellAges(2, 1);
    ages.aliveFor[0] = 255;
    ages.deadFor[1] = 255;

    GameOfLife.updateCellAges(ages, gridFromPicture("#."));

    assert.deepEqual(ages.aliveFor, Uint8Array.of(255, 0));
    assert.deepEqual(ages.deadFor, Uint8Array.of(0, 255));
  });
});


describe("resetCellAges", () => {
  it("forgets every age", () => {
    const ages = GameOfLife.makeCellAges(2, 1);
    ages.aliveFor[0] = 4;
    ages.deadFor[1] = 2;

    GameOfLife.resetCellAges(ages);

    assert.deepEqual(ages, GameOfLife.makeCellAges(2, 1));
  });
});


describe("agePalette", () => {
  const young = [200, 100, 0, 255];
  const old = [0, 100, 200, 255];

  it("has one color per possible aliveFor value", () => {
    assert.equal(GameOfLife.agePalette(young, old, 10).length, 256);
  });

  it("gives a newborn cell the young color", () => {
    assert.deepEqual(GameOfLife.agePalette(young, old, 10)[1], young);
  });

  it("blends evenly from the young to the old color", () => {
    assert.deepEqual(GameOfLife.agePalette(young, old, 4)[3], [100, 100, 100, 255]);
  });

  it("keeps the old color once a cell has aged agingGenerations generations", () => {
    const palette = GameOfLife.agePalette(young, old, 4);

    assert.deepEqual(palette[5], old);
    assert.deepEqual(palette[255], old);
  });

  it("gives every cell the same color when young and old color match", () => {
    const palette = GameOfLife.agePalette(young, young, 20);

    palette.forEach(color => assert.deepEqual(color, young));
  });
});


describe("afterglowPalette", () => {
  const young = [170, 170, 170, 255];
  const old = [17, 51, 119, 255];

  it("has one row per age color and one color per possible deadFor value", () => {
    const palette = GameOfLife.afterglowPalette([young, old], 3);

    assert.equal(palette.length, 2);
    assert.equal(palette[1].length, 256);
  });

  it("keeps cells that have never lived transparent", () => {
    assert.deepEqual(GameOfLife.afterglowPalette([young], 3)[0][0], [0, 0, 0, 0]);
  });

  it("starts at half the alpha and fades out evenly", () => {
    const alphas = GameOfLife.afterglowPalette([young], 4)[0].slice(1, 5).map(glow => glow[3]);

    assert.deepEqual(alphas, [128, 96, 64, 32]);
  });

  it("fades out in the color the cell had last", () => {
    const palette = GameOfLife.afterglowPalette([young, old], 2);

    assert.deepEqual(palette[0][1].slice(0, 3), [170, 170, 170]);
    assert.deepEqual(palette[1][1].slice(0, 3), [17, 51, 119]);
  });

  it("turns transparent after afterglow generations", () => {
    const palette = GameOfLife.afterglowPalette([young], 2)[0];

    assert.deepEqual(palette[3], [0, 0, 0, 0]);
    assert.deepEqual(palette[255], [0, 0, 0, 0]);
  });

  it("keeps every dead cell transparent when afterglow is 0", () => {
    const palette = GameOfLife.afterglowPalette([young, old], 0);

    assert.ok(palette.flat().every(glow => glow[3] === 0));
  });
});


describe("blendColors", () => {
  it("returns from at progress 0 and to at progress 1", () => {
    const from = [0, 0, 0, 0];
    const to = [255, 255, 255, 255];

    assert.deepEqual(GameOfLife.blendColors(from, to, 0), from);
    assert.deepEqual(GameOfLife.blendColors(from, to, 1), to);
  });

  it("rounds each channel to a whole number", () => {
    assert.deepEqual(GameOfLife.blendColors([0, 0, 0, 0], [1, 3, 5, 7], 0.5), [1, 2, 3, 4]);
  });
});
