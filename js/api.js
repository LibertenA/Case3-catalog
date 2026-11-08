/*
 * Слой данных. Источник — локальный JSON (data/catalog.json), загружаемый через fetch.
 * Это имитация REST-запроса GET /catalog: страницы работают так же, как работали бы с сервером.
 *
 * Для демонстрации состояний на защите:
 *   ?demo=slow   — загрузка идёт 2,5 секунды (виден скелетон)
 *   ?demo=error  — запрос завершается ошибкой (видно сообщение и кнопка «Повторить»)
 */
(function (root) {
  "use strict";

  var URL_JSON = "data/catalog.json";
  var TIMEOUT_MS = 8000;
  var cache = null;

  function demoMode() {
    var m = /(?:^|[?&])demo=(slow|error)(?:&|$)/.exec(root.location.search);
    return m ? m[1] : "";
  }

  function wait(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }

  function validate(data) {
    var ok = data && Array.isArray(data.products) && Array.isArray(data.categories) && data.products.length > 0;
    if (!ok) throw new Error("Некорректный формат данных каталога");
    data.products.forEach(function (p) {
      if (typeof p.id !== "number" || typeof p.name !== "string" || typeof p.price !== "number") {
        throw new Error("Некорректная запись товара");
      }
    });
    return data;
  }

  function fetchJson() {
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, TIMEOUT_MS) : null;
    return fetch(URL_JSON, { cache: "no-cache", signal: controller ? controller.signal : undefined })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) { if (timer) clearTimeout(timer); return data; },
            function (err) { if (timer) clearTimeout(timer); throw err; });
  }

  function getCatalog() {
    var demo = demoMode();
    if (demo === "error") return wait(700).then(function () { throw new Error("Демонстрационная ошибка сети"); });
    var delay = demo === "slow" ? wait(2500) : Promise.resolve();
    if (cache) return delay.then(function () { return cache; });

    return delay.then(fetchJson).catch(function (err) {
      // При запуске двойным кликом (file://) fetch заблокирован браузером — берём встроенную копию тех же данных.
      if (root.location.protocol === "file:" && root.__CATALOG_DATA__) return root.__CATALOG_DATA__;
      throw err;
    }).then(function (data) {
      cache = validate(data);
      return cache;
    });
  }

  root.Api = { getCatalog: getCatalog };
})(window);
