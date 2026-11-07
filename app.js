import { auth, db, storage } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  collection, addDoc, getDocs, query, where,
  deleteDoc, doc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import {
  ref, uploadBytesResumable, getDownloadURL,
  deleteObject, refFromURL
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

// Add your own registered Firebase Admin UID here.
const ADMIN_UID = "PASTE_YOUR_ADMIN_UID_HERE";

const $ = id => document.getElementById(id);

let isAdmin = false;
let currentCategory = "All";
let allProducts = [];
let authMode = "login";

function toast(message) {
  $("toast").textContent = message;
  $("toast").style.display = "block";
  setTimeout(() => $("toast").style.display = "none", 3000);
}

function safeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;",
    '"':"&quot;", "'":"&#39;"
  })[char]);
}

function fileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0,120);
}

// Mobile menu
$("menuBtn").onclick = () => {
  $("navLinks").classList.toggle("open");
};

$("navLinks").querySelectorAll("a").forEach(link => {
  link.onclick = () => $("navLinks").classList.remove("open");
});

// Language switch
let language = localStorage.getItem("monoLanguage") || "en";

function setLanguage(lang) {
  language = lang;
  document.documentElement.lang = lang;

  document.querySelectorAll("[data-en][data-bn]").forEach(element => {
    element.textContent = element.dataset[lang];
  });

  $("langBtn").textContent = lang === "en" ? "বাংলা" : "English";
  localStorage.setItem("monoLanguage", lang);
}

$("langBtn").onclick = () => {
  setLanguage(language === "en" ? "bn" : "en");
};

setLanguage(language);

// Authentication modal
function openAuth(mode) {
  authMode = mode;
  $("authModal").classList.remove("hidden");
  $("authTitle").textContent = mode === "login" ? "Welcome Back" : "Create Account";
  $("authSubmit").textContent = mode === "login" ? "Login" : "Register";
  $("authName").classList.toggle("hidden", mode === "login");
  $("switchAuth").textContent =
    mode === "login" ? "Create a new account" : "Already have an account? Login";
  $("authStatus").textContent = "";
}

$("loginBtn").onclick = () => openAuth("login");
$("registerBtn").onclick = () => openAuth("register");
$("closeModal").onclick = () => $("authModal").classList.add("hidden");

$("switchAuth").onclick = () => {
  openAuth(authMode === "login" ? "register" : "login");
};

$("authForm").addEventListener("submit", async event => {
  event.preventDefault();

  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;
  const name = $("authName").value.trim();

  try {
    $("authSubmit").disabled = true;

    if (authMode === "register") {
      if (!name) throw new Error("Enter your name.");

      const result = await createUserWithEmailAndPassword(
        auth, email, password
      );

      await updateProfile(result.user, {
        displayName: name
      });

      toast("Account created successfully!");
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      toast("Login successful!");
    }

    $("authModal").classList.add("hidden");
    $("authForm").reset();

  } catch (error) {
    $("authStatus").textContent = error.message;
  } finally {
    $("authSubmit").disabled = false;
  }
});

// Google login
$("googleBtn").onclick = async () => {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    $("authModal").classList.add("hidden");
    toast("Google login successful!");
  } catch (error) {
    $("authStatus").textContent = error.message;
  }
};

// Auth state and admin protection
onAuthStateChanged(auth, async user => {
  isAdmin = !!user && user.uid === ADMIN_UID;

  $("loginBtn").classList.toggle("hidden", !!user);
  $("registerBtn").classList.toggle("hidden", !!user);
  $("logoutBtn").classList.toggle("hidden", !user);
  $("adminPanel").classList.toggle("hidden", !isAdmin);

  if (user && isAdmin) {
    toast("Admin access enabled.");
    await loadProducts();
    await loadAssets();
  } else {
    await loadProducts();
    await loadAssets();
  }
});

$("logoutBtn").onclick = async () => {
  await signOut(auth);
  toast("Logged out.");
};

// Upload helper
async function uploadFile(file, folder) {
  if (!file) return null;

  const path = `uploads/${folder}/${Date.now()}_${fileName(file.name)}`;
  const storageRef = ref(storage, path);

  const task = uploadBytesResumable(storageRef, file, {
    contentType: file.type || "application/octet-stream"
  });

  await new Promise((resolve, reject) => {
    task.on("state_changed", snapshot => {
      const percent = Math.round(
        snapshot.bytesTransferred / snapshot.totalBytes * 100
      );
      toast(`Uploading ${percent}%`);
    }, reject, resolve);
  });

  return {
    url: await getDownloadURL(task.snapshot.ref),
    path
  };
}

