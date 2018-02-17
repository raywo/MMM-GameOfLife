"use strict";

let currentGenGrid;
let lastGenGrid;

/* user definable parameters */
let desiredFrameRate = 1;
let resolution = 10;
let canvasWidth = 300;
let canvasHeight = 300;
let notAliveColorCode = "#000";
let aliveColorCode = "#aaa";

/* computed parameters */
let rows = canvasWidth / resolution;
let cols = canvasHeight / resolution;


function setup() {
  frameRate(desiredFrameRate);
  let canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent("gameOfLifeWrapper");

  lastGenGrid = makeGrid(rows, cols);
  currentGenGrid = makeGrid(rows, cols);
  fillGridRandomly(currentGenGrid);
}

function draw() {
  let notAlifeColor = color(notAliveColorCode);
  background(notAlifeColor);

  drawGrid(currentGenGrid);
  let nextGenGrid = computeNextGeneration(currentGenGrid);

  if (gridsEqual(nextGenGrid, currentGenGrid) || gridsEqual(nextGenGrid, lastGenGrid)) {
    fillGridRandomly(currentGenGrid);
  } else {
    lastGenGrid = currentGenGrid;
    currentGenGrid = nextGenGrid;
  }
}


/*
Private functions
 */

function makeGrid(rows, cols) {
  let array = new Array(rows);

  for (let i = 0; i < rows; i++) {
    array[i] = new Array(cols);
  }

  return array;
}


function fillGridRandomly(grid) {
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      grid[i][j] = floor(random(2));
    }
  }
}


function drawGrid(grid) {
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      drawCell(grid, i, j);
    }
  }
}


function drawCell(grid, i, j) {
  let aliveColor = color(aliveColorCode);

  if (grid[i][j] === 1) {
    fill(aliveColor);
    stroke(aliveColor);

    let x = i * resolution;
    let y = j * resolution;
    rect(x, y, resolution - 1, resolution - 1);
  }
}


function computeNextGeneration(currentGen) {
  let nextGen = makeGrid(rows, cols);

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      let currentState = currentGen[i][j];
      let aliveNeighbors = countAliveNeighbors(currentGen, i, j);

      if (currentState === 0 && aliveNeighbors === 3) {
        nextGen[i][j] = 1;
      } else if (currentState === 1 && (aliveNeighbors < 2 || aliveNeighbors > 3)) {
        nextGen[i][j] = 0;
      } else {
        nextGen[i][j] = currentState;
      }
    }
  }

  return nextGen;
}


function countAliveNeighbors(grid, x, y) {
  let count = 0;

  for (let i = -1; i < 2; i++) {
    for (let j = -1; j < 2; j++) {
      let row = (x + i + rows) % rows;
      let col = (y + j + cols) % cols;

      count += grid[row][col];
    }
  }

  count -= grid[x][y];

  return count;
}


function gridsEqual(leftGrid, rightGrid) {
  if (!rightGrid) {
    return false;
  }

  if (leftGrid.length !== rightGrid.length) {
    return false;
  }

  for (let i = 0; i < leftGrid.length; i++) {
    if (leftGrid[i].length !== rightGrid[i].length) {
      return false;
    }

    for (let j = 0; j < leftGrid[i].length; j++) {
      if (leftGrid[i][j] !== rightGrid[i][j]) {
        return false;
      }
    }
  }

  return true;
}
