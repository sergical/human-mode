import puppeteer from "@cloudflare/puppeteer";
import type { PageSnapshot } from "../shared/human-mode";

export async function capturePageContext(
  url: string,
  env: Env
): Promise<PageSnapshot> {
  // Use Browser Rendering when available, fall back to HTTP fetch
  if (env.BROWSER_RENDERING) {
    try {
      return await captureWithBrowser(url, env);
    } catch (error) {
      console.warn("Browser Rendering failed, falling back to HTTP fetch:", error);
    }
  }

  try {
    return await captureWithFetch(url);
  } catch (error) {
    // If fetch times out or fails, return a minimal snapshot from the URL alone
    const hostname = new URL(url).hostname;
    return {
      url,
      title: hostname,
      summary: `Page at ${hostname}. The site took too long to load fully, so this guide is based on the URL and common patterns for this type of site.`,
      excerpt: "",
      headings: [],
      sourceType: "http-fetch",
      warning: "The page could not be fully loaded. The guide is based on limited information.",
    };
  }
}

async function captureWithBrowser(
  url: string,
  env: Env
): Promise<PageSnapshot> {
  const browser = await puppeteer.launch(env.BROWSER_RENDERING);
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10_000 });

  const extracted = await page.evaluate(() => {
    const title = document.title || "";
    const description =
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content") || "";
    const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
      .map((el) => el.textContent?.trim() || "")
      .filter(Boolean)
      .slice(0, 6);
    const paragraphs = Array.from(document.querySelectorAll("p"))
      .map((el) => el.textContent?.trim() || "")
      .filter((t) => t.length > 40)
      .slice(0, 8);
    return { title, description, headings, paragraphs };
  });

  await browser.close();

  const excerpt = extracted.paragraphs.slice(0, 5).join(" ").slice(0, 900);
  const summary =
    extracted.description ||
    firstSentence(excerpt) ||
    "Page loaded via browser rendering.";

  return {
    url,
    title: extracted.title || new URL(url).hostname,
    summary,
    excerpt,
    headings: extracted.headings,
    sourceType: "browser-rendering",
    warning: null,
  };
}

async function captureWithFetch(url: string): Promise<PageSnapshot> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  const response = await fetch(url, {
    headers: {
      "user-agent":
        "HumanModeBot/0.1 (+https://github.com/sergical/human-mode)",
      accept: "text/html,application/xhtml+xml",
    },
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    throw new Error(
      `Could not load page: ${response.status} ${response.statusText}`
    );
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
    "This page loaded but may need browser rendering for full content.";

  return {
    url,
    title,
    summary,
    excerpt,
    headings,
    sourceType: "http-fetch",
    warning:
      "This page was captured via direct HTML fetch. Dynamic or JS-rendered content may be missing.",
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
