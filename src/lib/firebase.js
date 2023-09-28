import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyAF-wmRg5Rerni_fgOa6C9J0O4l6Bvprts",
    authDomain: "insta-clone-c7ce9.firebaseapp.com",
    projectId: "insta-clone-c7ce9",
    storageBucket: "insta-clone-c7ce9.appspot.com",
    messagingSenderId: "63819051698",
    appId: "1:63819051698:web:2289d174032aa0308c8fab"
};

const app = !getApps.length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore();
const auth = getAuth();
const storage = getStorage();

export { app, db, auth, storage };
