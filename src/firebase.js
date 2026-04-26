import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCNZzT8CBHZdkOkykNiX8EWioTYGr6MJZc",
  authDomain: "crisis-sync-71700.firebaseapp.com",
  projectId: "crisis-sync-71700",
  storageBucket: "crisis-sync-71700.firebasestorage.app",
  messagingSenderId: "358003824491",
  appId: "1:358003824491:web:270300ddfd0565b2c4de2e"
};

const app = initializeApp(firebaseConfig);

// 🔥 THIS is what you actually need
export const db = getFirestore(app);