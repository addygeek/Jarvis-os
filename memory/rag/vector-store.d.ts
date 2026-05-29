export interface VectorDocument {
    id: string;
    text: string;
    metadata: Record<string, string>;
    embedding: number[];
    createdAt: string;
}
export interface VectorSearchHit {
    id: string;
    text: string;
    score: number;
    metadata: Record<string, string>;
}
export interface VectorStore {
    readonly backend: "memory" | "lancedb";
    upsert(doc: Omit<VectorDocument, "embedding" | "createdAt"> & {
        embedding?: number[];
    }): VectorDocument;
    search(query: string, limit?: number): VectorSearchHit[];
    count(): number;
    clear(): void;
}
export declare class InMemoryVectorStore implements VectorStore {
    readonly backend: "memory";
    private readonly docs;
    upsert(doc: Omit<VectorDocument, "embedding" | "createdAt"> & {
        embedding?: number[];
    }): VectorDocument;
    search(query: string, limit?: number): VectorSearchHit[];
    count(): number;
    clear(): void;
}
/**
 * Vector store factory. Uses in-memory stub by default.
 * Set JARVIS_VECTOR_BACKEND=lancedb to attempt LanceDB (requires @lancedb/lancedb).
 */
export declare function createVectorStore(): Promise<VectorStore>;
//# sourceMappingURL=vector-store.d.ts.map