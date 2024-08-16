ALTER TABLE data_source RENAME COLUMN starting_url TO url;

CREATE TYPE data_source_type AS ENUM ('public_repo', 'docu_scrape');

ALTER TABLE data_source ADD COLUMN type data_source_type NOT NULL