Module.register("MMM-GameOfLife", {

  // Default module config.
  defaults: {
    name: "MMM-GameOfLife",

    desiredFrameRate: 1,
    resolution: 10,
    canvasWidth: 300,
    canvasHeight: 300,
    notAliveColorCode: "#000",
    aliveColorCode: "#aaa",
    restartTimer: 600
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
      "https://cdnjs.cloudflare.com/ajax/libs/p5.js/0.6.0/p5.js",
      this.file("game-of-life.js")
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

    if (this.config.restartTimer < 1) {
      this.config.restartTimer = 1;
    }
  },


  makeSketch(conf) {
    return function(pFive) {
      let currentGenGrid;

      /* user definable parameters */
      const desiredFrameRate = conf.desiredFrameRate;
      const resolution = conf.resolution;
      const canvasWidth = conf.canvasWidth;
      const canvasHeight = conf.canvasHeight;
      const notAliveColorCode = conf.notAliveColorCode;
      const aliveColorCode = conf.aliveColorCode;
      const notAliveColor = getNotAliveColor(notAliveColorCode);
      const restartTimer = conf.restartTimer;

      /* computed parameters */
      const { width: gridWidth, height: gridHeight } = GameOfLife.gridSize(canvasWidth, canvasHeight, resolution);
      const random = () => pFive.random();
      const runMonitor = GameOfLife.makeRunMonitor(restartTimer * desiredFrameRate);


      pFive.setup = function() {
        pFive.frameRate(desiredFrameRate);
        pFive.createCanvas(canvasWidth, canvasHeight);

        currentGenGrid = GameOfLife.makeGrid(gridWidth, gridHeight);
        GameOfLife.fillGridRandomly(currentGenGrid, random);
        runMonitor.start(currentGenGrid);
      };


      pFive.draw = function() {
        pFive.clear();
        pFive.background(notAliveColor);

        drawGrid(currentGenGrid);
        const nextGenGrid = GameOfLife.computeNextGeneration(currentGenGrid);

        if (runMonitor.isStuck(nextGenGrid)) {
          GameOfLife.fillGridRandomly(currentGenGrid, random);
          runMonitor.start(currentGenGrid);
        } else {
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


      function drawGrid(grid) {
        for (let x = 0; x < grid.length; x++) {
          for (let y = 0; y < grid[x].length; y++) {
            drawCell(grid, x, y);
          }
        }
      }


      function drawCell(grid, x, y) {
        const aliveColor = pFive.color(aliveColorCode);

        if (grid[x][y] === 1) {
          pFive.fill(aliveColor);
          pFive.stroke(aliveColor);

          pFive.rect(x * resolution, y * resolution, resolution - 1, resolution - 1);
        }
      }
    };
  }
});