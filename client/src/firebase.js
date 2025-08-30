import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserSessionPersistence, browserLocalPersistence ,GoogleAuthProvider,signInWithPopup, signOut, signInWithCustomToken } from "firebase/auth";
import { getFirestore } from "firebase/firestore";


const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const isDemo = window.location.hostname === "localhost" || window.location.hostname.includes === "vercel.app";

 setPersistence(auth, browserSessionPersistence)
  .then(() => {
   console.log(`using ${isDemo ? 'session' : 'local'} persistence for auth`);
  }
).catch((error) => {
  console.error("Error setting persistence:", error);
  });
export {auth, signInWithPopup, signOut};
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);


// Cypress E2E test hook: allow tests to set a fake currentUser with getIdToken()
if (typeof window !== 'undefined' && window.Cypress && window.__TEST_AUTH__) {
  try {
    const fake = window.__TEST_AUTH__;
    if (fake && typeof fake.getIdToken !== 'function') {
      fake.getIdToken = async () => 'tok-123';
    }
    auth.currentUser = fake;
  } catch (e) {
    // ignore in non-test environments
  }
}


// Cypress E2E helper: allow programmatic sign-in using a Firebase custom token
if (typeof window !== 'undefined' && window.Cypress) {
  window.__signInWithCustomToken = (token) => signInWithCustomToken(auth, token);
}
