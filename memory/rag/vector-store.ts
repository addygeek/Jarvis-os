import { cosineSimilarity, embedText } from "./embeddings.js";

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
  upsert(doc: Omit<VectorDocument, "embedding" | "createdAt"> & { embedding?: number[] }): VectorDocument;
  search(query: string, limit?: number): VectorSearchHit[];
  count(): number;
  clear(): void;
}

export class InMemoryVectorStore implements VectorStore {
  readonly backend = "memory" as const;
  private readonly docs = new Map<string, VectorDocument>();

  upsert(
    doc: Omit<VectorDocument, "embedding" | "createdAt"> & { embedding?: number[] },
  ): VectorDocument {
    const record: VectorDocument = {
      ...doc,
      embedding: doc.embedding ?? embedText(doc.text),
      createdAt: new Date().toISOString(),
    };
    this.docs.set(doc.id, record);
    return record;
  }

  search(query: string, limit = 5): VectorSearchHit[] {
    const queryEmbedding = embedText(query);
    const hits: VectorSearchHit[] = [];

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

  count(): number {
    return this.docs.size;
  }

  clear(): void {
    this.docs.clear();
  }
}

/** In-memory vector stub. Set JARVIS_VECTOR_BACKEND=lancedb when LanceDB adapter is added. */
export async function createVectorStore(): Promise<VectorStore> {
  if (process.env.JARVIS_VECTOR_BACKEND === "lancedb") {
    console.warn("[rag] LanceDB backend requested but not installed; using in-memory store.");
  }
  return new InMemoryVectorStore();
}
