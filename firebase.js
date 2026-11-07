import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import { getStorage } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDgQL9rdxShrn_mM2fEocpzKikiGhxsu3g",
  authDomain: "monoranjon-digital-2026.firebaseapp.com",
  projectId: "monoranjon-digital-2026",
  storageBucket: "monoranjon-digital-2026.firebasestorage.app",
  messagingSenderId: "729857204814",
  appId: "1:729857204814:web:be569cc61d16301c4ad91f",
  measurementId: "G-Z810CSBEET"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
