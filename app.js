import { auth, db, storage, googleProvider } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

const $ = id => document.getElementById(id);

let authMode = "login";
let allContent = [];
let selectedCategory = "all";

function message(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

// Mobile menu
$("menuToggle")?.addEventListener("click", () => {
  $("mainNav").classList.toggle("open");
});

// Search focus
$("searchFocus")?.addEventListener("click", () => {
  $("searchInput").focus();
  document.getElementById("trending").scrollIntoView({ behavior: "smooth" });
});

// Authentication dialog
function openAuth(mode) {
  authMode = mode;
  $("authHeading").textContent = mode === "register" ? "Create Account" : "Welcome Back";
  $("authSubheading").textContent = mode === "register"
    ? "Join the MONORANJON community"
    : "Login to your account";
  $("authSubmit").textContent = mode === "register" ? "Create Account" : "Login";
  $("nameLabel").classList.toggle("hidden", mode !== "register");
  $("authSwitch").innerHTML = mode === "register"
    ? 'Already registered? <a href="#" id="switchAuth">Login here</a>'
    : 'New here? <a href="#" id="switchAuth">Create an account</a>';

  $("authMessage").textContent = "";
  $("authDialog").showModal();

  $("switchAuth").addEventListener("click", event => {
    event.preventDefault();
    openAuth(authMode === "register" ? "login" : "register");
  }, { once: true });
}

$("loginOpen").addEventListener("click", () => openAuth("login"));
$("registerOpen").addEventListener("click", () => openAuth("register"));
$("sideLogin").addEventListener("click", e => {
  e.preventDefault();
  openAuth("login");
});
$("sideRegister").addEventListener("click", () => openAuth("register"));
$("dialogClose").addEventListener("click", () => $("authDialog").close());

async function saveUser(user) {
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    email: user.email || "",
    name: user.displayName || "",
    createdAt: serverTimestamp()
  }, { merge: true });
}

// Register / Login
$("authForm").addEventListener("submit", async event => {
  event.preventDefault();

  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;
  const name = $("authName").value.trim();

  try {
    $("authSubmit").disabled = true;
    message("authMessage", "Please wait...");

    if (authMode === "register") {
      if (!name) throw new Error("তোমার নাম লিখো।");
      if (password.length < 6) throw new Error("Password কমপক্ষে ৬ অক্ষরের হতে হবে।");

      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: name });
      await saveUser(result.user);
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }

    $("authDialog").close();
    $("authForm").reset();
  } catch (error) {
    message("authMessage", error.message);
  } finally {
    $("authSubmit").disabled = false;
  }
});

// Google Login
$("googleBtn").addEventListener("click", async () => {
  try {
    message("authMessage", "Opening Google sign-in...");
    const result = await signInWithPopup(auth, googleProvider);
    await saveUser(result.user);
    $("authDialog").close();
  } catch (error) {
    message("authMessage", error.message);
  }
});

// Authentication state
onAuthStateChanged(auth, user => {
  const loggedIn = Boolean(user);

  $("loginOpen").classList.toggle("hidden", loggedIn);
  $("registerOpen").classList.toggle("hidden", loggedIn);
  $("logoutBtn").classList.toggle("hidden", !loggedIn);

  $("accountTitle").textContent = loggedIn
    ? `Welcome, ${user.displayName || "Member"}`
    : "Join MONORANJON";

  $("accountDescription").textContent = loggedIn
    ? user.email || "You are logged in."
    : "Create an account and discover amazing digital creations.";

  $("sideRegister").classList.toggle("hidden", loggedIn);
  $("accountHint").innerHTML = loggedIn
    ? '<a href="dashboard.html">Open your dashboard →</a>'
    : 'Already have an account? <a href="#" id="sideLogin">Login here</a>';

  if (!loggedIn) {
    $("accountHint").querySelector("a")?.addEventListener("click", e => {
      e.preventDefault();
      openAuth("login");
    });
  }
});

$("logoutBtn").addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    alert(error.message);
  }
});

// Load approved content
async function loadContent() {
  const container = $("contentList");

  try {
    const q = query(
      collection(db, "content"),
      where("status", "==", "approved")
    );

    const snapshot = await getDocs(q);
    allContent = snapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    renderContent();
  } catch (error) {
    container.innerHTML = '<div class="empty-state">Content load করা যাচ্ছে না। Firebase setup ও Firestore Rules পরীক্ষা করো।</div>';
    console.error(error);
  }
}

