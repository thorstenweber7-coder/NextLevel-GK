import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

dotenv.config();

// Initialize firebase-admin with service-account.json if present, or default credentials
if (getApps().length === 0) {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(process.cwd(), 'service-account.json');
  if (fs.existsSync(serviceAccountPath)) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      initializeApp({
        credential: cert(serviceAccount)
      });
      console.log('Firebase Admin SDK initialized successfully with service-account.json.');
    } catch (err: any) {
      console.error('Error loading service-account.json file:', err);
      initializeApp();
    }
  } else {
    console.warn('Notice: service-account.json not found. Backend will attempt default credentials.');
    initializeApp();
  }
}

async function verifyCallerIsAdmin(token: string): Promise<{ isAdmin: boolean; decodedToken?: any; error?: string }> {
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    if (decodedToken.email === 'thorsten.weber7@gmail.com' || (decodedToken as any).role === 'admin') {
      return { isAdmin: true, decodedToken };
    }
    const userDoc = await getFirestore().collection('users').doc(decodedToken.uid).get();
    if (userDoc.exists && userDoc.data()?.role === 'admin') {
      return { isAdmin: true, decodedToken };
    }
    return { isAdmin: false, decodedToken, error: 'Keine Administrator-Berechtigung.' };
  } catch (err: any) {
    return { isAdmin: false, error: 'Ungültiges Authentifizierungs-Token.' };
  }
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
      res.json({ success: true, message: 'E-Mail wurde erfolgreich in Firebase Authentication aktualisiert.' });
    } catch (error: any) {
      console.error('Error updating Firebase Auth email:', error);
      let errorMsg = error.message || 'Fehler beim Aktualisieren der E-Mail in Firebase Authentication.';
      if (error.code === 'auth/email-already-exists') {
        errorMsg = 'Diese E-Mail-Adresse wird bereits von einem anderen Benutzer verwendet.';
      } else if (error.code === 'auth/invalid-email') {
        errorMsg = 'Ungültiges E-Mail-Format.';
      }
      res.status(500).json({ error: errorMsg });
    }
  });

  // API Route for admin directly setting a user's password in Firebase Auth
  app.post('/api/admin-set-user-password', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Nicht authentifiziert: Bearer-Token fehlt.' });
    }

    const token = authHeader.split('Bearer ')[1];
    const { isAdmin, error: authError } = await verifyCallerIsAdmin(token);
    if (!isAdmin) {
      return res.status(403).json({ error: authError || 'Nur Administratoren dürfen Passwörter für andere Benutzer setzen.' });
    }

    const { uid, newPassword } = req.body;
    if (!uid || !newPassword) {
      return res.status(400).json({ error: 'UID und neues Passwort sind erforderlich.' });
    }

    if (typeof newPassword !== 'string' || newPassword.trim().length < 6) {
      return res.status(400).json({ error: 'Das Passwort muss mindestens 6 Zeichen lang sein.' });
    }

    try {
      await getAuth().updateUser(uid, { password: newPassword.trim() });
      console.log(`Successfully updated Firebase Auth password for UID: ${uid}`);
      res.json({ success: true, message: 'Passwort wurde erfolgreich in Firebase Authentication aktualisiert.' });
    } catch (error: any) {
      console.error('Error setting password in Firebase Auth:', error);
      let errorMsg = error.message || 'Fehler beim Aktualisieren des Passworts in Firebase Authentication.';
      if (error.code === 'auth/user-not-found') {
        errorMsg = 'Benutzerkonto im Firebase Login-System nicht gefunden.';
      } else if (error.code === 'auth/weak-password') {
        errorMsg = 'Das Passwort ist zu schwach (mindestens 6 Zeichen erforderlich).';
      }
      res.status(500).json({ error: errorMsg });
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
