CREATE TABLE account (
    id SERIAL PRIMARY KEY,
    github_id BIGINT UNIQUE,
    github_username TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);