/*
  Pure game logic without browser or rendering dependencies.

  A grid is indexed as grid[x][y]: the outer array holds one column per cell
  along the x axis, each column holds one cell per cell along the y axis.
  A cell is 1 when alive and 0 when dead.
 */
const GameOfLife = {

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


  representingSameState(leftGrid, rightGrid) {
    for (let i = 0; i < leftGrid.length; i++) {
      for (let j = 0; j < leftGrid.length; j++) {
        if (leftGrid[i][j] !== rightGrid[i][j]) {
          return false;
        }
      }
    }

    return true;
  }
};


if (typeof module !== "undefined" && module.exports) {
  module.exports = GameOfLife;
}
