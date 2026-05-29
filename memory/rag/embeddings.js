import { createHash } from "node:crypto";
const DIM = 64;
/** Deterministic pseudo-embedding for local stub RAG (no external model). */
export function embedText(text) {
    const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
    const vector = new Array(DIM).fill(0);
    for (const token of normalized.split(/\W+/).filter(Boolean)) {
        const hash = createHash("sha256").update(token).digest();
        for (let i = 0; i < DIM; i++) {
            const byte = hash[i % hash.length] ?? 0;
            vector[i] = (vector[i] ?? 0) + (byte / 255 - 0.5) / Math.sqrt(token.length + 1);
        }
    }
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
    return vector.map((v) => v / norm);
}
export function cosineSimilarity(a, b) {
    let dot = 0;
    let na = 0;
    let nb = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    return denom === 0 ? 0 : dot / denom;
}
//# sourceMappingURL=embeddings.js.map