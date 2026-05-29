/**
 * Minimal Standalone HTTP server for sandbox container payload auditing.
 * Built using Node.js core libraries to prevent container dependency bloat.
 * Runs in parallel or inside the container when testing external shipping.
 */
import http from 'http';

const PORT = 3002; // Runs on 3002 to prevent conflicts with Vite running on 3000/3001

const server = http.createServer((req, res) => {
  // CORS support
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  console.log(`\n[Mock Server] Received: ${req.method} ${req.url}`);

  if (req.method === 'POST' && (req.url === '/api/editor/autosave' || req.url === '/api/editor/publish')) {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const actionType = req.url.includes('autosave') ? 'AUTOSAVE' : 'PUBLISH';
        
        console.log(`============== [MOCK SERVER LOG: ${actionType}] ==============`);
        console.log(`Article ID: ${payload.article_id}`);
        
        if (actionType === 'AUTOSAVE') {
          console.log(`Blocks Count: ${payload.content_json?.length || 0}`);
          console.log(`Updated Blocks:`, payload.updated_blocks || []);
        } else {
          console.log(`Title: ${payload.title}`);
          console.log(`Blocks Count: ${payload.content_json?.length || 0}`);
          console.log(`Markdown Length: ${payload.content_markdown?.length || 0} chars`);
          console.log(`HTML Length: ${payload.content_html?.length || 0} chars`);
        }
        console.log(`===========================================================`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          message: `${actionType} processed successfully by mock server on Port ${PORT}`,
          timestamp: new Date().toISOString()
        }));
      } catch (err) {
        console.error('[Mock Server] Failed parsing payload body:', err.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Malformed JSON payload body' }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found in editor mock server' }));
  }
});

server.listen(PORT, () => {
  console.log(`\n===========================================================`);
  console.log(`🚀 Standalone Payload Monitor listening on http://localhost:${PORT}`);
  console.log(`Ready to capture autosave and publish dispatches!`);
  console.log(`===========================================================\n`);
});
