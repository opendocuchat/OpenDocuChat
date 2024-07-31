export type DocumentStatus = 'ACTIVE' | 'HIDDEN';

export interface Document {
  id: number;
  url: string | null;
  content: string | null;
  status: DocumentStatus;
  metadata: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
}

export type ScrapingStatus = 'QUEUED' | 'PROCESSING' | 'CANCELLED' | 'COMPLETED' | 'FAILED';

export interface ScrapingQueueItem {
  id: number;
  url: string;
  document_id: number | null;
  status: ScrapingStatus;
  created_at: Date;
  updated_at: Date;
}

// ToDo: extend & update based on initial db migration