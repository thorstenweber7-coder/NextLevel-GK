import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

dotenv.config();

// Initialize firebase-admin with default credentials
if (getApps().length === 0) {
  initializeApp();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Route for updating a user's email in Firebase Auth (Secured with verifyIdToken)
  app.post('/api/update-user-email', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Nicht authentifiziert: Bearer-Token fehlt.' });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await getAuth().verifyIdToken(token);
    } catch (tokenErr: any) {
      console.error('Invalid ID token:', tokenErr);
      return res.status(401).json({ error: 'Ungültiges Authentifizierungs-Token.' });
    }

    const { uid, email } = req.body;
    if (!uid || !email) {
      return res.status(400).json({ error: 'UID und E-Mail-Adresse sind erforderlich.' });
    }

    // Authorization check: Caller must be the user themselves OR an admin
    let isAllowed = decodedToken.uid === uid;
    if (!isAllowed) {
      if (decodedToken.email === 'thorsten.weber7@gmail.com' || (decodedToken as any).role === 'admin') {
        isAllowed = true;
      } else {
        try {
          const userDoc = await getFirestore().collection('users').doc(decodedToken.uid).get();
          if (userDoc.exists && userDoc.data()?.role === 'admin') {
            isAllowed = true;
          }
        } catch (dbErr) {
          console.error('Error verifying admin role in firestore:', dbErr);
        }
      }
    }

    if (!isAllowed) {
      return res.status(403).json({ error: 'Keine Berechtigung zur Änderung dieser Benutzerdaten.' });
    }

    try {
      await getAuth().updateUser(uid, { email: email.trim() });
      console.log(`Successfully updated Firebase Auth email for UID: ${uid} to: ${email}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error updating Firebase Auth email:', error);
      res.status(500).json({ 
        error: error.message || 'Fehler beim Aktualisieren der E-Mail in Firebase Authentication.' 
      });
    }
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
