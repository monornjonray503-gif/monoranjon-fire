import { auth } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

onAuthStateChanged(auth, user => {
  if (!user) {
    location.href = "login.html";
    return;
  }

  document.getElementById("profileEmail").textContent =
    "Email: " + (user.email || "");

  document.getElementById("profileName").textContent =
    "Name: " + (user.displayName || "Not set");
});

document.getElementById("logoutProfile")
  .addEventListener("click", async () => {
    await signOut(auth);
    location.href = "index.html";
  });
