//Copyright 2026 Close Encoders - closeencoders.com - All Rights Reserved
class PostManager {
  constructor(config = {}) {
    this.CONFIG = {
      MIN_QUERY_LEN: 3,
      SEARCH_MIN_INTERVAL_MS: 750,
      SEARCH_WINDOW_MS: 5000,
      SEARCH_MAX_PER_WINDOW: 20,
      DATA_URL: "/data/posts.json",
      SEARCH_PAGE_PATH: "/search/",
      ...config
    };

    this.state = {
      posts: [],
      postsLoaded: false,
      searchWindowStart: 0,
      searchCount: 0,
      lastSearchAt: 0,
    };

    this.init();
  }

  init() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    this.setupEventListeners();
    this.fetchAndInjectPosts();
    this.handleNavigationState();
  }

  getEl(id) {
    return document.getElementById(id);
  }

  isSearchPage() {
    const path = window.location.pathname;
    return path === this.CONFIG.SEARCH_PAGE_PATH || path === `${this.CONFIG.SEARCH_PAGE_PATH}index.html`;
  }

  updateUI(html) {
    const target = this.getEl("posts-list");
    if (target) target.innerHTML = html;
  }

  renderMessage(msg) {
    this.updateUI(`<p>${msg}</p>`);
  }

  updateQueryParam(value) {
    const url = new URL(window.location.href);
    value ? url.searchParams.set("q", value) : url.searchParams.delete("q");
    window.history.replaceState({}, "", url);
  }

  async fetchAndInjectPosts() {
    const target = this.getEl("posts-space");
    if (!target) return;

    try {
      const response = await fetch(this.CONFIG.DATA_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`Status: ${response.status}`);

      const posts = await response.json();
      if (!Array.isArray(posts) || posts.length === 0) {
        return this.renderMessage("No posts yet.");
      }

      this.state.posts = posts;
      this.state.postsLoaded = true;
      this.applySearch();
    } catch (error) {
      console.error("Load failed:", error);
    }
  }

  canRunSearch() {
    const now = Date.now();
    if (now - this.state.lastSearchAt < this.CONFIG.SEARCH_MIN_INTERVAL_MS) return false;

    if (!this.state.searchWindowStart || (now - this.state.searchWindowStart > this.CONFIG.SEARCH_WINDOW_MS)) {
      this.state.searchWindowStart = now;
      this.state.searchCount = 0;
    }

    this.state.lastSearchAt = now;
    return ++this.state.searchCount <= this.CONFIG.SEARCH_MAX_PER_WINDOW;
  }

  applySearch(rawQuery) {
    const urlParams = new URLSearchParams(window.location.search);
    const queryFromUrl = urlParams.get("q") || "";
    const query = (rawQuery !== undefined ? rawQuery : queryFromUrl).trim();

    const input = this.getEl("posts-search-input");
    if (input && rawQuery === undefined) input.value = query;

    const isManualAction = rawQuery !== undefined;

    if (!this.isSearchPage() && isManualAction) {
      const targetUrl = query
        ? `${this.CONFIG.SEARCH_PAGE_PATH}?q=${encodeURIComponent(query)}`
        : this.CONFIG.SEARCH_PAGE_PATH;
      window.location.href = targetUrl;
      return;
    }

    if (!this.state.postsLoaded) return;

    if (!this.isSearchPage()) return;

    if (!query) {
      return;
      this.updateQueryParam("");
      return this.renderSearchPosts(this.state.posts);
    }

    if (query.length < this.CONFIG.MIN_QUERY_LEN) {
      this.updateQueryParam("");
      return this.renderMessage("Search term too short.");
    }

    if (this.canRunSearch()) {
      const lowered = query.toLowerCase();
      const filtered = this.state.posts.filter(p =>
        (p.title || "").toLowerCase().includes(lowered) ||
        (p.description || "").toLowerCase().includes(lowered)
      );
      this.renderSearchPosts(filtered);
      this.updateQueryParam(query);
    }
  }

  renderSearchPosts(posts) {
    if (!posts?.length) return this.renderMessage("No posts found.");
    const items = [...posts]
      .map((post) => {
        const dateOnly = post.date.split('T')[0];
        const title = post.title || post.slug || "Untitled";
        return `<a draggable="false" rel="noopener" href="${post.url}"><h2>${title}</h2>${dateOnly}${post.tags ? " | " + post.tags + " | " : ""}${post.description || ""}</a>`;
      }).join("");

    this.updateUI(items);
  }

  setupEventListeners() {
    const input = this.getEl("posts-search-input");
    const searchBtn = this.getEl("posts-search-button");
    const resetBtn = this.getEl("posts-reset-button");

    const runSearch = () => this.applySearch(input.value);

    // Search Execution
    input?.addEventListener("keydown", e => e.key === "Enter" && (e.preventDefault(), runSearch()));
    searchBtn?.addEventListener("click", runSearch);

    // Reset logic
    resetBtn?.addEventListener("click", () => {
      if (input) {
        input.value = "";
        if (this.isSearchPage()) {
          this.applySearch("");
        }
      }
    });

    const burgerBtn = document.querySelector(".mobile-nav-burger");
    if (burgerBtn) {
      burgerBtn.addEventListener("click", () => this.toggleMobileNav());
    }
  }

  handleNavigationState() {
    const path = window.location.pathname;
    let targetId = "home";
    if (path !== "/" && path !== "") {
      const match = path.match(/\/(about|social)/);
      targetId = match ? match[1] : null;
    }
    document.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
    if (targetId) {
      const targetEl = this.getEl(targetId);
      if (targetEl) targetEl.classList.add('active');
    }
  }

  toggleMobileNav() {
    const navItems = this.getEl("top-nav-items");
    const burgerBtn = document.querySelector(".mobile-nav-burger");

    if (!navItems) return;
    const isExpanded = navItems.classList.toggle("is-active");
    if (burgerBtn) {
      burgerBtn.setAttribute("aria-expanded", isExpanded);
    }
  }
}

const blogApp = new PostManager();
// Copyright 2026 Close Encoders - closeencoders.com - All Rights Reserved
