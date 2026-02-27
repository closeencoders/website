(() => {
  const state = { posts: [], postsLoaded: false };

  const fetchHtml = async (path) => {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load ${path}: ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      console.error(error);
      return "";
    }
  };

  const injectHtml = async (targetId, path) => {
    const target = document.getElementById(targetId);
    if (!target) {
      return;
    }
    const html = await fetchHtml(path);
    if (!html) {
      return;
    }
    target.innerHTML = html;
    if (targetId === "header-space") {
      setupPostSearch();
    }
  };

  const injectParts = () => {
    void injectHtml("header-space", "/components/header.html");
    void injectHtml("footer-space", "/components/footer.html");
    void injectPosts();
  };

  const injectPosts = async () => {
    const target = document.getElementById("posts-space");
    if (!target) {
      return;
    }

    try {
      const response = await fetch("/posts.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load posts.json: ${response.status}`);
      }
      const posts = await response.json();
      if (!Array.isArray(posts) || posts.length === 0) {
        target.innerHTML = "<p>No posts yet.</p>";
        return;
      }
      state.posts = posts;
      state.postsLoaded = true;
      applySearch();
    } catch (error) {
      console.error(error);
    }
  };

  const renderPosts = (posts) => {
    const target = document.getElementById("posts-list");
    if (!target) {
      return;
    }

    if (!posts || posts.length === 0) {
      target.innerHTML = "<p>No posts found.</p>";
      return;
    }

    const items = posts
      .map((post) => {
        const title = post.title || post.slug || "Untitled";
        const description = post.description || "";
        const date = post.date ? `<small class="muted">${post.date}</small>` : "";
        return `
          <article class="post-card">
            <h2><a href="${post.url}">${title}</a></h2>
            ${date}
            ${description ? `<p>${description}</p>` : ""}
          </article>
        `;
      })
      .join("");

    target.innerHTML = items;
  };

  const filterPosts = (query) => {
    const lowered = query.toLowerCase();
    return state.posts.filter((post) => {
      const title = (post.title || "").toLowerCase();
      const description = (post.description || "").toLowerCase();
      const slug = (post.slug || "").toLowerCase();
      return (
        title.includes(lowered) ||
        description.includes(lowered) ||
        slug.includes(lowered)
      );
    });
  };

  const setupPostSearch = () => {
    const input = document.getElementById("posts-search-input");
    const button = document.getElementById("posts-search-button");
    const reset = document.getElementById("posts-reset-button");
    const toggle = document.getElementById("posts-search-toggle");
    const panel = document.querySelector(".posts-search-panel");
    if (!input) {
      return;
    }

    const runSearch = () => applySearch(input.value);

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        runSearch();
      }
    });

    if (button) {
      button.addEventListener("click", runSearch);
    }

    if (reset) {
      reset.addEventListener("click", () => {
        input.value = "";
        applySearch("");
      });
    }

    if (toggle && panel) {
      toggle.addEventListener("click", () => {
        const container = toggle.closest(".posts-search");
        const isOpen = panel.classList.toggle("is-open");
        panel.setAttribute("aria-hidden", isOpen ? "false" : "true");
        if (container) {
          container.classList.toggle("is-open", isOpen);
        }
        if (isOpen) {
          input.focus();
        }
      });
    }
  };

  const applySearch = (rawQuery) => {
    const query = (rawQuery ?? getQueryParam("q")).trim();
    const input = document.getElementById("posts-search-input");
    if (input) {
      input.value = query;
    }

    if (!isHomePage()) {
      const url = query ? `/?q=${encodeURIComponent(query)}` : "/";
      window.location.href = url;
      return;
    }
    if (!state.postsLoaded) {
      return;
    }

    if (!query) {
      renderPosts(state.posts);
      updateQueryParam("");
      return;
    }

    renderPosts(filterPosts(query));
    updateQueryParam(query);
  };

  const getQueryParam = (key) => {
    const params = new URLSearchParams(window.location.search);
    return params.get(key) || "";
  };

  const updateQueryParam = (value) => {
    const url = new URL(window.location.href);
    if (!value) {
      url.searchParams.delete("q");
    } else {
      url.searchParams.set("q", value);
    }
    window.history.replaceState({}, "", url);
  };

  const isHomePage = () => {
    const path = window.location.pathname;
    return path === "/" || path.endsWith("/index.html");
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectParts);
  } else {
    injectParts();
  }
})();
