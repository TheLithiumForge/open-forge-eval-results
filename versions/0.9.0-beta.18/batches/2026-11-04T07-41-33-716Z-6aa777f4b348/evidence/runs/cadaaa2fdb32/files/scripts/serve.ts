import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

// Browser tests always serve the build created by test:e2e, never the source.
const html = await readFile(new URL('../dist/index.html', import.meta.url));
const server = createServer((request, response) => {
  if (request.url !== '/' && request.url !== '/index.html') {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html);
});
server.listen(4173, '127.0.0.1');
function stop() { server.close(); }
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
