import { randomUUID } from "node:crypto";
import { createVectorStore, type VectorSearchHit, type VectorStore } from "./vector-store.js";

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

const CHUNK_SIZE = 800;

function chunkText(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= CHUNK_SIZE) return [trimmed];

  const chunks: string[] = [];
  let start = 0;
  while (start < trimmed.length) {
    let end = Math.min(start + CHUNK_SIZE, trimmed.length);
    if (end < trimmed.length) {
      const breakAt = trimmed.lastIndexOf("\n\n", end);
      if (breakAt > start + CHUNK_SIZE / 2) end = breakAt;
    }
    chunks.push(trimmed.slice(start, end).trim());
    start = end;
  }
  return chunks.filter(Boolean);
}

let storePromise: Promise<VectorStore> | null = null;

async function getStore(): Promise<VectorStore> {
  if (!storePromise) {
    storePromise = createVectorStore();
  }
  return storePromise;
}

export async function ingestDocument(input: IngestInput): Promise<IngestResult> {
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

export async function queryKnowledge(
  query: string,
  limit = 5,
): Promise<QueryResult> {
  const store = await getStore();
  const hits = store.search(query, limit);
  return { query, hits, backend: store.backend };
}

export async function getKnowledgeStats(): Promise<{ documentCount: number; backend: string }> {
  const store = await getStore();
  return { documentCount: store.count(), backend: store.backend };
}

/** Reset singleton (tests). */
export function resetKnowledgeStore(): void {
  storePromise = null;
}
