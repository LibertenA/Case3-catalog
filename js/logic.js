/*
 * Чистая логика каталога: фильтры, сортировка, разбор адресной строки.
 * Не зависит от DOM, поэтому покрыта автотестами (см. tests/logic.test.js).
 */
(function (root) {
  "use strict";

  var SORTS = ["default", "price-asc", "price-desc", "name", "rating"];

  function normalize(s) {
    return String(s === null || s === undefined ? "" : s).toLowerCase().replace(/ё/g, "е").trim();
  }

  function formatPrice(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0") + "\u00A0₽";
  }

  function formatRating(n) {
    return (Math.round(n * 10) / 10).toFixed(1).replace(".", ",");
  }

  function toPrice(value) {
    if (value === null || value === undefined || value === "") return null;
    var n = Number(String(value).replace(/\s/g, ""));
    if (!isFinite(n) || n < 0) return null;
    return Math.floor(n);
  }

  function defaultFilters() {
    return { q: "", cat: "all", brands: [], min: null, max: null, stock: false, sort: "default" };
  }

  // Разбор адресной строки: ?q=...&cat=...&brand=a,b&min=..&max=..&stock=1&sort=..
  function parseFilters(search) {
    var f = defaultFilters();
    var params = new URLSearchParams(search || "");
    f.q = (params.get("q") || "").slice(0, 60);
    f.cat = params.get("cat") || "all";
    var brand = params.get("brand");
    f.brands = brand ? brand.split(",").map(function (b) { return b.trim(); }).filter(Boolean) : [];
    f.min = toPrice(params.get("min"));
    f.max = toPrice(params.get("max"));
    f.stock = params.get("stock") === "1";
    var sort = params.get("sort");
    f.sort = SORTS.indexOf(sort) === -1 ? "default" : sort;
    return f;
  }

  function buildQuery(f) {
    var p = new URLSearchParams();
    if (f.q.trim()) p.set("q", f.q.trim());
    if (f.cat !== "all") p.set("cat", f.cat);
    if (f.brands.length) p.set("brand", f.brands.join(","));
    if (f.min !== null) p.set("min", String(f.min));
    if (f.max !== null) p.set("max", String(f.max));
    if (f.stock) p.set("stock", "1");
    if (f.sort !== "default") p.set("sort", f.sort);
    return p.toString();
  }

  function priceRangeInvalid(f) {
    return f.min !== null && f.max !== null && f.min > f.max;
  }

  // skip — какой фильтр не учитывать (нужно для счётчиков в фильтрах)
  function matches(p, f, skip) {
    var words = normalize(f.q).split(/\s+/).filter(Boolean);
    if (skip !== "q" && words.length) {
      var hay = normalize([p.name, p.sku, p.brand].join(" "));
      for (var i = 0; i < words.length; i++) if (hay.indexOf(words[i]) === -1) return false;
    }
    if (skip !== "cat" && f.cat !== "all" && p.category !== f.cat) return false;
    if (skip !== "brand" && f.brands.length && f.brands.indexOf(p.brand) === -1) return false;
    if (skip !== "price" && !priceRangeInvalid(f)) {
      if (f.min !== null && p.price < f.min) return false;
      if (f.max !== null && p.price > f.max) return false;
    }
    if (skip !== "stock" && f.stock && !p.inStock) return false;
    return true;
  }

  function applyFilters(products, f) {
    return products.filter(function (p) { return matches(p, f); });
  }

  function sortProducts(list, sort) {
    var copy = list.slice();
    var cmp = {
      "default": function (a, b) { return a.id - b.id; },
      "price-asc": function (a, b) { return a.price - b.price || a.id - b.id; },
      "price-desc": function (a, b) { return b.price - a.price || a.id - b.id; },
      "name": function (a, b) { return a.name.localeCompare(b.name, "ru") || a.id - b.id; },
      "rating": function (a, b) { return b.rating - a.rating || a.id - b.id; }
    }[sort] || function (a, b) { return a.id - b.id; };
    return copy.sort(cmp);
  }

  // Счётчики для боковых фильтров: считаем при всех фильтрах, кроме своего.
  function facetCounts(products, f, key) {
    var counts = {};
    products.forEach(function (p) {
      if (!matches(p, f, key)) return;
      var value = key === "cat" ? p.category : p.brand;
      counts[value] = (counts[value] || 0) + 1;
    });
    return counts;
  }

  function priceBounds(products) {
    var prices = products.map(function (p) { return p.price; });
    return { min: Math.min.apply(null, prices), max: Math.max.apply(null, prices) };
  }

  function hasActiveFilters(f) {
    return Boolean(f.q.trim()) || f.cat !== "all" || f.brands.length > 0 || f.min !== null || f.max !== null || f.stock;
  }

  var api = {
    SORTS: SORTS, normalize: normalize, formatPrice: formatPrice, formatRating: formatRating,
    toPrice: toPrice, defaultFilters: defaultFilters, parseFilters: parseFilters, buildQuery: buildQuery,
    priceRangeInvalid: priceRangeInvalid, applyFilters: applyFilters, sortProducts: sortProducts,
    facetCounts: facetCounts, priceBounds: priceBounds, hasActiveFilters: hasActiveFilters
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Logic = api;
})(typeof window !== "undefined" ? window : globalThis);
