import {
  auth, db, storage, googleProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
  collection, addDoc, getDocs,
  deleteDoc, doc, setDoc, getDoc,
  query, orderBy, serverTimestamp,
  ref, uploadBytes, getDownloadURL
} from "./firebase.js";

const $ = id => document.getElementById(id);

let currentUser = null;
let isRegister = false;
let isAdmin = false;
let currentCategory = "All";
let products = [];
let lang = "bn";

const demoProducts = [
  {
    id: "demo1",
    name: "Website Template",
    category: "Websites",
    price: 0,
    description: "Digital website template demonstration.",
    image: "assets/banner.jpg",
    link: ""
  },
  {
    id: "demo2",
    name: "Creative Design",
    category: "Design",
    price: 0,
    description: "Creative design collection demonstration.",
    image: "assets/banner.jpg",
    link: ""
  }
];

// Firebase configuration check
function firebaseConfigured() {
  return auth.app.options.apiKey &&
    auth.app.options.apiKey !== "YOUR_API_KEY" &&
    auth.app.options.projectId !== "YOUR_PROJECT_ID";
}

// LOADER
window.addEventListener("load", () => {
  setTimeout(() => {
    $("loader").style.opacity = "0";
    setTimeout(() => $("loader").style.display = "none", 500);
  }, 900);
});

$("year").textContent = new Date().getFullYear();

// MOBILE MENU
$("menuToggle").addEventListener("click", () => {
  $("navLinks").classList.toggle("open");
});

document.querySelectorAll("#navLinks a").forEach(link => {
  link.addEventListener("click", () => {
    $("navLinks").classList.remove("open");
  });
});

// LANGUAGE
$("languageBtn").addEventListener("click", () => {
  lang = lang === "bn" ? "en" : "bn";
  $("languageBtn").textContent = lang === "bn" ? "EN" : "বাংলা";

  document.documentElement.lang = lang;

  document.querySelectorAll("[data-bn]").forEach(el => {
    el.textContent = el.dataset[lang];
  });
});

// CATEGORY
document.querySelectorAll(".category").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".category").forEach(b =>
      b.classList.remove("active")
    );

    button.classList.add("active");
    currentCategory = button.dataset.category;
    renderProducts();
  });
});

// SEARCH
$("searchInput").addEventListener("input", renderProducts);

// PRODUCT DISPLAY
function renderProducts() {
  const grid = $("productGrid");
  const search = $("searchInput").value.toLowerCase();

  const filtered = products.filter(p => {
    const categoryMatch =
      currentCategory === "All" ||
      p.category === currentCategory;

    const searchMatch =
      (p.name || "").toLowerCase().includes(search) ||
      (p.description || "").toLowerCase().includes(search);

    return categoryMatch && searchMatch;
  });

  grid.innerHTML = "";

  if (!filtered.length) {
    grid.innerHTML =
      '<div class="empty-state">No products found.</div>';
    return;
  }

  filtered.forEach(p => {
    const card = document.createElement("article");
    card.className = "product-card";

    const img = document.createElement("img");
    img.src = p.image || "assets/banner.jpg";
    img.alt = p.name || "Product";
    img.loading = "lazy";

    const info = document.createElement("div");
    info.className = "product-info";

    const category = document.createElement("span");
    category.className = "product-category";
    category.textContent = p.category || "Other";

    const title = document.createElement("h3");
    title.textContent = p.name || "Product";

    const desc = document.createElement("p");
    desc.textContent = p.description || "";

    const bottom = document.createElement("div");
    bottom.className = "product-bottom";

    const price = document.createElement("span");
    price.className = "product-price";
    price.textContent = "৳" + Number(p.price || 0);

    bottom.appendChild(price);

    if (p.link) {
      const a = document.createElement("a");
      a.className = "product-link";
      a.href = p.link;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = "View Product ↗";
      bottom.appendChild(a);
    }

    info.append(category, title, desc, bottom);
    card.append(img, info);
    grid.appendChild(card);
  });
}

