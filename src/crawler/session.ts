import fs from "fs";
import path from "path";
import { PageData, CrawlOptions, CrawlSessionSummary } from "./types";

export interface CrawlSession {
  id: string;
  rootUrl: string;
  startTime: string;
  endTime?: string;
  durationMs: number;
  options: CrawlOptions;
  pages: Record<string, PageData>;
  errors: { url: string; error: string; statusCode?: number }[];
}

const sessionsMemory = new Map<string, CrawlSession>();
let latestSessionId: string | null = null;

const CACHE_DIR = path.resolve(__dirname, "../../.cache/sessions");

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

export function saveSession(session: CrawlSession): void {
  sessionsMemory.set(session.id, session);
  latestSessionId = session.id;

  try {
    ensureCacheDir();
    const filePath = path.join(CACHE_DIR, `${session.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2), "utf-8");
  } catch (err) {
    // Ignore cache write error
  }
}

export function getSession(id?: string): CrawlSession | null {
  const targetId = id || latestSessionId;
  if (!targetId) return null;

  if (sessionsMemory.has(targetId)) {
    return sessionsMemory.get(targetId)!;
  }

  try {
    const filePath = path.join(CACHE_DIR, `${targetId}.json`);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as CrawlSession;
      sessionsMemory.set(data.id, data);
      return data;
    }
  } catch (err) {
    // Ignore read error
  }

  return null;
}

export function getLatestSessionId(): string | null {
  if (latestSessionId && sessionsMemory.has(latestSessionId)) {
    return latestSessionId;
  }
  try {
    if (fs.existsSync(CACHE_DIR)) {
      const files = fs.readdirSync(CACHE_DIR)
        .filter(f => f.endsWith(".json"))
        .map(f => ({
          name: f,
          time: fs.statSync(path.join(CACHE_DIR, f)).mtimeMs
        }))
        .sort((a, b) => b.time - a.time);
      if (files.length > 0) {
        latestSessionId = files[0].name.replace(".json", "");
        return latestSessionId;
      }
    }
  } catch {}
  return latestSessionId;
}

export function listSessions(): CrawlSessionSummary[] {
  // Ensure disk sessions are populated if memory is empty
  try {
    if (fs.existsSync(CACHE_DIR)) {
      const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith(".json"));
      for (const file of files) {
        const id = file.replace(".json", "");
        if (!sessionsMemory.has(id)) {
          getSession(id);
        }
      }
    }
  } catch {}

  const list: CrawlSessionSummary[] = [];
  for (const session of sessionsMemory.values()) {
    const statusBreakdown: Record<number, number> = {};
    for (const page of Object.values(session.pages)) {
      statusBreakdown[page.statusCode] = (statusBreakdown[page.statusCode] || 0) + 1;
    }

    list.push({
      id: session.id,
      rootUrl: session.rootUrl,
      startTime: session.startTime,
      endTime: session.endTime,
      totalPagesCrawled: Object.keys(session.pages).length,
      totalErrors: session.errors.length,
      durationMs: session.durationMs,
      options: session.options,
      statusBreakdown
    });
  }
  return list;
}

