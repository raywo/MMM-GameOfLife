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


  /*
    MagicMirror may call getDom more than once. The canvas and its
    simulation belong to this instance and are created only on the first
    call, so every call returns the same running canvas.
   */
  getDom() {
    if (!this.simulation) {
      const canvas = document.createElement("canvas");
      this.simulation = this.makeSimulation(canvas, this.config);

      if (!this.suspended) {
        this.simulation.start();
      }
    }

    return this.simulation.canvas;
  },

  getScripts() {
    return [
      this.file("game-of-life.js")
    ];
  },


  suspend() {
    this.suspended = true;
    this.simulation?.stop();
  },


  resume() {
    this.suspended = false;
    this.simulation?.start();
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


  /*
    Draws each generation as one pixel per cell into a small offscreen
    canvas and scales it up to the visible canvas in a single draw call.
    Dead cells stay transparent; the canvas background shows the dead color,
    which makes "transparent" just another color. Cells touch each other,
    as they did in the earlier p5.js rendering.
   */
  makeSimulation(canvas, conf) {
    const { desiredFrameRate, resolution, canvasWidth, canvasHeight, restartTimer } = conf;
    const { width: gridWidth, height: gridHeight } = GameOfLife.gridSize(canvasWidth, canvasHeight, resolution);
    const runMonitor = GameOfLife.makeRunMonitor(restartTimer * desiredFrameRate);
    const frameInterval = 1000 / desiredFrameRate;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.display = "block";
    canvas.style.backgroundColor = conf.notAliveColorCode;
    canvas.style.imageRendering = "pixelated";

    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = false;

    const generationCanvas = document.createElement("canvas");
    generationCanvas.width = gridWidth;
    generationCanvas.height = gridHeight;

    const generationContext = generationCanvas.getContext("2d");
    const image = generationContext.createImageData(gridWidth, gridHeight);
    const pixels = new Uint32Array(image.data.buffer);
    const alivePixel = pixelOf(conf.aliveColorCode);

    let currentGen = GameOfLife.makeGrid(gridWidth, gridHeight);
    let nextGen = GameOfLife.makeGrid(gridWidth, gridHeight);
    let timer = null;

    GameOfLife.fillGridRandomly(currentGen, Math.random);
    runMonitor.start(currentGen);


    function step() {
      draw(currentGen);
      GameOfLife.computeNextGeneration(currentGen, nextGen);

      if (runMonitor.isStuck(nextGen)) {
        GameOfLife.fillGridRandomly(currentGen, Math.random);
        runMonitor.start(currentGen);
      } else {
        [currentGen, nextGen] = [nextGen, currentGen];
      }
    }


    /* Subtracts the time a step takes, so the frame rate holds. */
    function tick() {
      const stepStart = performance.now();
      step();
      timer = setTimeout(tick, Math.max(0, frameInterval - (performance.now() - stepStart)));
    }


    function draw(grid) {
      for (let i = 0; i < grid.cells.length; i++) {
        pixels[i] = grid.cells[i] === 1 ? alivePixel : 0;
      }

      generationContext.putImageData(image, 0, 0);
      context.clearRect(0, 0, canvasWidth, canvasHeight);
      context.drawImage(generationCanvas, 0, 0, gridWidth * resolution, gridHeight * resolution);
    }


    /*
      Lets the browser parse the CSS color once, in the byte order the
      ImageData of this machine uses.
     */
    function pixelOf(colorCode) {
      const probeCanvas = document.createElement("canvas");
      probeCanvas.width = 1;
      probeCanvas.height = 1;

      const probe = probeCanvas.getContext("2d");
      probe.fillStyle = colorCode;
      probe.fillRect(0, 0, 1, 1);

      return new Uint32Array(probe.getImageData(0, 0, 1, 1).data.buffer)[0];
    }


    return {
      canvas,

      start() {
        if (timer === null) {
          tick();
        }
      },

      stop() {
        clearTimeout(timer);
        timer = null;
      }
    };
  }
});
