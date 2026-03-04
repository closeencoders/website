(() => {
  const state = {
    posts: [],
    postsLoaded: false,
    searchWindowStart: 0,
    searchCount: 0,
    lastSearchAt: 0,
  };
  const getEl = (id) => document.getElementById(id);

  const initPage = () => {
    setupPostSearch();
    void injectPosts();
  };

  const injectPosts = async () => {
    const target = getEl("posts-space");
    if (!target) {
      return;
    }

    try {
      const response = await fetch("/data/posts.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load posts: ${response.status}`);
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
    const target = getEl("posts-list");
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
        const image = post.image || "";
        return `
            <a class="post-card" href="${post.url}">
              <span class="post-card-text">
                ${title}
                <small class="muted">${post.date} - ${description ? `${description}` : ""}</small>
              </span>
              ${image ? `<img class="post-card-image" src="${image}" alt="">` : ""}
            </a>
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
    const input = getEl("posts-search-input");
    const button = getEl("posts-search-button");
    const reset = getEl("posts-reset-button");
    const toggle = getEl("posts-search-toggle");
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
    const input = getEl("posts-search-input");
    if (input) input.value = query;

    if (!isHomePage()) {
      const url = query ? `/?q=${encodeURIComponent(query)}` : "/";
      window.location.href = url;
      return;
    }
    if (!state.postsLoaded) {
      return;
    }

    if (!query || query.length < 3) {
      renderPostsMessage("Less than 3 characters, too many potential results.");
      updateQueryParam("");
      return;
    }

    if (!canRunSearch()) {
      return;
    }

    renderPosts(filterPosts(query));
    updateQueryParam(query);
  };

  const renderPostsMessage = (message) => {
    const target = getEl("posts-list");
    if (target) target.innerHTML = `<p>${message}</p>`;
  };

  const getQueryParam = (key) =>
    new URLSearchParams(window.location.search).get(key) || "";

  const updateQueryParam = (value) => {
    const url = new URL(window.location.href);
    if (!value) {
      url.searchParams.delete("q");
    } else {
      url.searchParams.set("q", value);
    }
    window.history.replaceState({}, "", url);
  };

  const isHomePage = () =>
    window.location.pathname === "/" ||
    window.location.pathname.endsWith("/index.html");

  const SEARCH_MIN_INTERVAL_MS = 750;
  const SEARCH_WINDOW_MS = 5000;
  const SEARCH_MAX_PER_WINDOW = 20;

  const canRunSearch = () => {
    const now = Date.now();
    const sinceLast = now - state.lastSearchAt;
    if (sinceLast < SEARCH_MIN_INTERVAL_MS) {
      return false;
    }
    const windowAge = now - state.searchWindowStart;
    if (!state.searchWindowStart || windowAge > SEARCH_WINDOW_MS) {
      state.searchWindowStart = now;
      state.searchCount = 0;
    }
    state.searchCount += 1;
    state.lastSearchAt = now;
    return state.searchCount <= SEARCH_MAX_PER_WINDOW;
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPage);
  } else {
    initPage();
  }
})();
