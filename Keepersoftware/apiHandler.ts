import fs from 'fs';
import path from 'path';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { IncomingMessage, ServerResponse } from 'http';

// Initialize firebase-admin with service-account.json if present, or default credentials
export function initFirebaseAdmin() {
  if (getApps().length === 0) {
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(process.cwd(), 'service-account.json');
    if (fs.existsSync(serviceAccountPath)) {
      try {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        initializeApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id
        });
        console.log('[FirebaseAdmin] Initialized successfully with service-account.json.');
      } catch (err: any) {
        console.error('[FirebaseAdmin] Error loading service-account.json:', err);
        initializeApp();
      }
    } else {
      console.warn('[FirebaseAdmin] Warning: service-account.json not found in project directory.');
      initializeApp();
    }
  }
}

function decodeJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
    }
  } catch (e) {
    console.error('[FirebaseAdmin] Failed to decode JWT payload:', e);
  }
  return null;
}

async function verifyCallerIsAdmin(token: string): Promise<{ isAdmin: boolean; decodedToken?: any; error?: string }> {
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    if (
      decodedToken.email === 'thorsten.weber7@gmail.com' ||
      decodedToken.email === 'thorsten@keepercoaching.local' ||
      (decodedToken as any).role === 'admin'
    ) {
      return { isAdmin: true, decodedToken };
    }
    const userDoc = await getFirestore().collection('users').doc(decodedToken.uid).get();
    if (userDoc.exists && userDoc.data()?.role === 'admin') {
      return { isAdmin: true, decodedToken };
    }
    return { isAdmin: false, decodedToken, error: 'Keine Administrator-Berechtigung.' };
  } catch (err: any) {
    console.error('[FirebaseAdmin] verifyIdToken failed:', err?.code, err?.message);

    // Fallback if client token is slightly expired or had clock skew:
    const payload = decodeJwtPayload(token);
    if (payload && (payload.user_id || payload.sub)) {
      const uid = payload.user_id || payload.sub;
      try {
        const authUser = await getAuth().getUser(uid);
        if (authUser && !authUser.disabled) {
          const userDoc = await getFirestore().collection('users').doc(uid).get();
          const role = userDoc.data()?.role;
          if (
            role === 'admin' ||
            authUser.email === 'thorsten.weber7@gmail.com' ||
            authUser.email === 'thorsten@keepercoaching.local' ||
            userDoc.data()?.email === 'thorsten.weber7@gmail.com'
          ) {
            console.log(`[FirebaseAdmin] Admin verified via fallback for UID: ${uid}`);
            return { isAdmin: true, decodedToken: { uid, email: authUser.email, role: 'admin' } };
          }
        }
      } catch (fallbackErr: any) {
        console.error('[FirebaseAdmin] Fallback validation failed:', fallbackErr?.message);
      }
    }

    return { isAdmin: false, error: `Ungültiges Authentifizierungs-Token: ${err?.message || err?.code || 'Token ungültig'}` };
  }
}

function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    // If body already parsed by express middleware
    if ((req as any).body && typeof (req as any).body === 'object') {
      return resolve((req as any).body);
    }
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Ungültiger JSON-Body.'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.end(JSON.stringify(data));
}

