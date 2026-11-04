import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const htmlPath = new URL('../dist/index.html', import.meta.url);
const server = createServer(async (_request, response) => {
  try {
    const html = await readFile(htmlPath);
    response.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    });
    response.end(html);
  } catch {
    response.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Run npm run build before starting the test server.');
  }
});

server.listen(4173, '127.0.0.1');
