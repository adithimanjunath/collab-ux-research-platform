// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserSessionPersistence, browserLocalPersistence ,GoogleAuthProvider,signInWithPopup, signOut } from "firebase/auth";


const firebaseConfig = {
  apiKey: "AIzaSyAORWKaT2GpsIUD0NceWKKqpSArkCxBGEU",
  authDomain: "collaborative-ux-research.firebaseapp.com",
  projectId: "collaborative-ux-research",
  storageBucket: "collaborative-ux-research.firebasestorage.app",
  messagingSenderId: "1033054400179",
  appId: "1:1033054400179:web:ff18f20cc03bb6eaa00ac6",
  measurementId: "G-VDY6PB60RE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const isDemo = window.location.hostname === "localhost" || window.location.hostname.includes === "vercel.app";
setPersistence(auth, isDemo ? browserSessionPersistence : browserLocalPersistence)
  .then(() => {
   console.log(`using ${isDemo ? 'session' : 'local'} persistence for auth`);
  }
).catch((error) => {
  console.error("Error setting persistence:", error);
  });
export {auth, signInWithPopup, signOut};
export const provider = new GoogleAuthProvider();