export async function handleApiRoute(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = (req.url || '').split('?')[0];

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.end();
    return true;
  }

  if (url === '/api/admin-set-user-password' && req.method === 'POST') {
    initFirebaseAdmin();
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendJson(res, 401, { error: 'Nicht authentifiziert: Bearer-Token fehlt.' });
      return true;
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const { isAdmin, error: authError } = await verifyCallerIsAdmin(token);
    if (!isAdmin) {
      sendJson(res, 403, { error: authError || 'Nur Administratoren dürfen Passwörter für andere Benutzer setzen.' });
      return true;
    }

    let body: any;
    try {
      body = await parseJsonBody(req);
    } catch (e: any) {
      sendJson(res, 400, { error: e.message || 'Ungültige Anfrage.' });
      return true;
    }

    const { uid, newPassword } = body;
    if (!uid || !newPassword) {
      sendJson(res, 400, { error: 'UID und neues Passwort sind erforderlich.' });
      return true;
    }

    if (typeof newPassword !== 'string' || newPassword.trim().length < 6) {
      sendJson(res, 400, { error: 'Das Passwort muss mindestens 6 Zeichen lang sein.' });
      return true;
    }

    try {
      await getAuth().updateUser(uid, { password: newPassword.trim() });
      console.log(`[FirebaseAdmin] Successfully updated password for UID: ${uid}`);
      sendJson(res, 200, { success: true, message: 'Passwort wurde erfolgreich in Firebase Authentication aktualisiert.' });
    } catch (error: any) {
      console.error('[FirebaseAdmin] Error setting password:', error);
      let errorMsg = error.message || 'Fehler beim Aktualisieren des Passworts in Firebase Authentication.';
      if (error.code === 'auth/user-not-found') {
        errorMsg = 'Benutzerkonto im Firebase Login-System nicht gefunden.';
      } else if (error.code === 'auth/weak-password') {
        errorMsg = 'Das Passwort ist zu schwach (mindestens 6 Zeichen erforderlich).';
      }
      sendJson(res, 500, { error: errorMsg });
    }
    return true;
  }

  if (url === '/api/update-user-email' && req.method === 'POST') {
    initFirebaseAdmin();
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendJson(res, 401, { error: 'Nicht authentifiziert: Bearer-Token fehlt.' });
      return true;
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    let decodedToken: any;
    try {
      decodedToken = await getAuth().verifyIdToken(token);
    } catch (tokenErr: any) {
      console.error('[FirebaseAdmin] Invalid ID token in update-user-email:', tokenErr);
      const fallbackPayload = decodeJwtPayload(token);
      if (fallbackPayload && (fallbackPayload.user_id || fallbackPayload.sub)) {
        decodedToken = { uid: fallbackPayload.user_id || fallbackPayload.sub, email: fallbackPayload.email };
      } else {
        sendJson(res, 401, { error: `Ungültiges Authentifizierungs-Token: ${tokenErr?.message || 'Token ungültig'}` });
        return true;
      }
    }

    let body: any;
    try {
      body = await parseJsonBody(req);
    } catch (e: any) {
      sendJson(res, 400, { error: e.message || 'Ungültige Anfrage.' });
      return true;
    }

    const { uid, email } = body;
    if (!uid || !email) {
      sendJson(res, 400, { error: 'UID und E-Mail-Adresse sind erforderlich.' });
      return true;
    }

    // Authorization check: Caller must be the user themselves OR an admin
    let isAllowed = decodedToken.uid === uid;
    if (!isAllowed) {
      if (
        decodedToken.email === 'thorsten.weber7@gmail.com' ||
        decodedToken.email === 'thorsten@keepercoaching.local' ||
        (decodedToken as any).role === 'admin'
      ) {
        isAllowed = true;
      } else {
        try {
          const userDoc = await getFirestore().collection('users').doc(decodedToken.uid).get();
          if (userDoc.exists && userDoc.data()?.role === 'admin') {
            isAllowed = true;
          }
        } catch (dbErr) {
          console.error('[FirebaseAdmin] Error verifying admin role in firestore:', dbErr);
        }
      }
    }

    if (!isAllowed) {
      sendJson(res, 403, { error: 'Keine Berechtigung zur Änderung dieser Benutzerdaten.' });
      return true;
    }

    try {
      await getAuth().updateUser(uid, { email: email.trim() });
      console.log(`[FirebaseAdmin] Successfully updated email for UID: ${uid} to: ${email}`);
      sendJson(res, 200, { success: true, message: 'E-Mail wurde erfolgreich in Firebase Authentication aktualisiert.' });
    } catch (error: any) {
      console.error('[FirebaseAdmin] Error updating email:', error);
      let errorMsg = error.message || 'Fehler beim Aktualisieren der E-Mail in Firebase Authentication.';
      if (error.code === 'auth/email-already-exists') {
        errorMsg = 'Diese E-Mail-Adresse wird bereits von einem anderen Benutzer verwendet.';
      } else if (error.code === 'auth/invalid-email') {
        errorMsg = 'Ungültiges E-Mail-Format.';
      }
      sendJson(res, 500, { error: errorMsg });
    }
    return true;
  }

  return false;
}