function renderContent() {
  const container = $("contentList");
  const search = $("searchInput").value.trim().toLowerCase();

  let filtered = allContent.filter(item => {
    const matchesCategory =
      selectedCategory === "all" || item.category === selectedCategory;

    const text = `${item.title || ""} ${item.description || ""} ${item.category || ""}`.toLowerCase();
    return matchesCategory && text.includes(search);
  });

  container.replaceChildren();

  if (!filtered.length) {
    container.innerHTML = '<div class="empty-state">এখনো কোনো approved content পাওয়া যায়নি।</div>';
    return;
  }

  filtered.slice(0, 12).forEach(item => {
    const card = document.createElement("article");
    card.className = "content-card";

    const tag = document.createElement("span");
    tag.className = "content-tag";
    tag.textContent = item.category || "Content";

    const title = document.createElement("h3");
    title.textContent = item.title || "Untitled";

    const description = document.createElement("p");
    description.textContent = item.description || "No description provided.";

    const button = document.createElement("button");
    button.className = "primary-btn download-btn";
    button.textContent = "Download";

    button.addEventListener("click", async () => {
      try {
        button.disabled = true;
        button.textContent = "Loading...";
        const url = await getDownloadURL(ref(storage, item.filePath));
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (error) {
        alert("Download করা যায়নি। Storage Rules ও file permission পরীক্ষা করতে হবে।");
        console.error(error);
      } finally {
        button.disabled = false;
        button.textContent = "Download";
      }
    });

    card.append(tag, title, description, button);
    container.append(card);
  });
}

// Search
$("searchForm").addEventListener("submit", event => {
  event.preventDefault();
  renderContent();
  $("trending").scrollIntoView({ behavior: "smooth" });
});

$("searchInput").addEventListener("input", renderContent);

// Category filters
document.querySelectorAll("[data-category]").forEach(button => {
  button.addEventListener("click", () => {
    selectedCategory = button.dataset.category;
    renderContent();
    $("trending").scrollIntoView({ behavior: "smooth" });
  });
});

$("showAllBtn").addEventListener("click", () => {
  selectedCategory = "all";
  $("searchInput").value = "";
  renderContent();
});

// File selection display
$("uploadFile").addEventListener("change", () => {
  const file = $("uploadFile").files[0];
  $("fileName").textContent = file
    ? `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`
    : "ZIP, PDF, HTML, CSS, JS, PNG, JPG — maximum 20 MB";
});

// Upload content for admin review
$("uploadForm").addEventListener("submit", async event => {
  event.preventDefault();

  const user = auth.currentUser;

  if (!user) {
    openAuth("login");
    message("uploadMessage", "Upload করতে আগে Login করতে হবে।");
    return;
  }

  const title = $("uploadTitle").value.trim();
  const category = $("uploadCategory").value;
  const description = $("uploadDescription").value.trim();
  const file = $("uploadFile").files[0];

  if (!file) return message("uploadMessage", "একটি ফাইল নির্বাচন করো।");
  if (file.size > 20 * 1024 * 1024) {
    return message("uploadMessage", "ফাইলের সাইজ ২০ MB-এর বেশি হতে পারবে না।");
  }

  const allowed = /\.(zip|pdf|html|css|js|png|jpg|jpeg)$/i;
  if (!allowed.test(file.name)) {
    return message("uploadMessage", "এই ফাইল ফরম্যাট এখন অনুমোদিত নয়।");
  }

  try {
    $("uploadBtn").disabled = true;
    message("uploadMessage", "Uploading...");

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `uploads/${user.uid}/${Date.now()}_${safeName}`;
    const fileRef = ref(storage, filePath);

    await uploadBytes(fileRef, file, {
      contentType: file.type || "application/octet-stream"
    });

    await addDoc(collection(db, "content"), {
      ownerId: user.uid,
      title,
      category,
      description,
      fileName: file.name,
      filePath,
      fileSize: file.size,
      status: "pending",
      createdAt: serverTimestamp()
    });

    $("uploadForm").reset();
    $("fileName").textContent =
      "ZIP, PDF, HTML, CSS, JS, PNG, JPG — maximum 20 MB";

    message("uploadMessage", "Upload সফল হয়েছে। Admin review করার পর Content প্রকাশ হবে।");
  } catch (error) {
    message("uploadMessage", "Upload ব্যর্থ: " + error.message);
    console.error(error);
  } finally {
    $("uploadBtn").disabled = false;
  }
});

loadContent();
