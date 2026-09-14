import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  type Firestore,
  getFirestore
} from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: "AIzaSyCnJkZ_s_vydTMg8ANTihaG5H2TNwehbVU",
  authDomain: "trainingsplanung-nextlevel.firebaseapp.com",
  projectId: "trainingsplanung-nextlevel",
  storageBucket: "trainingsplanung-nextlevel.firebasestorage.app",
  messagingSenderId: "500745344893",
  appId: "1:500745344893:web:4fb302fd2f5f4f6a16de14",
  measurementId: "G-9S9YZXGVSD"
};

// Initialize or get existing Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth: Auth = getAuth(app);

// Initialize Firebase Storage
export const storage: FirebaseStorage = getStorage(app);

// Initialize Cloud Firestore with multi-tab offline cache
let dbInstance: Firestore;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch {
  dbInstance = getFirestore(app);
}

export const firestoreDb: Firestore = dbInstance;
export const db = firestoreDb;

