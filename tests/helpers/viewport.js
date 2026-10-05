// jsdom has no layout and no window.matchMedia, which is why every other test in the suite sees
// the desktop layout (hooks/useIsMobile.js treats "no matchMedia" as "not mobile"). A test that
// needs a particular width calls setViewportWidth() — it installs a matchMedia that answers
// (max-width: Npx) / (min-width: Npx) queries for that width — and resetViewport() afterwards.
export function setViewportWidth(width) {
  window.innerWidth = width;
  window.matchMedia = (query) => {
    const max = /\(max-width:\s*([\d.]+)px\)/.exec(query);
    const min = /\(min-width:\s*([\d.]+)px\)/.exec(query);
    const matches = (max ? width <= Number(max[1]) : true) && (min ? width >= Number(min[1]) : true);
    return {
      matches,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    };
  };
}

export function resetViewport() {
  delete window.matchMedia;
  window.innerWidth = 1024;
}
