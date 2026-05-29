/** Optional LanceDB backend — install @lancedb/lancedb when using JARVIS_VECTOR_BACKEND=lancedb */
declare module "@lancedb/lancedb" {
  export function connect(uri: string): Promise<{
    openTable(name: string): Promise<unknown>;
    createTable(name: string, data: unknown[]): Promise<unknown>;
  }>;
}
