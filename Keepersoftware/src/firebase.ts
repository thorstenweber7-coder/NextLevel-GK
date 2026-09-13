import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  getFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  doc, 
  getDocFromServer 
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDzfnQo3n-s3HHcgRwZV11curS2Aix2k0c",
  authDomain: "coaching-app-a1f0d.firebaseapp.com",
  projectId: "coaching-app-a1f0d",
  storageBucket: "coaching-app-a1f0d.firebasestorage.app",
  messagingSenderId: "163253046125",
  appId: "1:163253046125:web:9f5be0c3bfa00bb249e864",
  measurementId: "G-WFHXLNFJEQ"
};

// Initialize App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Initialize Firestore with Persistent Multi-Tab Cache for offline capability on the pitch
let db: ReturnType<typeof getFirestore>;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch {
  db = getFirestore(app);
}

// Validation Connection Check
async function testConnection() {
  if (!auth.currentUser) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('insufficient permissions')) {
      return;
    }
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export { app, auth, db, firebaseConfig };