// LOAD PRODUCTS
async function loadProducts() {
  if (!firebaseConfigured()) {
    products = demoProducts;
    renderProducts();
    return;
  }

  try {
    const q = query(
      collection(db, "products"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    products = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    })).filter(p => p.status === "published");

    renderProducts();
    renderAdminProducts();

  } catch (error) {
    console.error(error);
    $("productGrid").textContent =
      "Products could not be loaded. Check Firebase configuration and rules.";
  }
}

// AUTH MODAL
$("loginOpen").addEventListener("click", () => {
  $("authModal").classList.remove("hidden");
  $("navLinks").classList.remove("open");
});

$("modalClose").addEventListener("click", closeModal);

$("authModal").addEventListener("click", e => {
  if (e.target === $("authModal")) closeModal();
});

function closeModal() {
  $("authModal").classList.add("hidden");
  $("authMessage").textContent = "";
}

function updateAuthMode() {
  $("authTitle").textContent = isRegister
    ? "Create Account" : "Welcome Back";

  $("authSubmit").textContent = isRegister
    ? "Register" : "Login";

  $("authName").classList.toggle("hidden", !isRegister);

  $("switchAuth").textContent = isRegister
    ? "Already have an account? Login"
    : "Create an account";
}

$("switchAuth").addEventListener("click", () => {
  isRegister = !isRegister;
  updateAuthMode();
});

// EMAIL AUTH
$("authForm").addEventListener("submit", async e => {
  e.preventDefault();

  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;
  const name = $("authName").value.trim();

  if (!firebaseConfigured()) {
    $("authMessage").textContent =
      "আগে firebase.js-এ Firebase Config বসাও।";
    return;
  }

  try {
    $("authSubmit").disabled = true;

    if (isRegister) {
      if (!name) throw new Error("Enter your name.");

      const result = await createUserWithEmailAndPassword(
        auth, email, password
      );

      await updateProfile(result.user, {
        displayName: name
      });

      await setDoc(doc(db, "users", result.user.uid), {
        name,
        email,
        createdAt: serverTimestamp()
      });

    } else {
      await signInWithEmailAndPassword(
        auth, email, password
      );
    }

    closeModal();

  } catch (error) {
    $("authMessage").textContent = error.message;
  } finally {
    $("authSubmit").disabled = false;
  }
});

// GOOGLE AUTH
$("googleLogin").addEventListener("click", async () => {
  if (!firebaseConfigured()) {
    $("authMessage").textContent =
      "Firebase Config আগে বসাতে হবে।";
    return;
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);

    await setDoc(doc(db, "users", result.user.uid), {
      name: result.user.displayName || "",
      email: result.user.email || "",
      updatedAt: serverTimestamp()
    }, { merge: true });

    closeModal();

  } catch (error) {
    $("authMessage").textContent = error.message;
  }
});

// ADMIN CHECK
async function checkAdmin(user) {
  if (!user || !firebaseConfigured()) return false;

  try {
    const adminDoc = await getDoc(
      doc(db, "admins", user.uid)
    );

    return adminDoc.exists() &&
      adminDoc.data().active === true;

  } catch (error) {
    console.error("Admin check:", error);
    return false;
  }
}

// AUTH STATE
onAuthStateChanged(auth, async user => {
  currentUser = user;
  isAdmin = await checkAdmin(user);

  $("loginOpen").textContent = user ? "My Account" : "Login";

  $("account").classList.toggle("hidden", !user);
  $("admin").classList.toggle("hidden", !isAdmin);

  if (user) {
    $("userName").textContent =
      "Welcome " + (user.displayName || "User");

    $("userEmail").textContent = user.email || "";
    $("loginOpen").onclick = () => {
      $("account").scrollIntoView({ behavior: "smooth" });
    };
  } else {
    $("loginOpen").onclick = () => {
      $("authModal").classList.remove("hidden");
    };
  }

  if (isAdmin) renderAdminProducts();
});

