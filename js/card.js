/* Карточка товара — общая для каталога и блока «Похожие товары». */
(function (root) {
  "use strict";
  var el = root.Dom.el;
  var L = root.Logic;

  function availability(p) {
    return p.inStock
      ? el("span", { class: "stock stock--in", text: "В наличии, " + p.stock + " шт." })
      : el("span", { class: "stock stock--out", text: "Нет в наличии" });
  }

  function rating(p) {
    return el("span", { class: "rating", "aria-label": "Рейтинг " + L.formatRating(p.rating) + " из 5", text: "★ " + L.formatRating(p.rating) });
  }

  function build(p, categoryName) {
    var href = "product.html?id=" + encodeURIComponent(p.id);
    var media = el("div", { class: "card__media cat-" + p.category }, [root.Icons.get(p.category)]);
    if (p.badge) media.appendChild(el("span", { class: "badge", text: p.badge }));

    var title = el("h3", { class: "card__title" }, [el("a", { class: "card__link", href: href, text: p.name })]);

    return el("li", { class: "card" }, [
      media,
      el("div", { class: "card__body" }, [
        el("p", { class: "card__brand", text: p.brand + (categoryName ? ", " + categoryName : "") }),
        title,
        el("p", { class: "card__summary", text: p.summary }),
        el("p", { class: "card__meta" }, [rating(p), availability(p)]),
        el("p", { class: "card__price", text: L.formatPrice(p.price) })
      ])
    ]);
  }

  root.Card = { build: build, availability: availability, rating: rating };
})(window);
