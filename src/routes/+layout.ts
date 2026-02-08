// This IDE is essentially a single-page app.
// Disable SSR so token parsing + API calls only happen in the browser.
export const ssr = false;
export const prerender = true;
