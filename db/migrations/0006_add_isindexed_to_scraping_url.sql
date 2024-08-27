ALTER TABLE scraping_url ADD COLUMN is_indexed BOOLEAN;

UPDATE scraping_url SET is_indexed = FALSE;

ALTER TABLE scraping_url ALTER COLUMN is_indexed SET NOT NULL;

-- Exclusion constraint to ensure uniqueness of indexed URLs
ALTER TABLE scraping_url ADD CONSTRAINT unique_indexed_url EXCLUDE USING btree (url WITH =) WHERE (is_indexed = TRUE);