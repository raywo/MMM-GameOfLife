const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  {
    ignores: ["dev/magicmirror/basepath.js"]
  },
  js.configs.recommended,
  {
    files: ["MMM-GameOfLife.js", "game-of-life.js"],
    languageOptions: {
      sourceType: "script"
    },
    rules: {
      "prefer-const": "error",
      "object-shorthand": "error",
      "strict": ["error", "never"]
    }
  },
  {
    files: ["MMM-GameOfLife.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
        Module: "readonly",
        Log: "readonly",
        p5: "readonly",
        GameOfLife: "readonly"
      }
    }
  },
  {
    files: ["game-of-life.js"],
    languageOptions: {
      globals: {
        module: "readonly"
      }
    }
  },
  {
    files: ["test/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: globals.node
    }
  },
  {
    files: ["dev/magicmirror/config*.js"],
    languageOptions: {
      sourceType: "script",
      globals: {
        module: "readonly"
      }
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
