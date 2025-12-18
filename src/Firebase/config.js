// src/Firebase/config.js
import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD0RpzYDJnNGszojtI_BVkjLkUWbHyPkOU",
  authDomain: "pratiktondedemo.firebaseapp.com",
  databaseURL: "https://pratiktondedemo-default-rtdb.firebaseio.com",
  projectId: "pratiktondedemo",
  storageBucket: "pratiktondedemo.firebasestorage.app",
  messagingSenderId: "210106333841",
  appId: "1:210106333841:web:5cdf24ec0f0dc79c6a1d30"
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