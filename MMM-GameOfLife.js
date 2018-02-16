"use strict";

Module.register("MMM-GameOfLife", {

  // Default module config.
  defaults: {
    text: "Hello World!"
  },


  getDom: function() {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = this.config.text;
    return wrapper;
  }
});