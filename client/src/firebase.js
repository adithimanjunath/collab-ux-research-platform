// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider,signInWithPopup, signOut } from "firebase/auth";


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
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export {signInWithPopup, signOut};