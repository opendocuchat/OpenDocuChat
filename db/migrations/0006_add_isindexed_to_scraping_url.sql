ALTER TABLE scraping_url ADD COLUMN is_indexed BOOLEAN NOT NULL;

ALTER TABLE scraping_url ADD CONSTRAINT unique_indexed_url UNIQUE (url) WHERE is_indexed = TRUE;

UPDATE scraping_url SET is_indexed = FALSE;