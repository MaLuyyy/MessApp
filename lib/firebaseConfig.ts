import { initializeApp } from "firebase/app";
// @ts-expect-error Firebase types chưa export đủ
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';


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

// Initialize Firestore
const db = getFirestore(app);

// Initialize Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export { auth, db };