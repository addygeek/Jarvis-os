import { type VectorSearchHit } from "./vector-store.js";
export interface IngestInput {
    text: string;
    source?: string;
    title?: string;
    tags?: string[];
}
export interface IngestResult {
    id: string;
    chunks: number;
    backend: string;
}
export interface QueryResult {
    query: string;
    hits: VectorSearchHit[];
    backend: string;
}
export declare function ingestDocument(input: IngestInput): Promise<IngestResult>;
export declare function queryKnowledge(query: string, limit?: number): Promise<QueryResult>;
export declare function getKnowledgeStats(): Promise<{
    documentCount: number;
    backend: string;
}>;
/** Reset singleton (tests). */
export declare function resetKnowledgeStore(): void;
//# sourceMappingURL=knowledge-base.d.ts.map