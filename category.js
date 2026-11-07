import { db, storage } from "./firebase.js";

import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import {
  ref,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

const page = {
  "gamesList": "game",
  "appsList": "app",
  "websitesList": "website"
};

async function loadCategory(elementId, category) {
  const container = document.getElementById(elementId);
  if (!container) return;

  try {
    const q = query(
      collection(db, "content"),
      where("status", "==", "approved"),
      where("category", "==", category)
    );

    const results = await getDocs(q);
    container.replaceChildren();

    if (results.empty) {
      container.textContent = "এই Category-তে এখনো কোনো Content নেই।";
      return;
    }

    results.forEach(item => {
      const data = item.data();
      const card = document.createElement("article");
      card.className = "content-card";

      const title = document.createElement("h3");
      title.textContent = data.title || "Untitled";

      const description = document.createElement("p");
      description.textContent = data.description || "";

      const button = document.createElement("button");
      button.className = "primary-btn";
      button.textContent = "Download";

      button.addEventListener("click", async () => {
        try {
          const url = await getDownloadURL(ref(storage, data.filePath));
          window.open(url, "_blank", "noopener");
        } catch {
          alert("File পাওয়া যায়নি।");
        }
      });

      card.append(title, description, button);
      container.append(card);
    });
  } catch (error) {
    container.textContent = error.message;
  }
}

for (const [elementId, category] of Object.entries(page)) {
  loadCategory(elementId, category);
}
