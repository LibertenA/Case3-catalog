/* Страница товара: загрузка по ?id=, характеристики, похожие товары, состояния loading / not found / error. */
(function () {
  "use strict";

  var el = Dom.el, clear = Dom.clear, $ = Dom.$;
  var L = Logic;

  function show(which) {
    ["loading", "error", "notfound", "product"].forEach(function (id) {
      var node = $("#" + id);
      if (node) node.hidden = id !== which;
    });
  }

  function parseId() {
    var raw = new URLSearchParams(window.location.search).get("id");
    return /^\d{1,6}$/.test(raw || "") ? Number(raw) : null;
  }

  function catalogHref() {
    var qs = "";
    try { qs = window.sessionStorage.getItem("catalogQuery") || ""; } catch (e) { /* недоступно */ }
    return "index.html" + (qs ? "?" + qs : "");
  }

  function render(data, p) {
    var cat = data.categories.filter(function (c) { return c.id === p.category; })[0];
    var catName = cat ? cat.name : "";

    document.title = p.name + " — Вектор-Сервис";

    // Хлебные крошки
    var crumbs = $("#crumbs");
    clear(crumbs);
    crumbs.appendChild(el("li", {}, [el("a", { id: "back", href: catalogHref(), text: "Каталог" })]));
    crumbs.appendChild(el("li", {}, [el("a", { href: "index.html?cat=" + encodeURIComponent(p.category), text: catName })]));
    crumbs.appendChild(el("li", { "aria-current": "page", text: p.name }));

    // Основной блок
    var media = $("#p-media");
    clear(media);
    media.className = "product__media cat-" + p.category;
    media.appendChild(Icons.get(p.category));
    if (p.badge) media.appendChild(el("span", { class: "badge", text: p.badge }));

    $("#p-title").textContent = p.name;
    $("#p-sku").textContent = "Артикул: " + p.sku + ". Бренд: " + p.brand + ".";
    var meta = $("#p-meta");
    clear(meta);
    meta.appendChild(Card.rating(p));
    meta.appendChild(Card.availability(p));
    $("#p-price").textContent = L.formatPrice(p.price);
    $("#p-warranty").textContent = "Гарантия: " + p.warrantyMonths + " " + (p.warrantyMonths === 1 ? "месяц" : (p.warrantyMonths < 5 ? "месяца" : "месяцев")) + ".";
    $("#p-desc").textContent = p.description;

    var specs = $("#p-specs");
    clear(specs);
    p.specs.forEach(function (s) {
      specs.appendChild(el("tr", {}, [el("th", { scope: "row", text: s.label }), el("td", { text: s.value })]));
    });

    // Похожие товары
    var related = data.products.filter(function (x) { return x.category === p.category && x.id !== p.id; })
      .sort(function (a, b) { return Math.abs(a.price - p.price) - Math.abs(b.price - p.price); }).slice(0, 3);
    var box = $("#related-list");
    clear(box);
    related.forEach(function (x) { box.appendChild(Card.build(x, catName)); });
    $("#related").hidden = related.length === 0;

    show("product");
  }

  function load() {
    show("loading");
    var id = parseId();
    Api.getCatalog().then(function (data) {
      var p = id === null ? null : data.products.filter(function (x) { return x.id === id; })[0];
      if (!p) {
        document.title = "Товар не найден — Вектор-Сервис";
        $("#notfound-back").setAttribute("href", catalogHref());
        show("notfound");
        return;
      }
      render(data, p);
    }, function (err) {
      show("error");
      if (window.console) console.error(err);
    });
  }

  document.documentElement.classList.add("js");
  $("#retry").addEventListener("click", load);
  load();
})();
