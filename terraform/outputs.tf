output "s3_bucket_raw" {
  value = module.storage.raw_bucket_name
}

output "s3_bucket_processed" {
  value = module.storage.processed_bucket_name
}

output "s3_bucket_videos" {
  value = module.storage.videos_bucket_name
}

output "rds_endpoint" {
  value = module.database.db_endpoint
}

output "rds_username" {
  value = module.database.db_username
}

output "rds_db_name" {
  value = module.database.db_name
}

output "api_endpoint" {
  value = module.api.api_endpoint
}
