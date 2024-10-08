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
  ASSISTANT = "BOT",
}

export interface Message {
  id: number;
  chat_id: number;
  sender: MessageSender;
  content: string;
  document_ids: number[] | null;
  created_at: Date;
}

export interface Chat {
  id: number;
  created_at: Date;
}

export interface ChatSetting {
  id: number;
  system_prompt: string;
  updated_at: Date;
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
  QUEUED = "QUEUED",
  PROCESSING = "PROCESSING",
  CANCELLED = "CANCELLED",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export type IndexingStatus =
  | "NOT_INDEXED"
  | "QUEUED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export interface ScrapingUrl {
  id: number;
  scraping_run_id: number;
  url: string;
  status: ScrapingStatus;
  indexing_status: IndexingStatus;
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

export interface Account {
  id: number;
  github_id: number;
  github_username: string;
  created_at: Date;
}
