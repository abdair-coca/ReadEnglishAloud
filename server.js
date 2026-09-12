'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const generateHandler = require('./api/generate');
const chatHandler = require('./api/chat');
const evaluateHandler = require('./api/evaluate');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function addCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-groq-api-key, x-groq-key, Idempotency-Key, idempotency-key');
}

function createServer() {
  const rootDir = __dirname;
  const indexPath = path.join(rootDir, 'index.html');

  return http.createServer(async (req, res) => {
    addCorsHeaders(res);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    // Static frontend
    if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      fs.createReadStream(indexPath).pipe(res);
      return;
    }

    // Static assets in /docs or other subpaths
    if (req.method === 'GET' && pathname.startsWith('/docs/')) {
      const docsDir = path.join(rootDir, 'docs');
      const resolvedPath = path.resolve(rootDir, '.' + pathname);
      if (resolvedPath.startsWith(docsDir) && fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
        const ext = path.extname(resolvedPath).toLowerCase();
        res.statusCode = 200;
        res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
        fs.createReadStream(resolvedPath).pipe(res);
        return;
      }
    }

    // API routes
    if (pathname.startsWith('/api/')) {
      // Collect request body
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const rawBody = Buffer.concat(chunks).toString('utf8');
      let parsedBody = {};
      if (rawBody) {
        try {
          parsedBody = JSON.parse(rawBody);
        } catch {
          parsedBody = rawBody;
        }
      }
      req.body = parsedBody;

      // Enhance response with status & json methods
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (data) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(data));
        return res;
      };

      if (pathname === '/api/generate') {
        return generateHandler(req, res);
      }
      if (pathname === '/api/chat') {
        return chatHandler(req, res);
      }
      if (pathname === '/api/evaluate') {
        return evaluateHandler(req, res);
      }

      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
      return;
    }

    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<h1>404 Not Found</h1>');
  });
}

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  const srv = createServer();
  srv.listen(PORT, '0.0.0.0', () => {
    console.log(`\n📖 EnglishAloud is running at http://localhost:${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser to start reading.\n`);
  });
}

module.exports = { createServer };
