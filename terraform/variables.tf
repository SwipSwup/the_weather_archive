variable "aws_region" {
  description = "AWS Region"
  default     = "us-east-1"
}

variable "db_username" {
  description = "Database master username"
  default     = "postgres"
}

variable "db_password" {
  description = "Database master password"
  sensitive   = true
  default     = "postgres_password_123" # Change for real deployment
}

variable "redis_url" {
  description = "Redis connection string"
  default     = "redis://localhost:6379" # Placeholder
}
