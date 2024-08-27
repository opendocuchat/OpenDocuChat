export type DataSourceType = "public_repo" | "docu_scrape";

export interface DataSource {
  id: number;
  name: string;
  url: string;
  type: DataSourceType;
}

export interface Document {
  id: number;
  url: string;
  content: string;
  embedding: number[];
  active: boolean;
  metadata: Record<string, any>;
  data_source_id: number;
  created_at: Date;
}

export enum MessageSender {
  USER = "USER",
  ASSISTANT = "ASSISTANT",
}

export interface Message {
  id: number;
  chat_id: number;
  sender: MessageSender;
  content: string;
  document_ids: number[] | null;
  created_at: Date;
}

export interface Citation {
  id: number;
  message_id: number;
  document_id: number;
  highlight_start_index: number;
  highlight_end_index: number;
}

export enum ScrapingStatus {
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface ScrapingUrl {
  id: number;
  scraping_run_id: number;
  url: string;
  status: ScrapingStatus;
  is_indexed: boolean;
  content: string;
  created_at: Date;
  updated_at: Date;
}

export interface ScrapingRun {
  id: number;
  data_source_id: number;
  status: ScrapingStatus;
  created_at: Date;
}