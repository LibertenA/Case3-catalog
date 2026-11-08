/*
 * Мини-помощники для работы с DOM. Весь текст вставляется через textContent,
 * поэтому HTML из данных или из адресной строки не исполняется (защита от XSS).
 */
(function (root) {
  "use strict";

  function el(tag, props, children) {
    var node = document.createElement(tag);
    var key;
    props = props || {};
    for (key in props) {
      if (key === "text") node.textContent = props[key];
      else if (key === "class") node.className = props[key];
      else if (props[key] !== null && props[key] !== undefined) node.setAttribute(key, props[key]);
    }
    (children || []).forEach(function (child) {
      if (child === null || child === undefined) return;
      node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    });
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function $(selector, scope) { return (scope || document).querySelector(selector); }
  function $$(selector, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(selector)); }

  root.Dom = { el: el, clear: clear, $: $, $$: $$ };
})(window);
