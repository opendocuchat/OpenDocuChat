CREATE TYPE indexing_status AS ENUM (
    'NOT_INDEXED',
    'QUEUED',
    'PROCESSING',
    'COMPLETED',
    'FAILED'
);

ALTER TABLE scraping_url
ADD COLUMN indexing_status indexing_status NOT NULL DEFAULT 'NOT_INDEXED';

UPDATE scraping_url
SET indexing_status = CASE
    WHEN is_indexed = true THEN 'COMPLETED'::indexing_status
    ELSE 'NOT_INDEXED'::indexing_status
END;

ALTER TABLE scraping_url
DROP CONSTRAINT unique_indexed_url;

ALTER TABLE scraping_url
ADD CONSTRAINT unique_indexed_url UNIQUE (url, indexing_status);

ALTER TABLE scraping_url
DROP COLUMN is_indexed;