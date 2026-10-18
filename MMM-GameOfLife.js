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
    oldAliveColorCode: null,
    agingGenerations: 20,
    afterglow: 0,
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

    this.config.agingGenerations = Math.min(Math.max(this.config.agingGenerations, 1), 100);
    this.config.afterglow = Math.min(Math.max(this.config.afterglow, 0), 100);
  },


  /*
    Draws each generation as one pixel per cell into a small offscreen
    canvas and scales it up to the visible canvas in a single draw call.
    Dead cells stay transparent; the canvas background shows the dead color,
    which makes "transparent" just another color. Cells touch each other,
    as they did in the earlier p5.js rendering.

    The color of a cell comes from its age: living cells look up their
    color by aliveFor, dead cells by aliveFor and deadFor. Both palettes
    are computed once, so drawing a cell stays a single lookup. Cells
    alive for more than agingGenerations + 1 generations all have the old
    color, so the afterglow palette stops at that row.
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
    const aliveColor = rgbaOf(conf.aliveColorCode);
    const oldAliveColor = conf.oldAliveColorCode ? rgbaOf(conf.oldAliveColorCode) : aliveColor;
    const ageColors = GameOfLife.agePalette(aliveColor, oldAliveColor, conf.agingGenerations);
    const lastAgeRow = conf.agingGenerations + 1;
    const alivePixels = pixelsOf(ageColors);
    const deadPixels = pixelsOf(GameOfLife.afterglowPalette(ageColors.slice(0, lastAgeRow + 1), conf.afterglow).flat());

    let currentGen = GameOfLife.makeGrid(gridWidth, gridHeight);
    let nextGen = GameOfLife.makeGrid(gridWidth, gridHeight);
    const ages = GameOfLife.makeCellAges(gridWidth, gridHeight);
    let timer = null;

    seed();


    function seed() {
      GameOfLife.fillGridRandomly(currentGen, Math.random);
      GameOfLife.resetCellAges(ages);
      GameOfLife.updateCellAges(ages, currentGen);
      runMonitor.start(currentGen);
    }


    function step() {
      draw(currentGen);
      GameOfLife.computeNextGeneration(currentGen, nextGen);

      if (runMonitor.isStuck(nextGen)) {
        seed();
      } else {
        [currentGen, nextGen] = [nextGen, currentGen];
        GameOfLife.updateCellAges(ages, currentGen);
      }
    }


    /* Subtracts the time a step takes, so the frame rate holds. */
    function tick() {
      const stepStart = performance.now();
      step();
      timer = setTimeout(tick, Math.max(0, frameInterval - (performance.now() - stepStart)));
    }


    function draw(grid) {
      const { aliveFor, deadFor } = ages;

      for (let i = 0; i < grid.cells.length; i++) {
        pixels[i] = grid.cells[i] === 1
          ? alivePixels[aliveFor[i]]
          : deadPixels[Math.min(aliveFor[i], lastAgeRow) * 256 + deadFor[i]];
      }

      generationContext.putImageData(image, 0, 0);
      context.clearRect(0, 0, canvasWidth, canvasHeight);
      context.drawImage(generationCanvas, 0, 0, gridWidth * resolution, gridHeight * resolution);
    }


    /* Lets the browser parse the CSS color into [red, green, blue, alpha]. */
    function rgbaOf(colorCode) {
      const probeCanvas = document.createElement("canvas");
      probeCanvas.width = 1;
      probeCanvas.height = 1;

      const probe = probeCanvas.getContext("2d");
      probe.fillStyle = colorCode;
      probe.fillRect(0, 0, 1, 1);

      return Array.from(probe.getImageData(0, 0, 1, 1).data);
    }


    /*
      Packs colors into pixels in the byte order the ImageData of this
      machine uses, by writing their bytes through the same kind of view.
     */
    function pixelsOf(colors) {
      const palette = new Uint32Array(colors.length);
      const bytes = new Uint8ClampedArray(palette.buffer);

      colors.forEach((color, i) => bytes.set(color, i * 4));

      return palette;
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
