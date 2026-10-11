const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const host = '127.0.0.1';
const port = Number(process.env.PORT || 8080);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('PORT must be an integer between 1 and 65535.');
  process.exit(1);
}

// Only the demo and built browser bundles are public, never the whole repository.
const assets = Object.freeze({
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/demo.css': ['demo.css', 'text/css; charset=utf-8'],
  '/demo.js': ['demo.js', 'text/javascript; charset=utf-8'],
  '/dist/bblocks.js': ['dist/bblocks.js', 'text/javascript; charset=utf-8'],
  '/dist/bblocks.mjs': ['dist/bblocks.mjs', 'text/javascript; charset=utf-8']
});

function reply(response, status, message) {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(message);
}

const server = http.createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    reply(response, 405, 'Method not allowed.');
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent((request.url || '/').split('?')[0]);
  } catch {
    reply(response, 400, 'Malformed URL.');
    return;
  }
  if (!pathname.startsWith('/') || pathname.includes('\\') || pathname.includes('\0') ||
      pathname.split('/').some(segment => segment === '..' || segment === '.')) {
    reply(response, 400, 'Invalid path.');
    return;
  }
  const asset = Object.hasOwn(assets, pathname) ? assets[pathname] : undefined;
  if (!asset) {
    reply(response, 404, 'Not found.');
    return;
  }

  try {
    const file = await fs.promises.realpath(path.join(root, asset[0]));
    if (!file.startsWith(root + path.sep)) {
      reply(response, 403, 'Forbidden.');
      return;
    }
    const stat = await fs.promises.stat(file);
    if (!stat.isFile()) {
      reply(response, 404, 'Not found.');
      return;
    }
    response.writeHead(200, {
      'Content-Type': asset[1],
      'Content-Length': stat.size,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    if (request.method === 'HEAD') {
      response.end();
    } else {
      const stream = fs.createReadStream(file);
      stream.on('error', () => response.destroy());
      stream.pipe(response);
    }
  } catch (error) {
    const missing = error.code === 'ENOENT';
    reply(response, missing ? 404 : 500,
      missing ? 'Asset not found. Run npm run build first.' : 'Unable to serve asset.');
  }
});

server.on('error', error => {
  console.error(`Cannot start demo server: ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, host, () => {
  console.log(`BBlocks demo: http://${host}:${port}`);
  console.log('Local-only static server. Press Ctrl+C to stop.');
});
