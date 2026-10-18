/*
  Measures the CPU load of MagicMirror² running this module in headless Chrome.

  Start MagicMirror with the demanding configuration first:

    MM_CONFIG_FILE=config/config.performance.js docker compose up -d --force-recreate

  Then run:

    node dev/measure-performance.mjs [--runs 3] [--warmup 10] [--duration 60]

  CHROME points to the Chrome binary, URL to MagicMirror (default
  http://localhost:8080/). CPU shares are percent of one core, averaged over
  the measuring window. The numbers depend on the machine: compare only
  measurements taken on the same machine.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";

const { values: options } = parseArgs({
  options: {
    runs: { type: "string", default: "3" },
    warmup: { type: "string", default: "10" },
    duration: { type: "string", default: "60" }
  }
});
const runs = Number(options.runs);
const warmupSeconds = Number(options.warmup);
const durationSeconds = Number(options.duration);

const chromePath = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const url = process.env.URL ?? "http://localhost:8080/";
const debuggingPort = 9333;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));


async function connect(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });

  let lastId = 0;
  const pending = new Map();
  const errors = [];

  socket.onmessage = event => {
    const message = JSON.parse(event.data);

    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    } else if (message.method === "Runtime.exceptionThrown") {
      const details = message.params.exceptionDetails;
      errors.push(details.exception?.description ?? details.text);
    } else if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
      errors.push(message.params.entry.text);
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++lastId;
      pending.set(id, message => message.error ? reject(new Error(`${method}: ${message.error.message}`)) : resolve(message.result));
      socket.send(JSON.stringify({ id, method, params }));
    });
  }

  return { send, errors, close: () => socket.close() };
}


async function waitForDebugger() {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${debuggingPort}/json/version`);
      return await response.json();
    } catch {
      await sleep(200);
    }
  }

  throw new Error("Chrome did not open its debugging port");
}


async function cpuTimeByType(browser) {
  const { processInfo } = await browser.send("SystemInfo.getProcessInfo");
  const byType = {};

  for (const process of processInfo) {
    byType[process.type] = (byType[process.type] ?? 0) + process.cpuTime;
  }

  return byType;
}


async function pageMetrics(page) {
  const { metrics } = await page.send("Performance.getMetrics");

  return Object.fromEntries(metrics.map(metric => [metric.name, metric.value]));
}


async function measureOnce() {
  const profileDir = mkdtempSync(join(tmpdir(), "mmm-gol-chrome-"));
  const chrome = spawn(chromePath, [
    "--headless=new",
    `--remote-debugging-port=${debuggingPort}`,
    `--user-data-dir=${profileDir}`,
    "--window-size=1280,800",
    "about:blank"
  ], { stdio: "ignore" });

  try {
    const version = await waitForDebugger();
    const browser = await connect(version.webSocketDebuggerUrl);
    const targets = await (await fetch(`http://127.0.0.1:${debuggingPort}/json`)).json();
    const page = await connect(targets.find(target => target.type === "page").webSocketDebuggerUrl);

    await page.send("Runtime.enable");
    await page.send("Log.enable");
    await page.send("Performance.enable", { timeDomain: "threadTicks" });
    await page.send("Page.navigate", { url });
    await sleep(warmupSeconds * 1000);

    const { result } = await page.send("Runtime.evaluate", {
      expression: `JSON.stringify({
        moduleConfig: MM.getModules().withClass("MMM-GameOfLife")[0]?.config,
        canvas: document.querySelector(".MMM-GameOfLife canvas") !== null
      })`,
      returnByValue: true
    });
    const pageState = JSON.parse(result.value);

    const cpuBefore = await cpuTimeByType(browser);
    const metricsBefore = await pageMetrics(page);
    const start = performance.now();

    await sleep(durationSeconds * 1000);

    const cpuAfter = await cpuTimeByType(browser);
    const metricsAfter = await pageMetrics(page);
    const elapsedSeconds = (performance.now() - start) / 1000;

    const percent = seconds => Math.round(seconds / elapsedSeconds * 1000) / 10;
    const cpu = {};
    for (const type of Object.keys(cpuAfter)) {
      cpu[type] = percent(cpuAfter[type] - (cpuBefore[type] ?? 0));
    }
    cpu.total = percent(Object.keys(cpuAfter).reduce((sum, type) => sum + cpuAfter[type] - (cpuBefore[type] ?? 0), 0));

    const delta = name => metricsAfter[name] - metricsBefore[name];

    browser.close();
    page.close();

    return {
      ...pageState,
      cpuPercent: cpu,
      mainThreadPercent: {
        task: percent(delta("TaskDuration")),
        script: percent(delta("ScriptDuration")),
        layout: percent(delta("LayoutDuration")),
        recalcStyle: percent(delta("RecalcStyleDuration"))
      },
      jsHeapUsedMB: Math.round(metricsAfter.JSHeapUsedSize / 1024 / 1024 * 10) / 10,
      errors: page.errors
    };
  } finally {
    chrome.kill();
    await sleep(500);
    rmSync(profileDir, { recursive: true, force: true });
  }
}


const results = [];
for (let run = 1; run <= runs; run++) {
  console.error(`Run ${run}/${runs}: ${warmupSeconds} s warm-up, ${durationSeconds} s measuring …`);
  results.push(await measureOnce());
}

console.log(JSON.stringify({
  measuredAt: new Date().toISOString(),
  url,
  warmupSeconds,
  durationSeconds,
  runs: results
}, null, 2));
