/**
 * LogicLab Studio — lightweight local web server
 * Requires Node.js 18+; no third-party dependencies.
 */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

function send(res, status, payload, contentType = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Cache-Control": "no-store"
  });
  res.end(payload);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);

  const authMatch = url.pathname.match(/^\/api\/auth\/(register|login|me|logout)$/);
  if (authMatch) {
    return require("./lib/auth").handler(req, res, authMatch[1]);
  }

  if (req.method === "GET" && url.pathname === "/api/health") {
    return send(res, 200, JSON.stringify({
      status: "ok",
      app: "LogicLab Studio",
      version: "1.0.0",
      service: "web-server",
      calculations: "client-side",
      timestamp: new Date().toISOString()
    }));
  }

  if (req.method === "GET" && url.pathname === "/api/meta") {
    return send(res, 200, JSON.stringify({
      name: "LogicLab Studio",
      features: [
        "K-map minimization (2–4 variables)",
        "SOP and POS forms",
        "Truth tables and K-map cell layouts",
        "Number-system conversion",
        "Digital-code conversion and equation references",
        "CSV and text exports"
      ],
      privacy: "Inputs are processed in the browser; the server does not store user data."
    }));
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return send(res, 405, JSON.stringify({ error: "Method not allowed" }));
  }

  let pathname;
  try { pathname = decodeURIComponent(url.pathname); }
  catch { return send(res, 400, JSON.stringify({ error: "Invalid URL" })); }

  if (pathname === "/") pathname = "/index.html";
  const filePath = path.resolve(ROOT, "." + pathname);
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
    return send(res, 403, JSON.stringify({ error: "Forbidden" }));
  }

  fs.stat(filePath, (statErr, stat) => {
    if (statErr || !stat.isFile()) {
      return send(res, 404, JSON.stringify({ error: "Not found" }));
    }
    const type = MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": type,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Cache-Control": "no-cache"
    });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log("");
  console.log("  LogicLab Studio is running");
  console.log(`  Website: http://${HOST}:${PORT}`);
  console.log(`  Health:  http://${HOST}:${PORT}/api/health`);
  console.log("  Press Ctrl+C to stop.");
  console.log("");
});

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 3000).unref();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
