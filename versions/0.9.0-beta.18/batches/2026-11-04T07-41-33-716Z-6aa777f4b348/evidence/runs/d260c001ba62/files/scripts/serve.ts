import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

// Browser journeys serve only the freshly built artifact, never source files.
const html = await readFile(new URL('../dist/index.html', import.meta.url));
createServer((_request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(html);
}).listen(4173, '127.0.0.1');
