CREATE TYPE scraping_url_status AS ENUM ('QUEUED', 'PROCESSING', 'CANCELLED', 'COMPLETED', 'FAILED');

CREATE TABLE scraping_url (
  id SERIAL PRIMARY KEY,
  scraping_run_id INT NOT NULL REFERENCES scraping_run(id),
  url TEXT NOT NULL,
  status scraping_url_status NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE scraping_run (
  id SERIAL PRIMARY KEY,
  data_source_id INT NOT NULL REFERENCES data_source(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);