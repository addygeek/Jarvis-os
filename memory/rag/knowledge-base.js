import { randomUUID } from "node:crypto";
import { createVectorStore } from "./vector-store.js";
const CHUNK_SIZE = 800;
function chunkText(text) {
    const trimmed = text.trim();
    if (!trimmed)
        return [];
    if (trimmed.length <= CHUNK_SIZE)
        return [trimmed];
    const chunks = [];
    let start = 0;
    while (start < trimmed.length) {
        let end = Math.min(start + CHUNK_SIZE, trimmed.length);
        if (end < trimmed.length) {
            const breakAt = trimmed.lastIndexOf("\n\n", end);
            if (breakAt > start + CHUNK_SIZE / 2)
                end = breakAt;
        }
        chunks.push(trimmed.slice(start, end).trim());
        start = end;
    }
    return chunks.filter(Boolean);
}
let storePromise = null;
async function getStore() {
    if (!storePromise) {
        storePromise = createVectorStore();
    }
    return storePromise;
}
export async function ingestDocument(input) {
    const store = await getStore();
    const chunks = chunkText(input.text);
    const source = input.source ?? "manual";
    const title = input.title ?? source;
    for (const chunk of chunks) {
        store.upsert({
            id: randomUUID(),
            text: chunk,
            metadata: {
                source,
                title,
                tags: (input.tags ?? []).join(","),
            },
        });
    }
    return { id: randomUUID(), chunks: chunks.length, backend: store.backend };
}
export async function queryKnowledge(query, limit = 5) {
    const store = await getStore();
    const hits = store.search(query, limit);
    return { query, hits, backend: store.backend };
}
export async function getKnowledgeStats() {
    const store = await getStore();
    return { documentCount: store.count(), backend: store.backend };
}
/** Reset singleton (tests). */
export function resetKnowledgeStore() {
    storePromise = null;
}
//# sourceMappingURL=knowledge-base.js.map