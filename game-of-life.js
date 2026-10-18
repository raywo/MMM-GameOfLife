/*
  Pure game logic without browser or rendering dependencies.

  A grid holds its width, its height and its cells in one Uint8Array, row by
  row: the cell at (x, y) is cells[y * width + x], the same layout as the
  pixels of an ImageData. A cell is 1 when alive and 0 when dead.
 */
const GameOfLife = {

  /*
    Only whole cells fit on the canvas; a remainder stays empty. The grid
    keeps at least one cell per axis, because an empty grid cannot be
    computed.
   */
  gridSize(canvasWidth, canvasHeight, resolution) {
    return {
      width: Math.max(1, Math.floor(canvasWidth / resolution)),
      height: Math.max(1, Math.floor(canvasHeight / resolution))
    };
  },


  makeGrid(width, height) {
    return { width, height, cells: new Uint8Array(width * height) };
  },


  /* random returns a number in [0, 1), like Math.random. */
  fillGridRandomly(grid, random) {
    for (let i = 0; i < grid.cells.length; i++) {
      grid.cells[i] = Math.floor(random() * 2);
    }
  },


  /*
    Writes the generation after currentGen into nextGen and returns it.
    Passing the previous generation as nextGen lets two grids alternate
    without allocating a new one per generation.
   */
  computeNextGeneration(currentGen, nextGen = GameOfLife.makeGrid(currentGen.width, currentGen.height)) {
    const { width, height } = currentGen;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        nextGen.cells[y * width + x] = GameOfLife.computeNextGenCell(currentGen, x, y);
      }
    }

    return nextGen;
  },


  computeNextGenCell(currentGen, x, y) {
    const currentState = currentGen.cells[y * currentGen.width + x];
    const aliveNeighbors = GameOfLife.countAliveNeighbors(currentGen, x, y);

    if (currentState === 0 && aliveNeighbors === 3) {
      return 1;
    } else if (currentState === 1 && (aliveNeighbors < 2 || aliveNeighbors > 3)) {
      return 0;
    } else {
      return currentState;
    }
  },


  /* The grid wraps around at its edges. */
  countAliveNeighbors(grid, x, y) {
    const { width, height, cells } = grid;
    let count = 0;

    for (let j = -1; j < 2; j++) {
      const rowStart = ((y + j + height) % height) * width;

      for (let i = -1; i < 2; i++) {
        count += cells[rowStart + (x + i + width) % width];
      }
    }

    count -= cells[y * width + x];

    return count;
  },


  /* How many past generations a run compares each new generation with. */
  historyLength: 30,


  /*
    Watches one run from its seed. A run is stuck when a new generation
    repeats one of the last historyLength generations, which covers still
    lifes and oscillators up to that period, or when it has lasted
    maxGenerations generations. The limit catches what the history misses,
    such as a glider whose period on the wrapped grid exceeds the history.

    The history copies generations into buffers it allocates once per grid
    size, so watching a run allocates nothing per generation.
   */
  makeRunMonitor(maxGenerations, historyLength = GameOfLife.historyLength) {
    let history = [];
    let stored = 0;
    let oldest = 0;
    let generations = 0;

    function remember(grid) {
      if (history.length === 0 || history[0].length !== grid.cells.length) {
        history = Array.from({ length: historyLength }, () => new Uint8Array(grid.cells.length));
      }

      history[oldest].set(grid.cells);
      oldest = (oldest + 1) % historyLength;
      stored = Math.min(stored + 1, historyLength);
    }

    function remembers(grid) {
      for (let i = 0; i < stored; i++) {
        if (GameOfLife.sameCells(history[i], grid.cells)) {
          return true;
        }
      }

      return false;
    }

    return {
      start(seed) {
        stored = 0;
        oldest = 0;
        generations = 0;
        remember(seed);
      },

      isStuck(nextGen) {
        generations++;

        if (generations >= maxGenerations || remembers(nextGen)) {
          return true;
        }

        remember(nextGen);

        return false;
      }
    };
  },


  sameCells(cells, otherCells) {
    if (cells.length !== otherCells.length) {
      return false;
    }

    for (let i = 0; i < cells.length; i++) {
      if (cells[i] !== otherCells[i]) {
        return false;
      }
    }

    return true;
  }
};


if (typeof module !== "undefined" && module.exports) {
  module.exports = GameOfLife;
}
