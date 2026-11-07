import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import {
  getStorage
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCWDIrTWUG2W6m8iY3_bZ53dnxDDnCuEWM",
  authDomain: "monoranjon-38b8d.firebaseapp.com",
  projectId: "monoranjon-38b8d",
  storageBucket: "monoranjon-38b8d.firebasestorage.app",
  messagingSenderId: "869924879569",
  appId: "1:869924879569:web:8f5b74e634ef2fe82219f0"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
