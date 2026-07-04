import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PORT = 3000;

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
};

function serveFile(res, filePath) {
  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = extname(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'text/plain' });
  res.end(readFileSync(filePath));
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let filePath;

  if (url.pathname === '/' || url.pathname === '/index.html') {
    filePath = join(ROOT, 'src/index.html');
  } else if (url.pathname.startsWith('/partials/')) {
    filePath = join(ROOT, 'src', url.pathname);
  } else if (url.pathname.startsWith('/data/')) {
    filePath = join(ROOT, 'src', url.pathname);
  } else if (url.pathname.startsWith('/css/')) {
    filePath = join(ROOT, 'src', url.pathname);
  } else if (url.pathname.startsWith('/js/')) {
    const jsFile = url.pathname.replace('/js/', '');
    if (jsFile === 'app.js') {
      const compare = readFileSync(join(ROOT, 'src/js/compare.js'), 'utf8');
      const basket = readFileSync(join(ROOT, 'src/js/basket.js'), 'utf8');
      const app = readFileSync(join(ROOT, 'src/js/app.js'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(`${compare}\n${basket}\n${app}`);
      return;
    }
    filePath = join(ROOT, 'src', url.pathname);
  } else {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  serveFile(res, filePath);
});

server.listen(PORT, () => {
  console.log(`Dev server running at http://localhost:${PORT}`);
});
