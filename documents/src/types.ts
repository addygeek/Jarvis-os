export interface SummaryResult {
  summary: string;
  keyFindings: string[];
  researchGaps: string[];
  /** Source paths included in this run */
  sources: string[];
}

export interface ExtractedDocument {
  path: string;
  text: string;
  pageCount?: number;
}
