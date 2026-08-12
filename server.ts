import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import http from 'http';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const PYTHON_PORT = 8000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // CORS headers allowing chrome extension origins
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Attempt to spawn Python Uvicorn backend process
  let pythonRunning = false;
  try {
    const pyProcess = spawn('python', ['-m', 'uvicorn', 'backend.app:app', '--host', '127.0.0.1', '--port', '8000'], {
      cwd: process.cwd(),
      stdio: 'inherit'
    });

    pyProcess.on('error', (err) => {
      console.warn('Python FastAPI process error:', err.message);
    });

    // Check if python server becomes available on port 8000
    setTimeout(() => {
      http.get(`http://127.0.0.1:${PYTHON_PORT}/api/health`, (res) => {
        if (res.statusCode === 200) {
          pythonRunning = true;
          console.log('✓ Python FastAPI backend verified on port 8000');
        }
      }).on('error', () => {
        console.log('Using Node/SQLite fallback API handlers');
      });
    }, 2000);
  } catch (err) {
    console.warn('Could not spawn Python backend automatically:', err);
  }

  // Helper to proxy request to Python FastAPI on port 8000 if available
  const proxyToPython = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: PYTHON_PORT,
      path: req.originalUrl,
      method: req.method,
      headers: { ...req.headers, host: `127.0.0.1:${PYTHON_PORT}` }
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.status(proxyRes.statusCode || 200);
      Object.keys(proxyRes.headers).forEach((key) => {
        if (proxyRes.headers[key]) res.setHeader(key, proxyRes.headers[key]!);
      });
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err.message);
      pythonRunning = false;
      if (!res.headersSent) {
        res.status(502).json({ error: 'Python backend is unavailable' });
      }
    });

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }

    proxyReq.end();
  };

  // Attach proxy middleware to /api routes
  app.use('/api', proxyToPython);

  // Vite development middleware or static production serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MindBloom Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
