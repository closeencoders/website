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
    DATA_URL: "/data/posts.json",
    SEARCH_PAGE_PATH: "/search/"
  };

  const getEl = (id) => document.getElementById(id);

  const isSearchPage = () => {
    const path = window.location.pathname;
    return path === CONFIG.SEARCH_PAGE_PATH || path === `${CONFIG.SEARCH_PAGE_PATH}index.html`;
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
    if (!target) return;

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
    if (now - state.lastSearchAt < CONFIG.SEARCH_MIN_INTERVAL_MS) return false;
    if (!state.searchWindowStart || (now - state.searchWindowStart > CONFIG.SEARCH_WINDOW_MS)) {
      state.searchWindowStart = now;
      state.searchCount = 0;
    }
    state.lastSearchAt = now;
    return ++state.searchCount <= CONFIG.SEARCH_MAX_PER_WINDOW;
  };

  const applySearch = (rawQuery) => {
    const queryFromUrl = new URLSearchParams(window.location.search).get("q") || "";
    const query = (rawQuery !== undefined ? rawQuery : queryFromUrl).trim();
    
    const input = getEl("posts-search-input");
    if (input && rawQuery === undefined) input.value = query;

    const isManualAction = rawQuery !== undefined;

    // REDIRECT LOGIC
    if (!isSearchPage() && isManualAction) {
      const targetUrl = query ? `${CONFIG.SEARCH_PAGE_PATH}?q=${encodeURIComponent(query)}` : CONFIG.SEARCH_PAGE_PATH;
      window.location.href = targetUrl;
      return;
    }

    if (!state.postsLoaded) return;

    // On Home: Show everything
    if (!isSearchPage()) {
      return renderPosts(state.posts);
    }

    // On Search: Filter
    if (!query) {
      updateQueryParam("");
      return renderPosts(state.posts);
    }

    if (query.length < CONFIG.MIN_QUERY_LEN) {
      updateQueryParam("");
      return renderPostsMessage("Search term too short.");
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

  // RE-ADDED: Toggle logic for opening/closing the search bar UI
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
    const run = () => applySearch(input.value);

    input?.addEventListener("keydown", e => e.key === "Enter" && (e.preventDefault(), run()));
    getEl("posts-search-button")?.addEventListener("click", run);

    // Re-bind the toggle click event
    if (toggle && panel && input) {
      toggle.addEventListener("click", () => toggleSearch(toggle, panel, input));
    }

    getEl("posts-reset-button")?.addEventListener("click", () => {
      if (input) input.value = "";
      if (isSearchPage()) {
        applySearch("");
      } else if (toggle && panel && input) {
        // If on home, just close the panel on reset
        toggleSearch(toggle, panel, input);
      }
    });
  };

  const init = () => {
    setupPostSearch();
    void injectPosts();
  };

  document.readyState === "loading" 
    ? document.addEventListener("DOMContentLoaded", init) 
    : init();
})();