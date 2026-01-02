variable "aws_region" {
  description = "AWS Region"
  default     = "us-east-1"
}

variable "api_key" {
  description = "API Key for authentication"
  default     = "secret-key-123" # In production, verify this is passed safely
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
  default     = "redis://default:mi8lzOIcZjsWXMEXUavzwZElRO8ts1T2@redis-16732.c57.us-east-1-4.ec2.cloud.redislabs.com:16732" # Placeholder
}

variable "ffmpeg_layer_arn" {
  description = "ARN of the FFmpeg Lambda Layer. Leave empty if none."
  default     = "arn:aws:lambda:us-east-1:145266761615:layer:ffmpeg:4"
}
