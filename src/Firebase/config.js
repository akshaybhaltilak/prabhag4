// src/Firebase/config.js
import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBcQ_m23J99MgSLP5hhaYNy9mAoAieEGa4",
  authDomain: "prabhag4-b0eb0.firebaseapp.com",
  projectId: "prabhag4-b0eb0",
  storageBucket: "prabhag4-b0eb0.firebasestorage.app",
  messagingSenderId: "168689927762",
  appId: "1:168689927762:web:4e068a130ab8ddfab7818b"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with offline persistence and long polling
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  }),
  experimentalForceLongPolling: true, // better for low-speed networks
  useFetchStreams: false,
});

export { db };