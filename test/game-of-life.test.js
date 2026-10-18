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


describe("representingSameState", () => {
  it("reports equal grids as the same state", () => {
    const left = gridFromPicture("#..", ".#.", "..#");
    const right = gridFromPicture("#..", ".#.", "..#");

    assert.equal(GameOfLife.representingSameState(left, right), true);
  });

  it("reports grids differing in one cell as different states", () => {
    const left = gridFromPicture("#..", ".#.", "..#");
    const right = gridFromPicture("#..", ".#.", "...");

    assert.equal(GameOfLife.representingSameState(left, right), false);
  });

  it("detects a difference in a grid wider than tall", () => {
    const left = gridFromPicture("....", "....", "....");
    const right = gridFromPicture("....", "....", "...#");

    assert.equal(GameOfLife.representingSameState(left, right), false);
  });
});
