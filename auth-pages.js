import { auth, db, googleProvider } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const $ = id => document.getElementById(id);

function show(text) {
  $("authMessage").textContent = text;
}

async function saveUser(user) {
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    email: user.email || "",
    name: user.displayName || "",
    createdAt: serverTimestamp()
  }, { merge: true });
}

$("registerBtn")?.addEventListener("click", async () => {
  try {
    const name = $("name").value.trim();
    const email = $("email").value.trim();
    const password = $("password").value;

    if (!name || !email || password.length < 6) {
      throw new Error("নাম, Email এবং কমপক্ষে ৬ অক্ষরের Password দাও।");
    }

    const result = await createUserWithEmailAndPassword(
      auth, email, password
    );

    await updateProfile(result.user, { displayName: name });
    await saveUser(result.user);

    location.href = "dashboard.html";
  } catch (error) {
    show(error.message);
  }
});

$("loginBtn")?.addEventListener("click", async () => {
  try {
    const email = $("email").value.trim();
    const password = $("password").value;

    await signInWithEmailAndPassword(auth, email, password);
    location.href = "dashboard.html";
  } catch (error) {
    show(error.message);
  }
});

$("googleBtn")?.addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await saveUser(result.user);
    location.href = "dashboard.html";
  } catch (error) {
    show(error.message);
  }
});
