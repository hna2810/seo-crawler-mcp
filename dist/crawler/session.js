"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveSession = saveSession;
exports.getSession = getSession;
exports.getLatestSessionId = getLatestSessionId;
exports.listSessions = listSessions;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sessionsMemory = new Map();
let latestSessionId = null;
const CACHE_DIR = path_1.default.resolve(__dirname, "../../.cache/sessions");
function ensureCacheDir() {
    if (!fs_1.default.existsSync(CACHE_DIR)) {
        fs_1.default.mkdirSync(CACHE_DIR, { recursive: true });
    }
}
function saveSession(session) {
    sessionsMemory.set(session.id, session);
    latestSessionId = session.id;
    try {
        ensureCacheDir();
        const filePath = path_1.default.join(CACHE_DIR, `${session.id}.json`);
        fs_1.default.writeFileSync(filePath, JSON.stringify(session, null, 2), "utf-8");
    }
    catch (err) {
        // Ignore cache write error
    }
}
function getSession(id) {
    const targetId = id || latestSessionId;
    if (!targetId)
        return null;
    if (sessionsMemory.has(targetId)) {
        return sessionsMemory.get(targetId);
    }
    try {
        const filePath = path_1.default.join(CACHE_DIR, `${targetId}.json`);
        if (fs_1.default.existsSync(filePath)) {
            const data = JSON.parse(fs_1.default.readFileSync(filePath, "utf-8"));
            sessionsMemory.set(data.id, data);
            return data;
        }
    }
    catch (err) {
        // Ignore read error
    }
    return null;
}
function getLatestSessionId() {
    if (latestSessionId && sessionsMemory.has(latestSessionId)) {
        return latestSessionId;
    }
    try {
        if (fs_1.default.existsSync(CACHE_DIR)) {
            const files = fs_1.default.readdirSync(CACHE_DIR)
                .filter(f => f.endsWith(".json"))
                .map(f => ({
                name: f,
                time: fs_1.default.statSync(path_1.default.join(CACHE_DIR, f)).mtimeMs
            }))
                .sort((a, b) => b.time - a.time);
            if (files.length > 0) {
                latestSessionId = files[0].name.replace(".json", "");
                return latestSessionId;
            }
        }
    }
    catch { }
    return latestSessionId;
}
function listSessions() {
    // Ensure disk sessions are populated if memory is empty
    try {
        if (fs_1.default.existsSync(CACHE_DIR)) {
            const files = fs_1.default.readdirSync(CACHE_DIR).filter(f => f.endsWith(".json"));
            for (const file of files) {
                const id = file.replace(".json", "");
                if (!sessionsMemory.has(id)) {
                    getSession(id);
                }
            }
        }
    }
    catch { }
    const list = [];
    for (const session of sessionsMemory.values()) {
        const statusBreakdown = {};
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
