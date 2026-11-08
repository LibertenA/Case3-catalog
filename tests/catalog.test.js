const { JSDOM } = require("jsdom");
const fs = require("fs");
const ROOT = require("path").resolve(__dirname, "..") + "/";
let fails = 0;
const t = (name, cond) => { console.log((cond ? "OK   " : "FAIL ") + name); if (!cond) fails++; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const http = require("http"), pathm = require("path");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const server = http.createServer((req, res) => {
  const p = pathm.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  fs.readFile(p, (e, buf) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { "Content-Type": MIME[pathm.extname(p)] || "text/plain" }); res.end(buf); } });
}).listen(8765);
const L = require(ROOT + "js/logic.js");
const catalog = JSON.parse(fs.readFileSync(ROOT + "data/catalog.json", "utf8"));

async function load(page, query, mode) {
  // mode "http": fetch читает JSON; mode "file": fetch отсутствует, работает встроенная копия; mode "http404": fetch даёт 404
  const base = mode === "file" ? "file://" + ROOT + page : "http://localhost:8765/" + page;
  const dom = await JSDOM.fromFile(ROOT + page, {
    runScripts: "dangerously", resources: "usable", pretendToBeVisual: true,
    url: base + (query || ""),
    beforeParse(w) {
      if (mode === "http") w.fetch = async () => ({ ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(catalog)) });
      if (mode === "http404") w.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) });
    }
  });
  await new Promise(r => dom.window.addEventListener("load", r));
  await wait(120);
  return dom;
}
const fire = (w, n, type) => n.dispatchEvent(new w.Event(type, { bubbles: true }));
const cards = d => d.querySelectorAll("#grid .card").length;

