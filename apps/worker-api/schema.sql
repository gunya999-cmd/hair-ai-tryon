CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  original_key TEXT NOT NULL,
  status TEXT NOT NULL,
  requested_styles TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS results (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  style TEXT NOT NULL,
  liked INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY(job_id) REFERENCES jobs(id)
);
