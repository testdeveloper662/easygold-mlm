const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const swaggerUiDist = require("swagger-ui-dist");

// swagger-ui-express's HTML template hardcodes exactly these 3 files as
// <script>/<link> tags. They're large (swagger-ui-bundle.js alone is ~1.6MB)
// and never change for a given swagger-ui-dist version, but the app's global
// compression() middleware was re-compressing them from scratch on every
// single request. That on-the-fly compression — not network transfer — was
// the real multi-second delay: a plain uncompressed request measured ~2.8s
// against this file, while on-the-fly gzip of the exact same bytes measured
// ~17s under real server load. Compressing each file exactly once at startup
// and serving the cached result removes that cost for every visitor,
// including the very first one on a brand-new browser after a deploy.
const ASSET_DIR = swaggerUiDist.getAbsoluteFSPath();
const PRECOMPRESSED_FILES = ["swagger-ui-bundle.js", "swagger-ui-standalone-preset.js", "swagger-ui.css"];

const cache = new Map();

const buildEntry = (filename) => {
  const filePath = path.join(ASSET_DIR, filename);
  const raw = fs.readFileSync(filePath);
  const stat = fs.statSync(filePath);
  const entry = {
    raw,
    br: zlib.brotliCompressSync(raw, {
      params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
    }),
    gzip: zlib.gzipSync(raw, { level: 9 }),
    contentType: filename.endsWith(".css") ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8",
    etag: `"${stat.size}-${Math.round(stat.mtimeMs)}"`,
    lastModified: stat.mtime.toUTCString(),
  };
  cache.set(filename, entry);
  return entry;
};

// Called once at server startup so the cache is already warm before the
// first real visitor ever arrives — nobody pays the one-time compression cost.
const warmPrecompressedSwaggerAssets = () => {
  for (const filename of PRECOMPRESSED_FILES) {
    try {
      buildEntry(filename);
    } catch (error) {
      console.error(`[precompressedSwaggerAssets] Failed to warm ${filename}:`, error.message);
    }
  }
};

const servePrecompressedSwaggerAssets = (req, res, next) => {
  const filename = path.basename(req.path);
  if (!PRECOMPRESSED_FILES.includes(filename)) {
    return next();
  }

  let entry;
  try {
    entry = cache.get(filename) || buildEntry(filename);
  } catch (error) {
    console.error(`[precompressedSwaggerAssets] Failed to serve ${filename}:`, error.message);
    return next();
  }

  if (req.headers["if-none-match"] === entry.etag) {
    res.setHeader("ETag", entry.etag);
    return res.status(304).end();
  }

  res.setHeader("Content-Type", entry.contentType);
  res.setHeader("ETag", entry.etag);
  res.setHeader("Last-Modified", entry.lastModified);
  res.setHeader("Vary", "Accept-Encoding");

  const acceptEncoding = req.headers["accept-encoding"] || "";
  let body = entry.raw;
  if (/\bbr\b/.test(acceptEncoding)) {
    res.setHeader("Content-Encoding", "br");
    body = entry.br;
  } else if (/\bgzip\b/.test(acceptEncoding)) {
    res.setHeader("Content-Encoding", "gzip");
    body = entry.gzip;
  }

  res.setHeader("Content-Length", body.length);
  return res.end(body);
};

module.exports = { servePrecompressedSwaggerAssets, warmPrecompressedSwaggerAssets };
