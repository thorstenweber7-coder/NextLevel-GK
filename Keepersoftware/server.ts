import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { initFirebaseAdmin, handleApiRoute } from './apiHandler';

dotenv.config();

// Initialize Firebase Admin
initFirebaseAdmin();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Shared API routes handler
  app.use(async (req, res, next) => {
    if (req.url && req.url.startsWith('/api/')) {
      try {
        const handled = await handleApiRoute(req, res);
        if (handled) return;
      } catch (err: any) {
        console.error('[ApiServer] Error processing API request:', err);
        return res.status(500).json({ error: err.message || 'Interner Serverfehler.' });
      }
    }
    next();
  });

  // Serve static files / Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Global Express Error:', err);
    res.status(err.status || err.statusCode || 500).json({
      error: err.message || 'Ein interner Serverfehler ist aufgetreten.'
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
