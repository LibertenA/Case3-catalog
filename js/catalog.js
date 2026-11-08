/*
 * Страница каталога: поиск, фильтры, сортировка, состояния loading / empty / error.
 * Состояние фильтров хранится в адресной строке, поэтому ссылкой можно поделиться.
 */
(function () {
  "use strict";

  var el = Dom.el, clear = Dom.clear, $ = Dom.$, $$ = Dom.$$;
  var L = Logic;

  var data = null;
  var catNames = {};
  var f = L.parseFilters(window.location.search);

  /* ---------- Состояния страницы ---------- */
  function show(which) {
    ["loading", "error", "empty", "grid"].forEach(function (id) {
      var node = $("#" + id);
      if (node) node.hidden = id !== which;
    });
  }

  function showError(err) {
    show("error");
    $("#error-text").textContent = window.location.protocol === "file:"
      ? "Не удалось загрузить данные. Откройте сайт через локальный сервер (см. README) или опубликуйте его."
      : "Не удалось загрузить каталог. Проверьте подключение к интернету и повторите попытку.";
    $("#count").textContent = "Каталог недоступен.";
    if (window.console && err) console.error(err);
  }

  function load() {
    show("loading");
    $("#count").textContent = "Загружаем каталог…";
    Api.getCatalog().then(init, showError);
  }

  /* ---------- Построение фильтров ---------- */
  function countSpan(id) { return el("span", { class: "opt__count", "data-count": id, text: "0" }); }

  function radio(name, value, label, checked) {
    var input = el("input", { type: "radio", name: name, value: value });
    input.checked = checked;
    return el("li", {}, [el("label", { class: "opt" }, [input, el("span", { class: "opt__label", text: label }), countSpan(value)])]);
  }

  function checkbox(value, label, checked) {
    var input = el("input", { type: "checkbox", name: "brand", value: value });
    input.checked = checked;
    return el("li", {}, [el("label", { class: "opt" }, [input, el("span", { class: "opt__label", text: label }), countSpan(value)])]);
  }

  function buildFilters() {
    var cats = $("#filter-cat");
    clear(cats);
    cats.appendChild(radio("cat", "all", "Все категории", f.cat === "all"));
    data.categories.forEach(function (c) { cats.appendChild(radio("cat", c.id, c.name, f.cat === c.id)); });

    var brands = {};
    data.products.forEach(function (p) { brands[p.brand] = true; });
    var list = $("#filter-brand");
    clear(list);
    Object.keys(brands).sort(function (a, b) { return a.localeCompare(b, "ru"); }).forEach(function (b) {
      list.appendChild(checkbox(b, b, f.brands.indexOf(b) !== -1));
    });

    var bounds = L.priceBounds(data.products);
    $("#f-min").setAttribute("placeholder", "от " + bounds.min);
    $("#f-max").setAttribute("placeholder", "до " + bounds.max);
    $("#f-min").value = f.min === null ? "" : f.min;
    $("#f-max").value = f.max === null ? "" : f.max;
    $("#f-stock").checked = f.stock;
    $("#sort").value = f.sort;
    $("#q").value = f.q;
  }

  // Если в адресной строке указана несуществующая категория или бренд — молча сбрасываем.
  function sanitizeFilters() {
    if (f.cat !== "all" && !catNames[f.cat]) f.cat = "all";
    var known = {};
    data.products.forEach(function (p) { known[p.brand] = true; });
    f.brands = f.brands.filter(function (b) { return known[b]; });
  }

  /* ---------- Отрисовка результата ---------- */
  function updateCounts() {
    var byCat = L.facetCounts(data.products, f, "cat");
    var allInCat = Object.keys(byCat).reduce(function (s, k) { return s + byCat[k]; }, 0);
    var byBrand = L.facetCounts(data.products, f, "brand");
    $$("[data-count]").forEach(function (node) {
      var id = node.getAttribute("data-count");
      var isCat = node.closest("#filter-cat");
      var n = isCat ? (id === "all" ? allInCat : (byCat[id] || 0)) : (byBrand[id] || 0);
      node.textContent = String(n);
      node.parentNode.classList.toggle("opt--zero", n === 0);
    });
  }

  function chip(text, onRemove) {
    var btn = el("button", { class: "chip", type: "button", "aria-label": "Убрать фильтр: " + text }, [text, el("span", { class: "chip__x", "aria-hidden": "true", text: "×" })]);
    btn.addEventListener("click", onRemove);
    return el("li", {}, [btn]);
  }

  function renderChips() {
    var box = $("#active");
    clear(box);
    if (f.q.trim()) box.appendChild(chip("Поиск: " + f.q.trim(), function () { f.q = ""; $("#q").value = ""; render(); }));
    if (f.cat !== "all") box.appendChild(chip(catNames[f.cat], function () { f.cat = "all"; syncInputs(); render(); }));
    f.brands.forEach(function (b) {
      box.appendChild(chip(b, function () { f.brands = f.brands.filter(function (x) { return x !== b; }); syncInputs(); render(); }));
    });
    if ((f.min !== null || f.max !== null) && !L.priceRangeInvalid(f)) {
      var txt = "Цена" + (f.min !== null ? " от " + L.formatPrice(f.min) : "") + (f.max !== null ? " до " + L.formatPrice(f.max) : "");
      box.appendChild(chip(txt, function () { f.min = null; f.max = null; syncInputs(); render(); }));
    }
    if (f.stock) box.appendChild(chip("Только в наличии", function () { f.stock = false; syncInputs(); render(); }));
    box.hidden = box.children.length === 0;
  }

  function syncInputs() {
    $$('input[name="cat"]').forEach(function (i) { i.checked = i.value === f.cat; });
    $$('input[name="brand"]').forEach(function (i) { i.checked = f.brands.indexOf(i.value) !== -1; });
    $("#f-min").value = f.min === null ? "" : f.min;
    $("#f-max").value = f.max === null ? "" : f.max;
    $("#f-stock").checked = f.stock;
  }

  function persist() {
    var qs = L.buildQuery(f);
    var demo = /(?:^|[?&])demo=(slow|error)/.exec(window.location.search);
    var full = [qs, demo ? "demo=" + demo[1] : ""].filter(Boolean).join("&");
    try { window.history.replaceState(null, "", window.location.pathname + (full ? "?" + full : "")); } catch (e) { /* file:// в некоторых браузерах */ }
    try { window.sessionStorage.setItem("catalogQuery", qs); } catch (e) { /* хранилище недоступно */ }
  }

  function render() {
    var total = data.products.length;
    var list = L.sortProducts(L.applyFilters(data.products, f), f.sort);

    var grid = $("#grid");
    clear(grid);
    list.forEach(function (p) { grid.appendChild(Card.build(p, catNames[p.category])); });

    $("#count").textContent = "Найдено: " + list.length + " из " + total;
    updateCounts();
    renderChips();

    var invalid = L.priceRangeInvalid(f);
    $("#price-error").hidden = !invalid;
    $("#f-min").setAttribute("aria-invalid", String(invalid));
    $("#f-max").setAttribute("aria-invalid", String(invalid));

    var active = [f.cat !== "all", f.brands.length > 0, f.min !== null || f.max !== null, f.stock].filter(Boolean).length;
    $("#filters-toggle-count").textContent = active ? " (" + active + ")" : "";

    $("#reset").disabled = !L.hasActiveFilters(f);

    if (list.length === 0) {
      show("empty");
      var hint = f.q.trim() ? "По запросу «" + f.q.trim() + "» и выбранным фильтрам ничего нет." : "С выбранными фильтрами ничего нет.";
      $("#empty-text").textContent = hint + " Смягчите условия или сбросьте фильтры.";
    } else {
      show("grid");
    }
    persist();
  }

  /* ---------- Инициализация ---------- */
  function init(catalog) {
    data = catalog;
    catNames = {};
    data.categories.forEach(function (c) { catNames[c.id] = c.name; });
    sanitizeFilters();
    buildFilters();
    bind();
    render();
  }

  var bound = false;
  function bind() {
    if (bound) return;
    bound = true;

    $("#search-form").addEventListener("submit", function (e) { e.preventDefault(); f.q = $("#q").value.slice(0, 60); render(); });
    $("#q").addEventListener("input", function () { f.q = $("#q").value.slice(0, 60); render(); });

    $("#filter-cat").addEventListener("change", function (e) { f.cat = e.target.value; render(); });
    $("#filter-brand").addEventListener("change", function () {
      f.brands = $$('input[name="brand"]:checked').map(function (i) { return i.value; });
      render();
    });
    function onPrice() { f.min = L.toPrice($("#f-min").value); f.max = L.toPrice($("#f-max").value); render(); }
    $("#f-min").addEventListener("input", onPrice);
    $("#f-max").addEventListener("input", onPrice);
    $("#f-stock").addEventListener("change", function () { f.stock = $("#f-stock").checked; render(); });
    $("#sort").addEventListener("change", function () { f.sort = $("#sort").value; render(); });

    function reset() {
      f = L.defaultFilters();
      $("#q").value = "";
      $("#sort").value = "default";
      syncInputs();
      render();
    }
    $("#reset").addEventListener("click", reset);
    $("#empty-reset").addEventListener("click", reset);

    var toggle = $("#filters-toggle");
    var panel = $("#filters");
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open));
      panel.classList.toggle("is-open", open);
    });
  }

  document.documentElement.classList.add("js");
  $("#retry").addEventListener("click", load);
  load();
})();
