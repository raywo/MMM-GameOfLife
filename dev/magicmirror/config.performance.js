/*
  Demanding configuration for CPU measurements with dev/measure-performance.mjs.
  Keep it unchanged, so measurements before and after a change compare.
 */
const config = {
  address: "0.0.0.0",
  port: 8080,
  ipWhitelist: ["127.0.0.1", "::ffff:127.0.0.1", "::1", "192.168.0.0/16", "172.16.0.0/12", "10.0.0.0/8"],

  language: "en",
  locale: "en-US",
  logLevel: ["INFO", "LOG", "WARN", "ERROR"],

  modules: [
    {
      module: "MMM-GameOfLife",
      position: "middle_center",
      config: {
        desiredFrameRate: 10,
        resolution: 2,
        canvasWidth: 300,
        canvasHeight: 300
      }
    }
  ]
};

/*************** DO NOT EDIT THE LINE BELOW ***************/
if (typeof module !== "undefined") { module.exports = config; }
