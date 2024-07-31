create extension vector;

CREATE TABLE document (
  id SERIAL PRIMARY KEY,
  url TEXT UNIQUE,
  content TEXT,
  embedding vector(1024),
  active BOOLEAN,
  metadata JSONB,
  data_source_id INT NOT NULL REFERENCES data_source(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
);

CREATE TABLE data_source (
  id SERIAL PRIMARY KEY,
  starting_url TEXT NOT NULL,
);

CREATE TYPE message_sender AS ENUM ('USER', 'BOT');

CREATE TABLE message (
  id SERIAL PRIMARY KEY,
  chat_id INT NOT NULL,
  sender message_sender NOT NULL,
  content TEXT,
  document_ids INT[],
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
);

CREATE TABLE citation (
  id SERIAL PRIMARY KEY,
  message_id INT NOT NULL REFERENCES message(id),
  document_id INT NOT NULL REFERENCES document(id),
  highlight_start_index INT,
  highlight_end_index INT,
);

-- CREATE TYPE scraping_url_status AS ENUM ('URL_FOUND', 'PROCESSING', 'CANCELLED', 'COMPLETED', 'FAILED');

-- CREATE TABLE scraping_url (
--   id SERIAL PRIMARY KEY,
--   scraping_run INT NOT NULL REFERENCES scraping_run(id),
--   url TEXT NOT NULL,
--   status scraping_url_status NOT NULL,
--   created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
--   updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE TABLE scraping_run (
--   id SERIAL PRIMARY KEY,
--   data_source_id INT NOT NULL REFERENCES data_source(id),
--   created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
-- );