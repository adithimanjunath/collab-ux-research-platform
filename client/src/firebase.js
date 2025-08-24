import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserSessionPersistence, browserLocalPersistence ,GoogleAuthProvider,signInWithPopup, signOut } from "firebase/auth";
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
