import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  User
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  onSnapshot
} from "firebase/firestore";

const firebaseConfig = {
  projectId: "polished-coda-48gvj",
  appId: "1:393720103625:web:047433d26d2ee182f4c318",
  apiKey: "AIzaSyDPiVOAzbzC9tdW0En2IiUkXNlEPOUw-Rg",
  authDomain: "polished-coda-48gvj.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-497f21ed-b991-4b46-ba16-4d6c5f8d1325",
  storageBucket: "polished-coda-48gvj.firebasestorage.app",
  messagingSenderId: "393720103625"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot
};
export type { User };
