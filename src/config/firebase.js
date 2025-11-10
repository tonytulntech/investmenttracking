import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
// Get these from: Firebase Console > Project Settings > General > Your apps > Firebase SDK snippet
const firebaseConfig = {
  apiKey: "AIzaSyAP2dzVXHF0ykfB5gD94Z1e7G-Hsn6LFt8",
  authDomain: "investmenttracking-67717.firebaseapp.com",
  projectId: "investmenttracking-67717",
  storageBucket: "investmenttracking-67717.firebasestorage.app",
  messagingSenderId: "60235965263",
  appId: "1:60235965263:web:45af9e837357218194db3a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
