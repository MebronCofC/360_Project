// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyClnsOYSw3DfV5F8uU_jU3VCwYHNb4sEL4",
  authDomain: "authenticaiton-tutorial-28fc2.firebaseapp.com",
  projectId: "authenticaiton-tutorial-28fc2",
  storageBucket: "authenticaiton-tutorial-28fc2.firebasestorage.app",
  messagingSenderId: "708985619616",
  appId: "1:708985619616:web:96aec568c91b6e4e3a35c5",
  measurementId: "G-WCRCFWV7QK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

export { app, auth };