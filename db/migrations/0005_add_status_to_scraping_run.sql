ALTER TYPE scraping_url_status RENAME TO scraping_status;

ALTER TABLE scraping_run ADD COLUMN status scraping_status NOT NULL;