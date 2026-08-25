/* =====================================================================
   LOS ANILLOS DE CHILE — PUBLICADOR AUTOMÁTICO EN INSTAGRAM
   =====================================================================
   No necesitas editar este archivo. Corre solo, disparado por el
   workflow de GitHub Actions, cada vez que cambia notas.txt.

   Qué hace:
   1. Lee notas.txt y categorias.txt (los mismos archivos del sitio).
   2. Compara con instagram-posted.json para saber qué notas ya se
      publicaron antes.
   3. Por cada nota nueva, publica en Instagram usando la foto fija
      de esa categoría + el título y la bajada como texto.
   4. Actualiza instagram-posted.json para no repetir la publicación.
   ===================================================================== */

const fs = require("fs");
const path = require("path");

const SITE_BASE = "https://losanillosdechile-hue.github.io/losanillosdechile";
const ROOT = path.join(__dirname, "..");
const POSTED_LOG = path.join(ROOT, "instagram-posted.json");
const GRAPH_VERSION = "v19.0";

/* ---------- PARSER: categorias.txt (igual que site.js) ---------- */
function parseCategorias(text) {
  return text.split("\n")
    .map((l) => l.trim())
    .filter((l) => l && l.charAt(0) !== "#")
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      return { slug: parts[0], label: parts[1], color: parts[2], page: parts[3], image: parts[4] || "" };
    })
    .filter((c) => c.slug);
}

/* ---------- PARSER: notas.txt (igual que site.js, versión simplificada) ---------- */
function parseOneNota(block) {
  const lines = block.split("\n");
  const fields = {};
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*texto\s*:\s*$/i.test(line)) break;
    const m = line.match(/^\s*([a-zA-Z0-9_áéíóúñÁÉÍÓÚÑ]+)\s*:\s*(.*)$/);
    if (m) fields[m[1].toLowerCase()] = m[2].trim();
  }
  if (!fields.categoria || !fields.titulo) return null;
  return {
    category: fields.categoria,
    date: fields.fecha || "2000-01-01",
    title: fields.titulo,
    dek: fields.bajada || "",
    portada: /^s[ií]$|^true$/i.test((fields.portada || "").trim()),
  };
}

function parseNotas(text) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n[ \t]*={4,}[ \t]*\n/);
  return blocks.map((b) => b.trim()).filter(Boolean).map(parseOneNota).filter(Boolean);
}

function makeId(article) {
  return `${article.category}|${article.date}|${article.title}`;
}

function loadPostedLog() {
  if (!fs.existsSync(POSTED_LOG)) return [];
  try {
    return JSON.parse(fs.readFileSync(POSTED_LOG, "utf8"));
  } catch (e) {
    console.error("No se pudo leer instagram-posted.json, se asume vacío:", e.message);
    return [];
  }
}

function buildCaption(article, cat) {
  const pageUrl = `${SITE_BASE}/${cat.page}`;
  const lines = [
    article.title,
    "",
    article.dek,
    "",
    `Lee la nota completa en losanillosdechile-hue.github.io/losanillosdechile/${cat.page}`,
    "",
    `#${cat.slug.replace(/[^a-z0-9]/gi, "")} #LosAnillosDeChile #DeportePolideportivo #DeporteChileno`,
  ];
  return lines.join("\n");
}

async function publishToInstagram(article, cat, igUserId, accessToken) {
  const imageUrl = `${SITE_BASE}/${cat.image.split("?")[0]}?v=${Date.now()}`;
  const caption = buildCaption(article, cat);

  const createRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: accessToken }),
  });
  const createData = await createRes.json();
  if (!createData.id) {
    throw new Error("Error creando el contenedor de Instagram: " + JSON.stringify(createData));
  }

  const publishRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: createData.id, access_token: accessToken }),
  });
  const publishData = await publishRes.json();
  if (!publishData.id) {
    throw new Error("Error publicando en Instagram: " + JSON.stringify(publishData));
  }
  return publishData.id;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const igUserId = process.env.IG_USER_ID;
  const accessToken = process.env.IG_ACCESS_TOKEN;
  if (!igUserId || !accessToken) {
    console.error("Faltan las variables IG_USER_ID y/o IG_ACCESS_TOKEN. No se publicó nada.");
    process.exit(1);
  }

  const notasText = fs.readFileSync(path.join(ROOT, "notas.txt"), "utf8");
  const categoriasText = fs.readFileSync(path.join(ROOT, "categorias.txt"), "utf8");
  const categorias = parseCategorias(categoriasText);
  const articles = parseNotas(notasText);
  const posted = loadPostedLog();

  const pending = articles
    .filter((a) => !posted.includes(makeId(a)))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  if (pending.length === 0) {
    console.log("No hay notas nuevas para publicar en Instagram.");
    return;
  }

  console.log(`Notas nuevas encontradas: ${pending.length}`);

  for (const article of pending) {
    const cat = categorias.find((c) => c.slug === article.category);
    if (!cat) {
      console.log(`⚠️  Categoría desconocida "${article.category}", se omite: ${article.title}`);
      continue;
    }
    if (!cat.image) {
      console.log(`⚠️  La categoría "${cat.label}" no tiene foto fija todavía, se omite: ${article.title}`);
      continue;
    }

    console.log(`Publicando: [${cat.label}] ${article.title}`);
    try {
      const postId = await publishToInstagram(article, cat, igUserId, accessToken);
      console.log(`✅ Publicado (id: ${postId})`);
      posted.push(makeId(article));
      fs.writeFileSync(POSTED_LOG, JSON.stringify(posted, null, 2) + "\n");
    } catch (err) {
      console.error(`❌ No se pudo publicar "${article.title}":`, err.message);
    }

    // pequeña pausa entre publicaciones, por si hay varias notas nuevas a la vez
    await sleep(4000);
  }
}

main().catch((err) => {
  console.error("Error inesperado:", err);
  process.exit(1);
});
