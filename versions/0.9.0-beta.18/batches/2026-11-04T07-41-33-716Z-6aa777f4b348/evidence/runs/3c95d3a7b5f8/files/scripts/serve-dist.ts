import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const htmlPath = new URL('../dist/index.html', import.meta.url);
const server = createServer(async (request, response) => {
  if (request.url !== '/' && request.url !== '/index.html') {
    response.writeHead(404).end('Not found');
    return;
  }
  try {
    const html = await readFile(htmlPath);
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(html);
  } catch {
    response.writeHead(500).end('Build dist/index.html before starting the test server.');
  }
});
server.listen(4173, '127.0.0.1');
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