// Load products
async function loadProducts() {
  $("productGrid").innerHTML = '<div class="loading">Loading products...</div>';

  try {
    let snapshot;

    if (isAdmin) {
      snapshot = await getDocs(collection(db, "products"));
    } else {
      const q = query(
        collection(db, "products"),
        where("status", "==", "published")
      );
      snapshot = await getDocs(q);
    }

    allProducts = snapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    allProducts.sort((a,b) =>
      (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
    );

    renderProducts();
    renderAdminProducts();

  } catch (error) {
    $("productGrid").innerHTML =
      '<div class="empty">Could not load products. Check Firebase setup and Firestore Rules.</div>';
    console.error(error);
  }
}

// Product display
function renderProducts() {
  const search = $("searchInput").value.toLowerCase();

  const products = allProducts.filter(product => {
    const categoryMatch =
      currentCategory === "All" || product.category === currentCategory;

    const searchMatch =
      `${product.title} ${product.description} ${product.category}`
      .toLowerCase().includes(search);

    return categoryMatch && searchMatch &&
      (product.status === "published" || isAdmin);
  });

  if (!products.length) {
    $("productGrid").innerHTML =
      '<div class="empty">No products found. Check again later.</div>';
    return;
  }

  $("productGrid").innerHTML = products.map(product => `
    <article class="product-card">
      <div class="product-image">
        ${product.imageURL
          ? `<img src="${safeText(product.imageURL)}" alt="${safeText(product.title)}" loading="lazy">`
          : "💎"}
      </div>
      <div class="product-info">
        <h3>${safeText(product.title)}</h3>
        <p>${safeText(product.description)}</p>
        <div class="product-meta">
          <span class="product-price">${safeText(product.price || "Contact")}</span>
          ${product.fileURL
            ? `<a href="${safeText(product.fileURL)}" target="_blank" rel="noopener" download>Download ↗</a>`
            : product.productURL
              ? `<a href="${safeText(product.productURL)}" target="_blank" rel="noopener">Visit ↗</a>`
              : `<a href="https://wa.me/8801845077415" target="_blank" rel="noopener">Contact ↗</a>`
          }
        </div>
      </div>
    </article>
  `).join("");
}

// Category selection
document.querySelectorAll(".category").forEach(button => {
  button.onclick = () => {
    document.querySelectorAll(".category").forEach(item =>
      item.classList.remove("active")
    );

    button.classList.add("active");
    currentCategory = button.dataset.category;
    renderProducts();
  };
});

$("searchInput").addEventListener("input", renderProducts);
$("searchBtn").onclick = renderProducts;

// Admin product upload
$("productForm").addEventListener("submit", async event => {
  event.preventDefault();

  if (!isAdmin) {
    toast("Admin access required.");
    return;
  }

  const form = event.currentTarget;
  const data = new FormData(form);

  try {
    $("productStatus").textContent = "Uploading...";

    const imageFile = data.get("image");
    const productFile = data.get("file");

    const image = imageFile?.size
      ? await uploadFile(imageFile, "product-images")
      : null;

    const file = productFile?.size
      ? await uploadFile(productFile, "product-files")
      : null;

    await addDoc(collection(db, "products"), {
      title: data.get("title").trim(),
      category: data.get("category"),
      description: data.get("description").trim(),
      price: data.get("price").trim(),
      imageURL: image?.url || "",
      imagePath: image?.path || "",
      fileURL: file?.url || "",
      filePath: file?.path || "",
      status: "published",
      createdAt: serverTimestamp()
    });

    form.reset();
    $("productStatus").textContent = "Product published successfully!";
    await loadProducts();

  } catch (error) {
    $("productStatus").textContent = error.message;
  }
});

// Admin asset upload: profile, banner and logo
$("assetForm").addEventListener("submit", async event => {
  event.preventDefault();

  if (!isAdmin) return toast("Admin access required.");

  const form = event.currentTarget;
  const data = new FormData(form);
  const file = data.get("assetFile");
  const type = data.get("assetType");

  try {
    $("assetStatus").textContent = "Uploading image...";

    if (!file || !file.size) throw new Error("Choose an image.");

    const uploaded = await uploadFile(file, "site-assets");

    await setDoc(doc(db, "siteAssets", type), {
      type,
      url: uploaded.url,
      path: uploaded.path,
      updatedAt: serverTimestamp()
    });

    $("assetStatus").textContent = "Image updated successfully!";
    form.reset();
    await loadAssets();

  } catch (error) {
    $("assetStatus").textContent = error.message;
  }
});

// Apply saved site images
async function loadAssets() {
  try {
    const snapshot = await getDocs(collection(db, "siteAssets"));

    snapshot.forEach(item => {
      const asset = item.data();

      if (item.id === "profile" && asset.url) {
        $("heroProfile").src = asset.url;
      }

      if (item.id === "banner" && asset.url) {
        $("mainBanner").style.backgroundImage =
          `linear-gradient(#100822bb,#100822bb),url("${asset.url}")`;
        $("mainBanner").style.backgroundSize = "cover";
        $("mainBanner").style.backgroundPosition = "center";
      }

      if (item.id === "logo" && asset.url) {
        document.querySelectorAll(".brand-logo").forEach(element => {
          element.textContent = "";
          element.style.background = `url("${asset.url}") center/contain no-repeat`;
        });
      }
    });
  } catch (error) {
    console.error("Asset loading:", error);
  }
}

// Admin product manager
function renderAdminProducts() {
  if (!isAdmin) return;

  $("adminProducts").innerHTML = allProducts.length
    ? allProducts.map(product => `
      <div class="admin-product">
        <span>${safeText(product.title)} — ${safeText(product.category)}</span>
        <button class="delete-btn" data-delete="${safeText(product.id)}">Delete</button>
      </div>
    `).join("")
    : "<p>No products yet.</p>";

  $("adminProducts").querySelectorAll("[data-delete]").forEach(button => {
    button.onclick = () => deleteProduct(button.dataset.delete);
  });
}

// Delete product and associated files
async function deleteProduct(id) {
  if (!isAdmin) return;

  if (!confirm("Delete this product?")) return;

  try {
    const product = allProducts.find(item => item.id === id);

    for (const path of [product?.imagePath, product?.filePath]) {
      if (path) {
        try {
          await deleteObject(ref(storage, path));
        } catch (error) {
          console.warn("File deletion:", error);
        }
      }
    }

    await deleteDoc(doc(db, "products", id));
    toast("Product deleted.");
    await loadProducts();

  } catch (error) {
    toast(error.message);
  }
}

// Footer year
$("year").textContent = new Date().getFullYear();
