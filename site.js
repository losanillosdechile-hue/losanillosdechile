/* =====================================================================
   LOS ANILLOS DE CHILE — MOTOR DEL SITIO
   =====================================================================
   No necesitas editar este archivo. Lee categorias.txt y notas.txt
   (texto plano) y arma el menú, el pie de página, la portada y las
   páginas de cada categoría.
   ===================================================================== */

(function () {
  "use strict";

  var MESES = ["enero","febrero","marzo","abril","mayo","junio","julio",
               "agosto","septiembre","octubre","noviembre","diciembre"];

  var CATEGORIES = [];
  var ARTICLES = [];
  var dataPromise = null;

  function formatDateEs(iso) {
    var parts = iso.split("-").map(Number);
    var d = parts[2], m = parts[1] - 1, y = parts[0];
    return d + " de " + MESES[m] + " de " + y;
  }

  function byDateDesc(a, b) {
    return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
  }

  function getCategory(slug) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].slug === slug) return CATEGORIES[i];
    }
    return null;
  }

  function latestArticleFor(slug) {
    var list = ARTICLES.filter(function (a) { return a.category === slug; })
                        .sort(byDateDesc);
    return list.length ? list[0] : null;
  }

  function portadaArticle() {
    var flagged = ARTICLES.filter(function (a) { return a.portada === true; });
    if (flagged.length) return flagged.sort(byDateDesc)[0];
    return ARTICLES.slice().sort(byDateDesc)[0] || null;
  }

  /* ---------- PARSER: categorias.txt ---------- */
  function parseCategorias(text) {
    return text.split("\n")
      .map(function (l) { return l.trim(); })
      .filter(function (l) { return l && l.charAt(0) !== "#"; })
      .map(function (line) {
        var parts = line.split("|").map(function (p) { return p.trim(); });
        return { slug: parts[0], label: parts[1], color: parts[2], page: parts[3], image: parts[4] || "" };
      })
      .filter(function (c) { return c.slug; });
  }

  /* ---------- TABLA dentro de una nota (líneas que empiezan con |) ---------- */
  function renderTable(raw) {
    var rows = raw.split("\n")
      .map(function (l) { return l.trim(); })
      .filter(Boolean)
      .map(function (line) {
        var cells = line.split("|").map(function (c) { return c.trim(); });
        if (cells.length && cells[0] === "") cells.shift();
        if (cells.length && cells[cells.length - 1] === "") cells.pop();
        return cells;
      });
    if (!rows.length) return "";
    var header = rows[0];
    var body = rows.slice(1);
    var html = '<div class="note-table-wrap"><table class="note-table"><thead><tr>';
    header.forEach(function (h) { html += "<th>" + h + "</th>"; });
    html += "</tr></thead><tbody>";
    body.forEach(function (r) {
      html += "<tr>";
      r.forEach(function (cell) { html += "<td>" + cell + "</td>"; });
      html += "</tr>";
    });
    html += "</tbody></table></div>";
    return html;
  }

  /* ---------- GRÁFICO DE BARRAS dentro de una nota (empieza con "@ ") ---------- */
  function renderChart(raw) {
    var lines = raw.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
    var title = lines[0].slice(2).trim();
    var items = [];
    for (var i = 1; i < lines.length; i++) {
      var parts = lines[i].split("|").map(function (p) { return p.trim(); });
      if (parts.length >= 2) {
        var num = parseFloat(parts[1].replace(",", "."));
        if (!isNaN(num)) items.push({ label: parts[0], value: num, display: parts[1] });
      }
    }
    if (!items.length) return "";
    var max = Math.max.apply(null, items.map(function (it) { return it.value; }));
    var html = '<div class="note-chart">';
    if (title) html += '<p class="note-chart-title">' + title + "</p>";
    items.forEach(function (it) {
      var pct = max > 0 ? Math.max(4, Math.round((it.value / max) * 100)) : 0;
      html += '<div class="note-chart-row">' +
                '<span class="note-chart-label">' + it.label + "</span>" +
                '<span class="note-chart-track"><span class="note-chart-bar" style="width:' + pct + '%"></span></span>' +
                '<span class="note-chart-value">' + it.display + "</span>" +
              "</div>";
    });
    html += "</div>";
    return html;
  }

  /* ---------- PARSER: notas.txt ---------- */
  function parseBody(raw) {
    var chunks = raw.trim().split(/\n\s*\n/).filter(function (c) { return c.trim(); });
    return chunks.map(function (chunk) {
      var c = chunk.trim();
      if (c.indexOf("### ") === 0) {
        return "<h3>" + c.slice(4).trim() + "</h3>";
      }
      if (c.indexOf("> ") === 0) {
        return '<p class="pull-quote">' + c.slice(2).trim().split("\n").join(" ") + "</p>";
      }
      if (c.indexOf("! ") === 0) {
        var rest = c.slice(2).trim();
        var colonIdx = rest.indexOf(":");
        var titulo = "Dato", cuerpo = rest;
        if (colonIdx > -1 && colonIdx < 40) {
          titulo = rest.slice(0, colonIdx).trim();
          cuerpo = rest.slice(colonIdx + 1).trim();
        }
        return '<div class="callout"><h4>' + titulo + "</h4><p>" + cuerpo + "</p></div>";
      }
      if (c.charAt(0) === "|") {
        return renderTable(c);
      }
      if (c.indexOf("@ ") === 0) {
        return renderChart(c);
      }
      return "<p>" + c.split("\n").map(function (l) { return l.trim(); }).join(" ") + "</p>";
    });
  }

  function parseOneNota(block) {
    var lines = block.split("\n");
    var fields = {};
    var bodyStartIdx = -1;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (/^\s*texto\s*:\s*$/i.test(line)) {
        bodyStartIdx = i + 1;
        break;
      }
      var m = line.match(/^\s*([a-zA-Z0-9_áéíóúñÁÉÍÓÚÑ]+)\s*:\s*(.*)$/);
      if (m) {
        fields[m[1].toLowerCase()] = m[2].trim();
      }
    }

    if (!fields.categoria || !fields.titulo) return null;

    var stats = [];
    ["dato1", "dato2", "dato3", "dato4"].forEach(function (key) {
      if (fields[key]) {
        var parts = fields[key].split("|").map(function (p) { return p.trim(); });
        if (parts[0] && parts[1]) stats.push({ num: parts[0], lbl: parts[1] });
      }
    });

    var bodyRaw = bodyStartIdx > -1 ? lines.slice(bodyStartIdx).join("\n") : "";

    return {
      category: fields.categoria,
      date: fields.fecha || "2000-01-01",
      kicker: fields.etiqueta || "",
      title: fields.titulo,
      dek: fields.bajada || "",
      byline: fields.firma || "",
      foto: fields.foto || "",
      portada: /^s[ií]$|^true$/i.test((fields.portada || "").trim()),
      stats: stats,
      body: parseBody(bodyRaw)
    };
  }

  function parseNotas(text) {
    var blocks = text.replace(/\r\n/g, "\n").split(/\n[ \t]*={4,}[ \t]*\n/);
    return blocks.map(function (b) { return b.trim(); })
      .filter(Boolean)
      .map(parseOneNota)
      .filter(Boolean);
  }

  /* ---------- CARGA DE DATOS ---------- */
  var EDICION_NUM = "1";
  var EDICION_PDF = "descargas/los-anillos-de-chile-edicion-0.pdf";

  function loadData() {
    if (dataPromise) return dataPromise;
    dataPromise = Promise.all([
      fetch("categorias.txt").then(function (r) { return r.text(); }),
      fetch("notas.txt").then(function (r) { return r.text(); }),
      fetch("edicion.txt").then(function (r) { return r.text(); }).catch(function () { return "numero: 1"; })
    ]).then(function (results) {
      CATEGORIES = parseCategorias(results[0]);
      ARTICLES = parseNotas(results[1]);
      var m = results[2].match(/numero\s*:\s*(\S+)/i);
      if (m) EDICION_NUM = m[1];
      var mp = results[2].match(/pdf\s*:\s*(\S+)/i);
      if (mp) EDICION_PDF = mp[1];
    }).catch(function (err) {
      console.error("No se pudo cargar categorias.txt / notas.txt:", err);
      showLoadError();
      throw err;
    });
    return dataPromise;
  }

  function showLoadError() {
    var main = document.querySelector(".article-main") || document.querySelector(".grid-section .wrap");
    if (!main) return;
    var div = document.createElement("div");
    div.className = "callout";
    div.style.marginTop = "40px";
    div.innerHTML = "<h4>No se pudo cargar el contenido</h4><p>Si estás abriendo este archivo directamente desde tu computador (doble clic), el navegador bloquea la carga de categorias.txt y notas.txt por seguridad. Súbelo a GitHub Pages (o a cualquier hosting) para verlo funcionando, o usa un servidor local mientras editas.</p>";
    main.prepend(div);
  }

  /* ---------- EDICIÓN (número + fecha automática) ---------- */
  function latestDateOverall() {
    if (!ARTICLES.length) return null;
    return ARTICLES.slice().sort(byDateDesc)[0].date;
  }

  function renderEditionMeta() {
    var latest = latestDateOverall();
    var dateText = latest ? formatDateEs(latest) : "";
    var label = "Edición N.º " + EDICION_NUM;
    var labelWithDate = dateText ? label + " · " + dateText : label;

    var meta = document.getElementById("edition-meta");
    if (meta) meta.textContent = labelWithDate;

    var footer = document.getElementById("edition-footer");
    if (footer) footer.textContent = label;

    var banner = document.getElementById("edition-banner");
    if (banner) banner.textContent = label;

    var eyebrow = document.getElementById("edition-eyebrow");
    if (eyebrow) eyebrow.textContent = label;

    var pdfBtn = document.getElementById("mag-pdf-btn");
    if (pdfBtn) pdfBtn.href = EDICION_PDF;
  }

  /* ---------- NAV (header) ---------- */
  function renderNav(active) {
    var homeLink = document.getElementById("nav-home-link");
    if (homeLink) {
      if (active === "index") homeLink.classList.add("active");
      else homeLink.classList.remove("active");
    }

    var menu = document.getElementById("nav-cats-menu");
    var isCategoryActive = active !== "index";
    if (menu) {
      var html = "";
      CATEGORIES.forEach(function (cat) {
        html += '<li><a href="' + cat.page + '"' + (active === cat.slug ? ' class="active"' : '') + '>' + cat.label + "</a></li>";
      });
      menu.innerHTML = html;
    }

    var toggle = document.getElementById("nav-dropdown-toggle");
    if (toggle) {
      if (isCategoryActive) toggle.classList.add("active");
      else toggle.classList.remove("active");
    }

    var pdfLink = document.getElementById("nav-pdf-link");
    if (pdfLink) pdfLink.href = EDICION_PDF;

    setupDropdown();
  }

  var dropdownWired = false;
  function setupDropdown() {
    if (dropdownWired) return;
    var dropdown = document.getElementById("nav-dropdown");
    var toggle = document.getElementById("nav-dropdown-toggle");
    if (!dropdown || !toggle) return;
    dropdownWired = true;

    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      dropdown.classList.toggle("open");
    });
    document.addEventListener("click", function (e) {
      if (!dropdown.contains(e.target)) dropdown.classList.remove("open");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") dropdown.classList.remove("open");
    });
  }

  /* ---------- FOOTER ---------- */
  function renderFooterSections() {
    var ul = document.getElementById("footer-sections");
    if (!ul) return;
    var html = '<li><a href="' + EDICION_PDF + '" target="_blank" rel="noopener">Revista digital (PDF)</a></li>';
    CATEGORIES.forEach(function (cat) {
      html += '<li><a href="' + cat.page + '">' + cat.label + "</a></li>";
    });
    ul.innerHTML = html;
  }

  /* ---------- ARTICLE HTML ---------- */
  function renderStats(stats) {
    if (!stats || !stats.length) return "";
    var html = '<div class="stat-row">';
    stats.forEach(function (s) {
      html += '<div class="stat"><span class="num">' + s.num + '</span><span class="lbl">' + s.lbl + "</span></div>";
    });
    html += "</div>";
    return html;
  }

  function renderArticle(article) {
    var html = '<article class="feed-item">';
    html += '<p class="feed-date">' + formatDateEs(article.date) + "</p>";
    if (article.kicker) html += '<p class="eyebrow article-kicker">' + article.kicker + "</p>";
    html += '<h2 class="article-title">' + article.title + "</h2>";
    if (article.dek) html += '<p class="article-sub">' + article.dek + "</p>";
    if (article.byline) html += '<p class="byline">' + article.byline + "</p>";
    if (article.foto) {
      html += '<figure class="article-photo"><img src="' + article.foto + '" alt="' + article.title + '" loading="lazy"></figure>';
    }
    html += renderStats(article.stats);
    html += '<div class="article-body">' + article.body.join("\n") + "</div>";
    html += "</article>";
    return html;
  }

  /* ---------- CATEGORY PAGE ---------- */
  var FEED_PAGE_SIZE = 6; // cuántas notas se ven de entrada, y cuántas más se suman por click

  function renderFeedMore(shown, total) {
    if (shown >= total) return "";
    var proximo = Math.min(FEED_PAGE_SIZE, total - shown);
    return '<div class="feed-more">' +
             '<p class="feed-count">Mostrando ' + shown + ' de ' + total + ' notas</p>' +
             '<button type="button" id="feed-load-more" class="btn-load-more">Ver ' + proximo + ' notas más</button>' +
           '</div>';
  }

  function doRenderCategoryPage(slug) {
    var cat = getCategory(slug);
    if (!cat) return;

    var shell = document.querySelector(".article-shell");
    if (shell) shell.style.setProperty("--spine", cat.color);

    var label = document.querySelector(".spine-label");
    if (label) label.textContent = cat.label;

    var banner = document.getElementById("category-banner");
    if (banner && cat.image) banner.style.setProperty("--banner-img", "url('" + cat.image + "')");

    var titleEl = document.getElementById("category-title");
    if (titleEl) titleEl.textContent = cat.label;

    var articles = ARTICLES.filter(function (a) { return a.category === slug; })
                            .sort(byDateDesc);

    var feed = document.getElementById("feed");
    var shownCount = Math.min(FEED_PAGE_SIZE, articles.length);

    function paintFeed() {
      if (!feed) return;
      if (!articles.length) {
        feed.innerHTML = '<p class="category-empty">Todavía no hay notas publicadas en esta categoría.</p>';
        return;
      }
      feed.innerHTML = articles.slice(0, shownCount).map(renderArticle).join("\n") +
                        renderFeedMore(shownCount, articles.length);
      var btn = document.getElementById("feed-load-more");
      if (btn) {
        btn.addEventListener("click", function () {
          shownCount = Math.min(shownCount + FEED_PAGE_SIZE, articles.length);
          paintFeed();
        });
      }
    }
    paintFeed();

    var idx = CATEGORIES.findIndex(function (c) { return c.slug === slug; });
    var next = CATEGORIES[(idx + 1) % CATEGORIES.length];
    var nextEl = document.getElementById("next-category");
    if (nextEl && next) {
      nextEl.href = next.page;
      nextEl.querySelector(".eyebrow").textContent = "Siguiente sección";
      nextEl.querySelector("strong").textContent = next.label;
    }

    renderNav(slug);
    renderFooterSections();
    renderEditionMeta();
  }

  /* ---------- HOME PAGE ---------- */
  function doRenderHomePage() {
    var hero = portadaArticle();
    if (hero) {
      var heroCat = getCategory(hero.category);
      var cover = document.getElementById("cover-section");
      if (cover && heroCat && heroCat.image) cover.style.setProperty("--cover-img", "url('" + heroCat.image + "')");

      var kicker = document.getElementById("cover-kicker");
      if (kicker) kicker.innerHTML = "<strong>" + (heroCat ? heroCat.label : "") + "</strong> · " + formatDateEs(hero.date);

      var titleEl = document.getElementById("cover-title");
      if (titleEl) titleEl.textContent = hero.title;

      var deckEl = document.getElementById("cover-deck");
      if (deckEl) deckEl.textContent = hero.dek;

      var readBtn = document.getElementById("cover-read-btn");
      if (readBtn && heroCat) readBtn.href = heroCat.page;
    }

    var latestEditorial = latestArticleFor("editorial");
    var editorialTitleEl = document.getElementById("cover-editorial-title");
    if (editorialTitleEl && latestEditorial) editorialTitleEl.textContent = latestEditorial.title;

    var grid = document.getElementById("card-grid");
    if (grid) {
      var html = "";
      CATEGORIES.forEach(function (cat) {
        var art = latestArticleFor(cat.slug);
        if (!art) return;
        html += '<a href="' + cat.page + '" class="card" style="--spine:' + cat.color + '">';
        html += '<span class="card-body">';
        html += '<span class="eyebrow">' + cat.label + "</span>";
        html += "<h3>" + art.title + "</h3>";
        html += "<p>" + art.dek + "</p>";
        html += '<span class="go">Ver nota →</span>';
        html += "</span></a>";
      });
      grid.innerHTML = html;
    }

    renderNav("index");
    renderFooterSections();
    renderEditionMeta();
  }

  window.LosAnillos = {
    renderCategoryPage: function (slug) {
      return loadData().then(function () { doRenderCategoryPage(slug); });
    },
    renderHomePage: function () {
      return loadData().then(function () { doRenderHomePage(); });
    }
  };
})();
