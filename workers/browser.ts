import type { PageSnapshot } from "../shared/human-mode";

export async function capturePageContext(
  url: string,
  env: Env
): Promise<PageSnapshot> {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "HumanModeBot/0.1 (+https://github.com/sergical/human-mode)",
      accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`Could not load page: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const title = extractTitle(html) || new URL(url).hostname;
  const description = extractMetaDescription(html);
  const headings = extractHeadings(html);
  const paragraphs = extractParagraphs(html);
  const excerpt = paragraphs.slice(0, 5).join(" ").slice(0, 900);
  const summary =
    description ||
    firstSentence(excerpt) ||
    "This page loaded, but the scaffold still needs a richer extraction pass.";

  return {
    url,
    title,
    summary,
    excerpt,
    headings,
    sourceType: "http-fetch",
    warning: env.BROWSER_RENDERING
      ? "Browser Rendering is configured in Wrangler, but this first scaffold still uses a direct HTML fetch. Swap in a Puppeteer capture next for screenshots and dynamic content."
      : "Browser Rendering is not available in this environment yet. Dynamic or logged-in pages may need a richer capture step.",
  };
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? cleanupText(match[1]) : null;
}

function extractMetaDescription(html: string): string | null {
  const match = html.match(
    /<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["'][^>]*>/i
  );
  return match ? cleanupText(match[1]) : null;
}

function extractHeadings(html: string): string[] {
  return [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
    .map((match) => cleanupText(match[1]))
    .filter(Boolean)
    .slice(0, 6);
}

function extractParagraphs(html: string): string[] {
  return [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => cleanupText(match[1]))
    .filter((text) => text.length > 40)
    .slice(0, 8);
}

function firstSentence(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  const sentenceMatch = trimmed.match(/^(.+?[.!?])(\s|$)/);
  return sentenceMatch ? sentenceMatch[1] : trimmed.slice(0, 220);
}

function cleanupText(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
