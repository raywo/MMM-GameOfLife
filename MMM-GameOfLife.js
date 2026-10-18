Module.register("MMM-GameOfLife", {

  // Default module config.
  defaults: {
    name: "MMM-GameOfLife",

    desiredFrameRate: 1,
    resolution: 10,
    canvasWidth: 300,
    canvasHeight: 300,
    notAliveColorCode: "#000",
    aliveColorCode: "#aaa"
  },


  start() {
    Log.info("Starting module: " + this.name);
    this.sanitizeConfig();
  },


  getDom() {
    const wrapper = document.createElement("div");
    wrapper.id = "gameOfLifeWrapper";

    return wrapper;
  },

  getScripts() {
    return [
      "https://cdnjs.cloudflare.com/ajax/libs/p5.js/0.6.0/p5.js"
    ];
  },


  notificationReceived(notification) {
    if (notification === "DOM_OBJECTS_CREATED") {
      Log.info("DOM objects are created. Starting P5 …");

      const sketch = this.makeSketch(this.config);
      new p5(sketch, "gameOfLifeWrapper");
    }
  },


  sanitizeConfig() {
    if (this.config.desiredFrameRate < 1) {
      this.config.desiredFrameRate = 1;
    }

    if (this.config.resolution < 2) {
      this.config.resolution = 2;
    }

    if (this.config.canvasWidth < 50) {
      this.config.canvasWidth = 50;
    }

    if (this.config.canvasHeight < 50) {
      this.config.canvasHeight = 50;
    }
  },


  makeSketch(conf) {
    return function(pFive) {
      let currentGenGrid;
      let lastGenGrid;

      /* user definable parameters */
      const desiredFrameRate = conf.desiredFrameRate;
      const resolution = conf.resolution;
      const canvasWidth = conf.canvasWidth;
      const canvasHeight = conf.canvasHeight;
      const notAliveColorCode = conf.notAliveColorCode;
      const aliveColorCode = conf.aliveColorCode;
      const notAliveColor = getNotAliveColor(notAliveColorCode);

      /* computed parameters */
      const rows = canvasWidth / resolution;
      const cols = canvasHeight / resolution;


      pFive.setup = function() {
        pFive.frameRate(desiredFrameRate);
        pFive.createCanvas(canvasWidth, canvasHeight);

        lastGenGrid = makeGrid(rows, cols);
        currentGenGrid = makeGrid(rows, cols);
        fillGridRandomly(currentGenGrid);
      };


      pFive.draw = function() {
        pFive.clear();
        pFive.background(notAliveColor);

        drawGrid(currentGenGrid);
        const nextGenGrid = computeNextGeneration(currentGenGrid);

        if (representingSameState(nextGenGrid, currentGenGrid) || representingSameState(nextGenGrid, lastGenGrid)) {
          fillGridRandomly(currentGenGrid);
        } else {
          lastGenGrid = currentGenGrid;
          currentGenGrid = nextGenGrid;
        }
      };


      /*
        "Private functions"
       */

      function getNotAliveColor() {
        if (notAliveColorCode === "transparent") {
          return pFive.color("rgba(0, 0, 0, 0)");
        } else {
          return pFive.color(notAliveColorCode);
        }
      }


      function makeGrid(rows, cols) {
        const array = new Array(rows);

        for (let i = 0; i < rows; i++) {
          array[i] = new Array(cols);
        }

        return array;
      }


      function fillGridRandomly(grid) {
        for (let i = 0; i < grid.length; i++) {
          for (let j = 0; j < grid[i].length; j++) {
            grid[i][j] = pFive.floor(pFive.random(2));
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
        const aliveColor = pFive.color(aliveColorCode);

        if (grid[i][j] === 1) {
          pFive.fill(aliveColor);
          pFive.stroke(aliveColor);

          const x = i * resolution;
          const y = j * resolution;
          pFive.rect(x, y, resolution - 1, resolution - 1);
        }
      }


      function computeNextGeneration(currentGen) {
        const nextGen = makeGrid(rows, cols);

        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < cols; j++) {
            computeNextGenCell(i, j, currentGen, nextGen);
          }
        }

        return nextGen;
      }


      function computeNextGenCell(i, j, currentGen, nextGen) {
        const currentState = currentGen[i][j];
        const aliveNeighbors = countAliveNeighbors(currentGen, i, j);

        if (currentState === 0 && aliveNeighbors === 3) {
          nextGen[i][j] = 1;
        } else if (currentState === 1 && (aliveNeighbors < 2 || aliveNeighbors > 3)) {
          nextGen[i][j] = 0;
        } else {
          nextGen[i][j] = currentState;
        }
      }


      function countAliveNeighbors(grid, x, y) {
        let count = 0;

        for (let i = -1; i < 2; i++) {
          for (let j = -1; j < 2; j++) {
            const row = (x + i + rows) % rows;
            const col = (y + j + cols) % cols;

            count += grid[row][col];
          }
        }

        count -= grid[x][y];

        return count;
      }


      function representingSameState(leftGrid, rightGrid) {
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
  }
});