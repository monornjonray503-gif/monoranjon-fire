document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("searchButton");
  const productGrid = document.getElementById("productGrid");
  const emptyMessage = document.getElementById("emptyMessage");
  const filters = document.querySelectorAll(".filter");
  const cards = [...document.querySelectorAll(".product-card")];
  const menuToggle = document.getElementById("menuToggle");
  const nav = document.getElementById("nav");
  const toast = document.getElementById("toast");

  let selectedCategory = "All";
  let toastTimer;

  // Notification
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2500);
  }

  // Mobile menu
  menuToggle.addEventListener("click", () => {
    nav.classList.toggle("open");
    menuToggle.textContent =
      nav.classList.contains("open") ? "✕" : "☰";
  });

  nav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      menuToggle.textContent = "☰";
    });
  });

  // Filter products
  function filterProducts() {
    const query = searchInput.value.trim().toLowerCase();
    let visible = 0;

    cards.forEach(card => {
      const category = card.dataset.category;
      const name = card.dataset.name.toLowerCase();
      const title = card.querySelector("h3").textContent.toLowerCase();

      const categoryMatch =
        selectedCategory === "All" ||
        category === selectedCategory;

      const searchMatch =
        !query ||
        name.includes(query) ||
        title.includes(query) ||
        category.toLowerCase().includes(query);

      const show = categoryMatch && searchMatch;

      card.hidden = !show;
      if (show) visible++;
    });

    emptyMessage.hidden = visible !== 0;
    productGrid.style.display = visible ? "grid" : "none";
  }

  // Filter buttons
  filters.forEach(button => {
    button.addEventListener("click", () => {
      selectedCategory = button.dataset.filter;

      filters.forEach(item => item.classList.remove("active"));
      button.classList.add("active");

      filterProducts();
    });
  });

  // Category cards
  document.querySelectorAll(".category-card").forEach(button => {
    button.addEventListener("click", () => {
      selectedCategory = button.dataset.category;

      filters.forEach(item => {
        item.classList.toggle(
          "active",
          item.dataset.filter === selectedCategory
        );
      });

      filterProducts();
      document.getElementById("products").scrollIntoView({
        behavior: "smooth"
      });
    });
  });

  // Search
  searchButton.addEventListener("click", () => {
    selectedCategory = "All";

    filters.forEach(item => {
      item.classList.toggle("active", item.dataset.filter === "All");
    });

    filterProducts();
    document.getElementById("products").scrollIntoView({
      behavior: "smooth"
    });
  });

  searchInput.addEventListener("input", filterProducts);

  document.getElementById("headerSearch").addEventListener("click", () => {
    searchInput.focus();
    document.querySelector(".search-section").scrollIntoView({
      behavior: "smooth"
    });
  });

  // Reset products
  document.getElementById("resetProducts").addEventListener("click", () => {
    selectedCategory = "All";
    searchInput.value = "";

    filters.forEach(item => {
      item.classList.toggle("active", item.dataset.filter === "All");
    });

    filterProducts();
  });

  // Wishlist demo
  document.querySelectorAll(".heart-btn").forEach(button => {
    button.addEventListener("click", () => {
      button.classList.toggle("saved");
      button.textContent =
        button.classList.contains("saved") ? "♥" : "♡";

      showToast(
        button.classList.contains("saved")
          ? "Added to favorites (demo)"
          : "Removed from favorites (demo)"
      );
    });
  });

  // Product detail demo
  document.querySelectorAll(".product-bottom a").forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      showToast("Product details page will be connected next.");
    });
  });

  // Newsletter demo
  document.getElementById("newsletterForm").addEventListener("submit", event => {
    event.preventDefault();
    showToast("Newsletter backend is not connected yet.");
    event.target.reset();
  });

  // Footer year
  document.getElementById("year").textContent =
    new Date().getFullYear();

  // Initial display
  filterProducts();
});
