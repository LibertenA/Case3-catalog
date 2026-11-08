/* Простые SVG-иконки категорий. Своя графика, без сторонних изображений и лицензий. */
(function (root) {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";

  var SHAPES = {
    displays: [["rect", { x: 28, y: 10, width: 40, height: 76, rx: 7 }], ["line", { x1: 42, y1: 17, x2: 54, y2: 17 }], ["rect", { x: 34, y: 25, width: 28, height: 50, rx: 2 }]],
    batteries: [["rect", { x: 14, y: 30, width: 62, height: 36, rx: 6 }], ["rect", { x: 76, y: 41, width: 8, height: 14, rx: 2 }], ["polygon", { points: "50,36 38,50 47,50 43,60 58,45 49,45" }]],
    connectors: [["rect", { x: 26, y: 38, width: 44, height: 34, rx: 6 }], ["line", { x1: 38, y1: 38, x2: 38, y2: 22 }], ["line", { x1: 58, y1: 38, x2: 58, y2: 22 }], ["line", { x1: 48, y1: 72, x2: 48, y2: 86 }]],
    components: [["rect", { x: 28, y: 28, width: 40, height: 40, rx: 4 }], ["line", { x1: 36, y1: 28, x2: 36, y2: 16 }], ["line", { x1: 48, y1: 28, x2: 48, y2: 16 }], ["line", { x1: 60, y1: 28, x2: 60, y2: 16 }], ["line", { x1: 36, y1: 68, x2: 36, y2: 80 }], ["line", { x1: 48, y1: 68, x2: 48, y2: 80 }], ["line", { x1: 60, y1: 68, x2: 60, y2: 80 }], ["circle", { cx: 38, cy: 38, r: 3 }]],
    tools: [["rect", { x: 14, y: 52, width: 30, height: 18, rx: 8, transform: "rotate(-35 29 61)" }], ["line", { x1: 40, y1: 48, x2: 76, y2: 22 }], ["line", { x1: 76, y1: 22, x2: 82, y2: 14 }]],
    supplies: [["rect", { x: 30, y: 36, width: 36, height: 48, rx: 8 }], ["rect", { x: 40, y: 22, width: 16, height: 14, rx: 3 }], ["line", { x1: 44, y1: 12, x2: 52, y2: 12 }], ["line", { x1: 30, y1: 56, x2: 66, y2: 56 }]]
  };

  function icon(categoryId) {
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 96 96");
    svg.setAttribute("class", "icon icon--" + categoryId);
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    (SHAPES[categoryId] || SHAPES.components).forEach(function (shape) {
      var node = document.createElementNS(NS, shape[0]);
      Object.keys(shape[1]).forEach(function (k) { node.setAttribute(k, shape[1][k]); });
      svg.appendChild(node);
    });
    return svg;
  }

  root.Icons = { get: icon };
})(window);
