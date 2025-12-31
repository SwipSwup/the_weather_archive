variable "bucket_suffix" {}

resource "aws_s3_bucket" "raw_images" {
  bucket        = "weather-archive-raw-${var.bucket_suffix}"
  force_destroy = true
}

resource "aws_s3_bucket" "processed_images" {
  bucket        = "weather-archive-processed-${var.bucket_suffix}"
  force_destroy = true
}

resource "aws_s3_bucket" "videos" {
  bucket        = "weather-archive-videos-${var.bucket_suffix}"
  force_destroy = true
}

output "raw_bucket_arn" {
  value = aws_s3_bucket.raw_images.arn
}

output "raw_bucket_id" {
  value = aws_s3_bucket.raw_images.id
}

output "processed_bucket_arn" {
  value = aws_s3_bucket.processed_images.arn
}

output "processed_bucket_name" {
  value = aws_s3_bucket.processed_images.bucket
}

output "videos_bucket_arn" {
  value = aws_s3_bucket.videos.arn
}

output "videos_bucket_name" {
  value = aws_s3_bucket.videos.bucket
}

output "raw_bucket_name" {
  value = aws_s3_bucket.raw_images.bucket
}
