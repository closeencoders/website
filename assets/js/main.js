(() => {
  const state = {
    posts: [],
    postsLoaded: false,
  };

  const injectHtml = async (targetId, path) => {
    const target = document.getElementById(targetId);
    if (!target) {
      return;
    }

    try {
      const response = await fetch(path, { cache: "no-store" });
            if (!response.ok) {
                throw new Error(`Failed to load ${path}: ${response.status}`);
            }
            const html = await response.text();
            target.innerHTML = html;
        } catch (error) {
            console.error(error);
        }
    };

  const injectParts = () => {
    void injectHtml("header-space", "/components/header.html");
    void injectHtml("footer-space", "/components/footer.html");
    void injectPosts();
    setupPostSearch();
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
      renderPosts(posts);
    } catch (error) {
      console.error(error);
    }
  };

  const renderPosts = (posts) => {
    const target = document.getElementById("posts-list");
    if (!target) {
      return;
    }

    if (!Array.isArray(posts) || posts.length === 0) {
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

  const setupPostSearch = () => {
    const input = document.getElementById("posts-search-input");
    const button = document.getElementById("posts-search-button");
    const reset = document.getElementById("posts-reset-button");
    if (!input) {
      return;
    }

    const runSearch = () => {
      if (!state.postsLoaded) {
        return;
      }
      const query = input.value.trim().toLowerCase();
      if (!query) {
        renderPosts(state.posts);
        return;
      }
      const filtered = state.posts.filter((post) => {
        const title = (post.title || "").toLowerCase();
        const description = (post.description || "").toLowerCase();
        const slug = (post.slug || "").toLowerCase();
        return (
          title.includes(query) ||
          description.includes(query) ||
          slug.includes(query)
        );
      });
      renderPosts(filtered);
    };

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
        renderPosts(state.posts);
      });
    }
  };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", injectParts);
    } else {
        injectParts();
    }
})();
