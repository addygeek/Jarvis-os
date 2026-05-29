/**
 * Future RAG vector store stub (LanceDB or Qdrant).
 * MVP uses SQLite + documents/ for paths and summaries; vectors are not indexed yet.
 */

export interface VectorDocument {
  id: string;
  path: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface VectorSearchResult {
  id: string;
  path: string;
  score: number;
  snippet: string;
}

export interface VectorStore {
  readonly provider: "lancedb" | "qdrant" | "noop";
  upsert(documents: VectorDocument[]): Promise<void>;
  search(query: string, limit?: number): Promise<VectorSearchResult[]>;
  deleteByPath(path: string): Promise<void>;
}

/**
 * No-op implementation until LanceDB or Qdrant is wired.
 * See memory/README.md for planned integration.
 */
export class NoopVectorStore implements VectorStore {
  readonly provider = "noop" as const;

  async upsert(_documents: VectorDocument[]): Promise<void> {
    /* MVP: embeddings not persisted */
  }

  async search(_query: string, _limit = 10): Promise<VectorSearchResult[]> {
    return [];
  }

  async deleteByPath(_path: string): Promise<void> {
    /* no-op */
  }
}

export const vectorStore: VectorStore = new NoopVectorStore();
