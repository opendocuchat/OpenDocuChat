ALTER TYPE scraping_status RENAME VALUE 'COMPLETED' TO 'SCRAPED';

UPDATE scraping_url
SET status = 'SCRAPED'
WHERE status = 'COMPLETED';

UPDATE scraping_run
SET status = 'SCRAPED'
WHERE status = 'COMPLETED';

ALTER TYPE scraping_status ADD VALUE 'INDEXED';