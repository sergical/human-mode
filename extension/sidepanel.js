const API_BASE = "https://human-mode.s-a62.workers.dev";
const content = document.getElementById("content");

const params = new URLSearchParams(window.location.search);
const pageUrl = params.get("url") || "";

const locale = (() => {
  const lang = navigator.language?.split("-")[0];
  return ["en", "es", "uk", "hi", "fr"].includes(lang) ? lang : "en";
})();

function clearContent() {
  while (content.firstChild) content.removeChild(content.firstChild);
}

function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k.startsWith("on") && typeof v === "function") {
        node.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (k === "className") {
        node.className = v;
      } else {
        node.setAttribute(k, v);
      }
    }
  }
  for (const c of children) {
    if (typeof c === "string") node.appendChild(document.createTextNode(c));
    else if (c) node.appendChild(c);
  }
  return node;
}

// If we have a URL, show the analyze UI
if (pageUrl && !pageUrl.startsWith("chrome://") && !pageUrl.startsWith("chrome-extension://")) {
  clearContent();
  content.appendChild(el("div", { className: "url-display" }, pageUrl));
  content.appendChild(
    el("button", { className: "btn", onClick: () => analyzeUrl(pageUrl) }, "Make it human")
  );
} else {
  clearContent();
  content.appendChild(
    el("p", { className: "subtitle" }, "Navigate to a confusing webpage, then click the Human Mode icon.")
  );
}

async function analyzeUrl(url) {
  clearContent();
  content.appendChild(el("div", { className: "url-display" }, url));
  content.appendChild(
    el("div", { className: "loading-bar" },
      el("div", { className: "loading-bar-inner" })
    )
  );
  content.appendChild(
    el("p", { className: "subtitle", style: "text-align:center" }, "Reading the page...")
  );

  // Open the Human Mode web app with the URL pre-filled
  // The simplest and most reliable approach — no CORS issues
  const targetUrl = `${API_BASE}/?prefill=${encodeURIComponent(url)}&locale=${locale}`;

  clearContent();
  const iframe = document.createElement("iframe");
  iframe.src = targetUrl;
  iframe.style.cssText = "width:100%;height:100vh;border:none;";
  iframe.sandbox = "allow-scripts allow-same-origin allow-forms allow-popups";
  content.appendChild(iframe);
}
