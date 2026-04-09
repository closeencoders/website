(() => {
  const state = {
    posts: [],
    postsLoaded: false,
    searchWindowStart: 0,
    searchCount: 0,
    lastSearchAt: 0,
  };

  const CONFIG = {
    MIN_QUERY_LEN: 3,
    SEARCH_MIN_INTERVAL_MS: 750,
    SEARCH_WINDOW_MS: 5000,
    SEARCH_MAX_PER_WINDOW: 20,
    DATA_URL: "/data/posts.json"
  };

  const getEl = (id) => document.getElementById(id);

  const isHomePage = () => {
    const path = window.location.pathname;
    const isHome = path === "/" || path === "/index.html" || path.endsWith("/index.html");
    return isHome;
  };

  const updateUI = (html) => {
    const target = getEl("posts-list");
    if (target) target.innerHTML = html;
  };

  const renderPostsMessage = (msg) => {
    updateUI(`<p>${msg}</p>`);
  };

  const updateQueryParam = (value) => {
    const url = new URL(window.location.href);
    value ? url.searchParams.set("q", value) : url.searchParams.delete("q");
    window.history.replaceState({}, "", url);
  };

  const injectPosts = async () => {
    const target = getEl("posts-space");
    if (!target) return

    try {
      const response = await fetch(CONFIG.DATA_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`Status: ${response.status}`);
      
      const posts = await response.json();
      if (!Array.isArray(posts) || posts.length === 0) {
        return renderPostsMessage("No posts yet.");
      }

      state.posts = posts;
      state.postsLoaded = true;
      applySearch();
    } catch (error) {
      console.error("Load failed:", error);
    }
  };

  const renderPosts = (posts) => {
    if (!posts?.length) return renderPostsMessage("No posts found.");

    const items = [...posts]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map((post) => {
        const title = post.title || post.slug || "Untitled";
        const dateStr = new Date(post.date).toISOString().split('T')[0];
        return `
          <a draggable="false" class="post-card opacity-gradient glass-panel" href="${post.url}">
            <div class="post-card-image">${post.image ? `<img draggable="false" src="${post.image}" alt="">` : ""}</div>
            <div class="post-card-text">
              <h2>${title}</h2>
              <p>${post.description || ""}</p>
            </div>
          </a>`;
      }).join("");

    updateUI(items);
  };

  const canRunSearch = () => {
    const now = Date.now();
    if (now - state.lastSearchAt < CONFIG.SEARCH_MIN_INTERVAL_MS) {
      return false;
    }

    if (!state.searchWindowStart || (now - state.searchWindowStart > CONFIG.SEARCH_WINDOW_MS)) {
      state.searchWindowStart = now;
      state.searchCount = 0;
    }

    state.lastSearchAt = now;
    const allowed = ++state.searchCount <= CONFIG.SEARCH_MAX_PER_WINDOW;
    return allowed;
  };

  const applySearch = (rawQuery) => {
    const query = (rawQuery ?? new URLSearchParams(window.location.search).get("q") ?? "").trim();
    const input = getEl("posts-search-input");
    if (input) input.value = query;

    const isShort = query.length > 0 && query.length < CONFIG.MIN_QUERY_LEN;
    const isManualAction = rawQuery !== undefined;

    // REDIRECT LOGIC
    if (!isHomePage()) {
      if (isManualAction) {
        if (isShort) {
          return renderPostsMessage("Less than 3 characters, too many potential results.");
        }
        const targetUrl = query ? `/?q=${encodeURIComponent(query)}` : "/";
        window.location.href = targetUrl;
      }
      return;
    }

    // HOME PAGE LOGIC
    if (!state.postsLoaded) {
      return;
    }

    if (!query) {
      updateQueryParam("");
      return renderPosts(state.posts);
    }

    if (isShort) {
      updateQueryParam("");
      return renderPostsMessage("Less than 3 characters, too many potential results.");
    }

    if (canRunSearch()) {
      const lowered = query.toLowerCase();
      const filtered = state.posts.filter(p => 
        (p.title || "").toLowerCase().includes(lowered) || 
        (p.description || "").toLowerCase().includes(lowered)
      );
      renderPosts(filtered);
      updateQueryParam(query);
    }
  };

  const toggleSearch = (toggle, panel, input) => {
    const isOpen = panel.classList.toggle("is-open");
    panel.setAttribute("aria-hidden", !isOpen);
    toggle.closest(".posts-search")?.classList.toggle("is-open", isOpen);
    if (isOpen) {
      input.focus();
    }
  };

  const setupPostSearch = () => {
    const input = getEl("posts-search-input");
    const toggle = getEl("posts-search-toggle");
    const panel = document.querySelector(".posts-search-panel");
    const run = () => {
      applySearch(input.value);
    };

    input.addEventListener("keydown", e => e.key === "Enter" && (e.preventDefault(), run()));
    getEl("posts-search-button")?.addEventListener("click", run);

    if (toggle && panel) {
      toggle.addEventListener("click", () => toggleSearch(toggle, panel, input));
      getEl("posts-reset-button")?.addEventListener("click", () => {
        input.value = "";
        applySearch("");
        toggleSearch(toggle, panel, input);
      });
    }
  };

  const init = () => {
    setupPostSearch();
    void injectPosts();
  };

  document.readyState === "loading" 
    ? document.addEventListener("DOMContentLoaded", init) 
    : init();
})();