// LOGOUT
$("logoutBtn").addEventListener("click", async () => {
  try {
    await signOut(auth);
    location.reload();
  } catch (error) {
    alert(error.message);
  }
});

// UPLOAD IMAGE
async function uploadImage(file, folder) {
  if (!file) throw new Error("Select an image first.");

  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image must be under 5 MB.");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${folder}/${Date.now()}_${safeName}`;

  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file, {
    contentType: file.type
  });

  return getDownloadURL(storageRef);
}

// ADD PRODUCT
$("productForm").addEventListener("submit", async e => {
  e.preventDefault();

  if (!currentUser || !isAdmin) {
    $("adminMessage").textContent = "Admin access required.";
    return;
  }

  const file = $("productImage").files[0];

  try {
    $("adminMessage").textContent = "Uploading...";

    const image = await uploadImage(file, "products");

    await addDoc(collection(db, "products"), {
      name: $("productName").value.trim(),
      category: $("productCategory").value,
      price: Number($("productPrice").value),
      description: $("productDescription").value.trim(),
      link: $("productLink").value.trim(),
      image,
      status: "published",
      createdBy: currentUser.uid,
      createdAt: serverTimestamp()
    });

    $("adminMessage").textContent = "Product published!";
    $("productForm").reset();

    await loadProducts();

  } catch (error) {
    $("adminMessage").textContent = error.message;
  }
});

// ADMIN PRODUCT LIST
async function renderAdminProducts() {
  if (!isAdmin) return;

  try {
    const snapshot = await getDocs(
      collection(db, "products")
    );

    const list = $("adminProductList");
    list.innerHTML = "";

    snapshot.forEach(d => {
      const p = d.data();

      const row = document.createElement("div");
      row.className = "admin-item";

      const title = document.createElement("span");
      title.textContent = `${p.name} (${p.category})`;

      const del = document.createElement("button");
      del.textContent = "Delete";

      del.addEventListener("click", async () => {
        if (!confirm("Delete this product?")) return;

        try {
          await deleteDoc(doc(db, "products", d.id));
          await loadProducts();
        } catch (error) {
          alert(error.message);
        }
      });

      row.append(title, del);
      list.appendChild(row);
    });

  } catch (error) {
    console.error(error);
  }
}

// PROFILE UPDATE
$("profileSave").addEventListener("click", async () => {
  if (!isAdmin) return;

  try {
    const file = $("profileUpload").files[0];
    const url = await uploadImage(file, "site");

    await setDoc(doc(db, "settings", "site"), {
      profileImage: url
    }, { merge: true });

    $("profileMessage").textContent =
      "Profile image saved. Refresh to see the update.";

  } catch (error) {
    $("profileMessage").textContent = error.message;
  }
});

// BANNER UPDATE
$("bannerSave").addEventListener("click", async () => {
  if (!isAdmin) return;

  try {
    const file = $("bannerUpload").files[0];
    const url = await uploadImage(file, "site");

    await setDoc(doc(db, "settings", "site"), {
      bannerImage: url
    }, { merge: true });

    $("bannerMessage").textContent =
      "Banner image saved.";

  } catch (error) {
    $("bannerMessage").textContent = error.message;
  }
});

// LOAD PROFILE AND BANNER SETTINGS
async function loadSiteSettings() {
  if (!firebaseConfigured()) return;

  try {
    const snapshot = await getDoc(doc(db, "settings", "site"));

    if (!snapshot.exists()) return;

    const data = snapshot.data();

    if (data.profileImage) {
      document.querySelectorAll(".profile-photo, .about-box img")
        .forEach(img => img.src = data.profileImage);
    }

    if (data.bannerImage) {
      document.querySelector(".hero").style.backgroundImage =
        `linear-gradient(90deg,#080611ee,#08061188),url("${data.bannerImage}")`;

      document.querySelector(".hero").style.backgroundSize = "cover";
      document.querySelector(".hero").style.backgroundPosition = "center";
    }

  } catch (error) {
    console.error(error);
  }
}

loadProducts();
loadSiteSettings();
