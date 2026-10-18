const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  js.configs.recommended,
  {
    files: ["MMM-GameOfLife.js"],
    languageOptions: {
      sourceType: "script",
      globals: {
        ...globals.browser,
        Module: "readonly",
        Log: "readonly",
        p5: "readonly"
      }
    },
    rules: {
      "prefer-const": "error",
      "object-shorthand": "error",
      "strict": ["error", "never"]
    }
  },
  {
    files: ["eslint.config.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: globals.node
    }
  }
];
