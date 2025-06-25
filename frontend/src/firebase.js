import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // 🔥 Firestore for database

const firebaseConfig = {
    apiKey: "AIzaSyAL-nVO2wfKZnPWFOSQXPLKGJV9GDo5n7w",
    authDomain: "ev-charging-app-f0505.firebaseapp.com",
    databaseURL: "https://ev-charging-app-f0505-default-rtdb.firebaseio.com",
    projectId: "ev-charging-app-f0505",
    storageBucket: "ev-charging-app-f0505.firebasestorage.app",
    messagingSenderId: "691546873364",
    appId: "1:691546873364:web:4341f5ecf61ae5aaa6d101",
    measurementId: "G-51HDR7D7EL"
  };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // 🔥 Firestore database instance

export { auth, db, RecaptchaVerifier, signInWithPhoneNumber };
