/*
  Pure game logic without browser or rendering dependencies.

  A grid is indexed as grid[x][y]: the outer array holds one column per cell
  along the x axis, each column holds one cell per cell along the y axis.
  A cell is 1 when alive and 0 when dead.
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
    const grid = new Array(width);

    for (let x = 0; x < width; x++) {
      grid[x] = new Array(height);
    }

    return grid;
  },


  /* random returns a number in [0, 1), like Math.random. */
  fillGridRandomly(grid, random) {
    for (let x = 0; x < grid.length; x++) {
      for (let y = 0; y < grid[x].length; y++) {
        grid[x][y] = Math.floor(random() * 2);
      }
    }
  },


  computeNextGeneration(currentGen) {
    const width = currentGen.length;
    const height = currentGen[0].length;
    const nextGen = GameOfLife.makeGrid(width, height);

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        nextGen[x][y] = GameOfLife.computeNextGenCell(currentGen, x, y);
      }
    }

    return nextGen;
  },


  computeNextGenCell(currentGen, x, y) {
    const currentState = currentGen[x][y];
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
    const width = grid.length;
    const height = grid[0].length;
    let count = 0;

    for (let i = -1; i < 2; i++) {
      for (let j = -1; j < 2; j++) {
        const neighborX = (x + i + width) % width;
        const neighborY = (y + j + height) % height;

        count += grid[neighborX][neighborY];
      }
    }

    count -= grid[x][y];

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
   */
  makeRunMonitor(maxGenerations, historyLength = GameOfLife.historyLength) {
    const history = [];
    let generations = 0;

    return {
      start(seed) {
        history.length = 0;
        history.push(GameOfLife.stateKey(seed));
        generations = 0;
      },

      isStuck(nextGen) {
        const key = GameOfLife.stateKey(nextGen);
        generations++;

        if (generations >= maxGenerations || history.includes(key)) {
          return true;
        }

        history.push(key);

        if (history.length > historyLength) {
          history.shift();
        }

        return false;
      }
    };
  },


  /* Two grids of the same size share a key exactly when all cells match. */
  stateKey(grid) {
    return grid.flat().join("");
  }
};


if (typeof module !== "undefined" && module.exports) {
  module.exports = GameOfLife;
}
