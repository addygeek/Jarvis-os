import { cosineSimilarity, embedText } from "./embeddings.js";
export class InMemoryVectorStore {
    backend = "memory";
    docs = new Map();
    upsert(doc) {
        const record = {
            ...doc,
            embedding: doc.embedding ?? embedText(doc.text),
            createdAt: new Date().toISOString(),
        };
        this.docs.set(doc.id, record);
        return record;
    }
    search(query, limit = 5) {
        const queryEmbedding = embedText(query);
        const hits = [];
        for (const doc of this.docs.values()) {
            hits.push({
                id: doc.id,
                text: doc.text,
                score: cosineSimilarity(queryEmbedding, doc.embedding),
                metadata: doc.metadata,
            });
        }
        return hits.sort((a, b) => b.score - a.score).slice(0, limit);
    }
    count() {
        return this.docs.size;
    }
    clear() {
        this.docs.clear();
    }
}
/**
 * Vector store factory. Uses in-memory stub by default.
 * Set JARVIS_VECTOR_BACKEND=lancedb to attempt LanceDB (requires @lancedb/lancedb).
 */
export async function createVectorStore() {
    if (process.env.JARVIS_VECTOR_BACKEND !== "lancedb") {
        return new InMemoryVectorStore();
    }
    try {
        const lance = await import("@lancedb/lancedb");
        const lancePath = process.env.LANCE_DB_PATH ?? "./database/lance";
        const db = await lance.connect(lancePath);
        const tableName = "knowledge_chunks";
        let table = await db.openTable(tableName).catch(() => null);
        if (!table) {
            await db.createTable(tableName, [
                {
                    id: "seed",
                    text: "seed",
                    metadata: "{}",
                    vector: embedText("seed"),
                    createdAt: new Date().toISOString(),
                },
            ]);
            table = await db.openTable(tableName);
            await table.delete('id = "seed"');
        }
        return new InMemoryVectorStore();
    }
    catch (err) {
        console.warn("[rag] LanceDB init failed, using in-memory:", err);
        return new InMemoryVectorStore();
    }
}
//# sourceMappingURL=vector-store.js.map