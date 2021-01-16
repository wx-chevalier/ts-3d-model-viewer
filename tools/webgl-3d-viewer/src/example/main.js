// Bootstrapping for example

require("intro.js/minified/introjs.min.css");
require("gfr-css-bem/dist/gh-fork-ribbon-bem.min.css");

import { introJs } from "intro.js/minified/intro.min.js";

window.ModelViewer = require("./../viewer");

window.introJs = introJs;

$(() => {
  if (localStorage && localStorage.getItem("disableTooltip") !== "true") {
    setTimeout(() => {
      $(".close-button").attr(
        "data-intro",
        "Click here to modify viewer settings"
      );
      const opts = {
        tooltipPosition: "bottom-left",
        showBullets: false,
        showStepNumbers: false,
        disableInteraction: true,
      };

      let intro = introJs();
      let keys = Object.keys(opts);
      for (let key in keys) {
        if (key) {
          intro = intro.setOption(keys[key], opts[keys[key]]);
        }
      }

      intro.start();

      localStorage.setItem("disableTooltip", true);
    }, 1500);
  }
});
