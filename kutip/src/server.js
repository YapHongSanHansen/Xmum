import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createDemo } from './state.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');
const files = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };

function respond(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data));
}

export function createServer() {
  let demo = createDemo();
  return http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === 'GET' && url.pathname === '/api/view') return respond(res, 200, demo.view(url.searchParams.get('role')));
    if (req.method === 'POST' && ['/api/credit', '/api/payment', '/api/reset'].includes(url.pathname)) {
      let body = '';
      for await (const chunk of req) { body += chunk; if (body.length > 2000) throw new Error('Request too large'); }
      const input = body ? JSON.parse(body) : {};
      if (url.pathname === '/api/credit') return respond(res, 200, demo.decideCredit(input.role, input.choice));
      if (url.pathname === '/api/payment') return respond(res, 200, demo.verifyPayment(input.role, input.invoiceId, input.bankLineId));
      demo = createDemo();
      return respond(res, 200, { reset: true });
    }
    if (req.method === 'GET' && files[url.pathname]) {
      const [name, type] = files[url.pathname];
      const content = await readFile(path.join(root, name));
      res.writeHead(200, { 'content-type': `${type}; charset=utf-8`, 'cache-control': 'no-store' });
      return res.end(content);
    }
    respond(res, 404, { error: 'Not found' });
  } catch (error) { respond(res, 400, { error: error.message }); }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4173);
  createServer().listen(port, '127.0.0.1', () => console.log(`Kutip demo: http://127.0.0.1:${port}`));
}
