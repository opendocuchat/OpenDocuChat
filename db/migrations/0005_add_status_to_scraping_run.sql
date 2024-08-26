ALTER TYPE scraping_url_status RENAME TO scraping_status;

ALTER TABLE scraping_run ADD COLUMN status scraping_status;

UPDATE scraping_run SET status = 'COMPLETED';

ALTER TABLE scraping_run ALTER COLUMN status SET NOT NULL;