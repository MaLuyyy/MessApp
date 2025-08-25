import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCS9HDeuHzRr4epsTfk3Ndgfj2jBpLyPFQ",
  authDomain: "messapp-ba57d.firebaseapp.com",
  projectId: "messapp-ba57d",
  storageBucket: "messapp-ba57d.firebasestorage.app",
  messagingSenderId: "876823829848",
  appId: "1:876823829848:web:f6db5e738b12116106192d",
  measurementId: "G-LSXDMKSVV8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { auth, db };