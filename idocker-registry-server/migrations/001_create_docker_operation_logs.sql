-- Create Docker operation logs table
CREATE TABLE IF NOT EXISTS docker_operation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  username VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,
  repository VARCHAR(255),
  tag VARCHAR(255),
  status VARCHAR(20) NOT NULL, -- 'success', 'error', 'unauthorized', 'authorized'
  ip_address VARCHAR(45),
  user_agent TEXT,
  error_message TEXT,
  additional_data TEXT, -- JSON format for additional data
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for user_id
CREATE INDEX IF NOT EXISTS idx_docker_logs_user_id ON docker_operation_logs(user_id);

-- Create index for action
CREATE INDEX IF NOT EXISTS idx_docker_logs_action ON docker_operation_logs(action);

-- Create index for repository
CREATE INDEX IF NOT EXISTS idx_docker_logs_repository ON docker_operation_logs(repository);

-- Create index for created_at
CREATE INDEX IF NOT EXISTS idx_docker_logs_created_at ON docker_operation_logs(created_at);

-- Create composite index for user_id + created_at
CREATE INDEX IF NOT EXISTS idx_docker_logs_user_created_at ON docker_operation_logs(user_id, created_at);