(async () => {
  /* ---------- Данные ---------- */
  t("данные: ≥30 товаров", catalog.products.length >= 30);
  t("данные: уникальные id и артикулы", new Set(catalog.products.map(p => p.id)).size === catalog.products.length && new Set(catalog.products.map(p => p.sku)).size === catalog.products.length);
  t("данные: у всех товаров есть категория из списка", catalog.products.every(p => catalog.categories.some(c => c.id === p.category)));
  t("данные: inStock согласован со stock", catalog.products.every(p => p.inStock === (p.stock > 0)));
  t("данные: есть товары и в наличии, и нет", catalog.products.some(p => !p.inStock) && catalog.products.some(p => p.inStock));
  t("embedded = json", eval("(function(){var window={};" + fs.readFileSync(ROOT + "data/catalog.embedded.js", "utf8") + ";return JSON.stringify(window.__CATALOG_DATA__)})()") === JSON.stringify(catalog));

  /* ---------- Логика ---------- */
  const F = L.defaultFilters;
  let f = F(); f.q = "аккумулятор";
  t("поиск «аккумулятор» находит товары", L.applyFilters(catalog.products, f).length >= 5);
  f = F(); f.q = "АККУМУЛЯТОР 4000"; 
  t("поиск регистронезависим, слова через И", L.applyFilters(catalog.products, f).length === 1);
  f = F(); f.q = "vs-bat-007";
  t("поиск по артикулу", L.applyFilters(catalog.products, f).length === 1);
  f = F(); f.q = "ферум";
  t("поиск по бренду", L.applyFilters(catalog.products, f).every(p => p.brand === "Ферум"));
  f = F(); f.cat = "tools"; t("фильтр категории = 6", L.applyFilters(catalog.products, f).length === 6);
  f.brands = ["Ферум"]; t("категория + бренд", L.applyFilters(catalog.products, f).every(p => p.brand === "Ферум" && p.category === "tools"));
  f = F(); f.min = 1000; f.max = 2000;
  t("фильтр цены", L.applyFilters(catalog.products, f).every(p => p.price >= 1000 && p.price <= 2000));
  f = F(); f.min = 5000; f.max = 100;
  t("перевёрнутый диапазон цены игнорируется", L.applyFilters(catalog.products, f).length === 36 && L.priceRangeInvalid(f));
  f = F(); f.stock = true; t("только в наличии", L.applyFilters(catalog.products, f).every(p => p.inStock) && L.applyFilters(catalog.products, f).length === 31);
  const sp = L.sortProducts(catalog.products, "price-asc"); t("сортировка по цене ↑", sp.every((p, i) => i === 0 || sp[i - 1].price <= p.price));
  const sd = L.sortProducts(catalog.products, "price-desc"); t("сортировка по цене ↓", sd.every((p, i) => i === 0 || sd[i - 1].price >= p.price));
  const sr = L.sortProducts(catalog.products, "rating"); t("сортировка по рейтингу", sr.every((p, i) => i === 0 || sr[i - 1].rating >= p.rating));
  const sn = L.sortProducts(catalog.products, "name"); t("сортировка по названию", sn.every((p, i) => i === 0 || sn[i - 1].name.localeCompare(p.name, "ru") <= 0));
  t("форматирование цены", L.formatPrice(4890) === "4\u00A0890\u00A0₽" && L.formatRating(4.8) === "4,8");
  const pf = L.parseFilters("?q=abc&cat=tools&brand=Ферум,Квант&min=100&max=abc&stock=1&sort=hack");
  t("разбор URL: значения", pf.q === "abc" && pf.cat === "tools" && pf.brands.length === 2 && pf.min === 100 && pf.max === null && pf.stock === true);
  t("разбор URL: неверная сортировка → по умолчанию", pf.sort === "default");
  t("buildQuery ↔ parseFilters", JSON.stringify(L.parseFilters("?" + L.buildQuery(pf))) === JSON.stringify(pf));
  const cc = L.facetCounts(catalog.products, F(), "cat"); t("счётчики категорий", Object.values(cc).reduce((a, b) => a + b, 0) === 36);

  /* ---------- Страница каталога (http) ---------- */
  let dom = await load("index.html", "", "http");
  let w = dom.window, d = w.document;
  t("каталог: 36 карточек", cards(d) === 36);
  t("каталог: скелетон скрыт, сетка видна", d.querySelector("#loading").hidden && !d.querySelector("#grid").hidden);
  t("каталог: счётчик «Найдено: 36 из 36»", d.querySelector("#count").textContent === "Найдено: 36 из 36");
  t("фильтры построены: 7 категорий и 5 брендов", d.querySelectorAll("#filter-cat input").length === 7 && d.querySelectorAll("#filter-brand input").length === 5);

  const q = d.querySelector("#q"); q.value = "паяльная"; fire(w, q, "input");
  t("поиск «паяльная» → 1", cards(d) === 1);
  t("чип поиска показан", !d.querySelector("#active").hidden && /Поиск/.test(d.querySelector("#active").textContent));
  t("URL обновился (?q=)", w.location.search.includes("q="));
  q.value = "ничего-такого"; fire(w, q, "input");
  t("пусто: показано состояние empty", !d.querySelector("#empty").hidden && d.querySelector("#grid").hidden && /ничего-такого/.test(d.querySelector("#empty-text").textContent));
  d.querySelector("#empty-reset").click();
  t("сброс: 36 карточек, поле очищено", cards(d) === 36 && d.querySelector("#q").value === "");

  const catTools = d.querySelector('input[name="cat"][value="tools"]'); catTools.checked = true; fire(w, catTools, "change");
  t("категория «Инструменты» → 6", cards(d) === 6);
  const brandF = d.querySelector('input[name="brand"][value="Ферум"]'); brandF.checked = true; fire(w, brandF, "change");
  t("+бренд Ферум → 3", cards(d) === 3);
  const st = d.querySelector("#f-stock"); st.checked = true; fire(w, st, "change");
  t("+в наличии → 2", cards(d) === 2);
  t("кнопка сброса активна", !d.querySelector("#reset").disabled);
  t("счётчик активных фильтров в кнопке", /\(3\)/.test(d.querySelector("#filters-toggle-count").textContent));
  d.querySelector("#reset").click();
  t("сброс всех фильтров", cards(d) === 36 && d.querySelector("#reset").disabled);

  const mn = d.querySelector("#f-min"), mx = d.querySelector("#f-max");
  mn.value = "5000"; fire(w, mn, "input"); mx.value = "100"; fire(w, mx, "input");
  t("ошибка диапазона цены показана", !d.querySelector("#price-error").hidden && mn.getAttribute("aria-invalid") === "true" && cards(d) === 36);
  mn.value = "1000"; mx.value = "1500"; fire(w, mn, "input"); fire(w, mx, "input");
  t("цена 1000–1500 работает", cards(d) > 0 && [...d.querySelectorAll(".card__price")].every(n => { const v = parseInt(n.textContent.replace(/\D/g, "")); return v >= 1000 && v <= 1500; }));
  d.querySelector("#reset").click();

  const sort = d.querySelector("#sort"); sort.value = "price-desc"; fire(w, sort, "change");
  const prices = [...d.querySelectorAll(".card__price")].map(n => parseInt(n.textContent.replace(/\D/g, "")));
  t("сортировка в UI по убыванию цены", prices[0] === 18500 && prices.every((p, i) => i === 0 || prices[i - 1] >= p));

  // чип удаляет фильтр
  d.querySelector("#reset").click();
  catTools.checked = true; fire(w, catTools, "change");
  d.querySelector("#active .chip").click();
  t("чип «×» снимает фильтр", cards(d) === 36);

  // мобильная панель фильтров
  const tg = d.querySelector("#filters-toggle"); tg.click();
  t("панель фильтров раскрывается", tg.getAttribute("aria-expanded") === "true" && d.querySelector("#filters").classList.contains("is-open"));

  // XSS через поиск и URL
  q.value = '<img src=x onerror="window.__xss=1">'; fire(w, q, "input");
  t("XSS в поиске: нет <img> и не выполнено", d.querySelectorAll("#empty img, #active img").length === 0 && !w.__xss);
  dom.window.close();

  // Состояние из URL
  dom = await load("index.html", "?cat=supplies&stock=1&sort=price-asc&brand=Вектор", "http"); w = dom.window; d = w.document;
  const urlPrices = [...d.querySelectorAll(".card__price")].map(n => parseInt(n.textContent.replace(/\D/g, "")));
  t("состояние из URL восстановлено", cards(d) === 4 && urlPrices.every((p, i) => i === 0 || urlPrices[i - 1] <= p) && d.querySelector('input[name="cat"][value="supplies"]').checked);
  dom.window.close();
  dom = await load("index.html", "?cat=несуществует&brand=Фейк&sort=<script>", "http"); w = dom.window; d = w.document;
  t("мусор в URL безопасно сбрасывается", cards(d) === 36);
  dom.window.close();

  // Ошибка загрузки (demo=error) и повтор
  dom = await load("index.html", "?demo=error", "http"); w = dom.window; d = w.document;
  await wait(900);
  t("demo=error: показан блок ошибки", !d.querySelector("#error").hidden && d.querySelector("#grid").hidden && d.querySelector("#loading").hidden);
  t("demo=error: есть кнопка «Повторить»", !!d.querySelector("#retry"));
  dom.window.close();

  // HTTP 404 → ошибка
  dom = await load("index.html", "", "http404"); w = dom.window; d = w.document;
  t("HTTP 404 → ошибка, не пустой экран", !d.querySelector("#error").hidden);
  dom.window.close();

  // Загрузка (demo=slow): скелетон виден
  dom = await load("index.html", "?demo=slow", "http"); w = dom.window; d = w.document;
  t("demo=slow: скелетон виден во время загрузки", !d.querySelector("#loading").hidden && d.querySelector("#grid").hidden);
  await wait(2700);
  t("demo=slow: затем показан каталог", d.querySelector("#loading").hidden && cards(d) === 36);
  dom.window.close();

  // file:// — встроенная копия
  dom = await load("index.html", "", "file"); w = dom.window; d = w.document;
  t("file://: каталог работает без сервера (36)", cards(d) === 36);
  dom.window.close();

  /* ---------- Страница товара ---------- */
  dom = await load("product.html", "?id=25", "http"); w = dom.window; d = w.document;
  t("товар: название", /Паяльная станция/.test(d.querySelector("#p-title").textContent));
  t("товар: цена 11 900 ₽", d.querySelector("#p-price").textContent === "11\u00A0900\u00A0₽");
  t("товар: характеристики 5 строк", d.querySelectorAll("#p-specs tr").length === 5);
  t("товар: похожие (3 из той же категории)", d.querySelectorAll("#related-list .card").length === 3);
  t("товар: title страницы обновлён", /Паяльная станция/.test(d.title));
  t("товар: хлебные крошки с aria-current", !!d.querySelector('#crumbs [aria-current="page"]'));
  dom.window.close();

  dom = await load("product.html", "?id=999", "http"); w = dom.window; d = w.document;
  t("товар: несуществующий id → «Такого товара нет»", !d.querySelector("#notfound").hidden && d.querySelector("#product").hidden);
  dom.window.close();
  dom = await load("product.html", "?id=<script>", "http"); w = dom.window; d = w.document;
  t("товар: мусорный id → «Такого товара нет»", !d.querySelector("#notfound").hidden);
  dom.window.close();
  dom = await load("product.html", "?id=7&demo=error", "http"); w = dom.window; d = w.document; await wait(900);
  t("товар: ошибка загрузки показана", !d.querySelector("#error").hidden);
  dom.window.close();

  // Карточка: товар без наличия
  dom = await load("product.html", "?id=4", "http"); w = dom.window; d = w.document;
  t("товар без наличия: «Нет в наличии»", /Нет в наличии/.test(d.querySelector("#p-meta").textContent));
  dom.window.close();

  /* ---------- Статический аудит HTML ---------- */
  for (const page of ["index.html", "product.html"]) {
    const html = fs.readFileSync(ROOT + page, "utf8");
    t(page + ": lang, viewport, CSP", /<html lang="ru">/.test(html) && /name="viewport"/.test(html) && /Content-Security-Policy/.test(html));
    t(page + ": нет inline-стилей и внешних ресурсов", !/ style=|<style/.test(html) && !/(src|href)="https?:\/\//.test(html));
    t(page + ": у всех input есть label или aria-label", (() => { const dd = new JSDOM(html).window.document; return [...dd.querySelectorAll("input,select")].every(i => i.getAttribute("aria-label") || (i.id && dd.querySelector('label[for="' + i.id + '"]')) || i.closest("label")); })());
  }
  const css = fs.readFileSync(ROOT + "css/style.css", "utf8");
  t("CSS: три диапазона ширины", /min-width: 640px/.test(css) && /min-width: 1024px/.test(css));

  console.log(fails ? `\nПровалено: ${fails}` : "\nВсе проверки пройдены");
  server.close(); process.exit(fails ? 1 : 0);
})();
