variable "raw_bucket_name" {}
variable "processed_bucket_name" {}
variable "videos_bucket_name" {}
variable "raw_bucket_arn" {}
variable "processed_bucket_arn" {}
variable "videos_bucket_arn" {}
variable "raw_bucket_id" {}
variable "db_address" {}
variable "db_username" {}
variable "db_password" {}
variable "db_name" {}
variable "redis_url" {}

# --- IAM Role ---
data "aws_iam_role" "lab_role" {
  name = "LabRole"
}

# --- Lambda Archives ---
data "archive_file" "api_service_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../../../backend/api_service"
  output_path = "${path.module}/api_service.zip"
}

data "archive_file" "picture_service_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../../../backend/picture_service"
  output_path = "${path.module}/picture_service.zip"
}

data "archive_file" "video_service_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../../../backend/video_service"
  output_path = "${path.module}/video_service.zip"
}

# --- Functions ---
resource "aws_lambda_function" "api_service" {
  filename         = data.archive_file.api_service_zip.output_path
  function_name    = "weather-archive-api"
  role             = data.aws_iam_role.lab_role.arn
  handler          = "index.handler"
  source_code_hash = data.archive_file.api_service_zip.output_base64sha256
  runtime          = "nodejs20.x"
  timeout          = 10

  environment {
    variables = {
      RAW_BUCKET_NAME = var.raw_bucket_name
      DB_HOST         = var.db_address
      DB_USER         = var.db_username
      DB_PASS         = var.db_password
      DB_NAME         = var.db_name
      REDIS_URL       = var.redis_url
    }
  }
}

resource "aws_lambda_function" "picture_service" {
  filename         = data.archive_file.picture_service_zip.output_path
  function_name    = "weather-archive-picture"
  role             = data.aws_iam_role.lab_role.arn
  handler          = "index.handler"
  source_code_hash = data.archive_file.picture_service_zip.output_base64sha256
  runtime          = "nodejs20.x"
  timeout          = 30

  environment {
    variables = {
      PROCESSED_BUCKET_NAME = var.processed_bucket_name
    }
  }
}

resource "aws_lambda_function" "video_service" {
  filename         = data.archive_file.video_service_zip.output_path
  function_name    = "weather-archive-video"
  role             = data.aws_iam_role.lab_role.arn
  handler          = "index.handler"
  source_code_hash = data.archive_file.video_service_zip.output_base64sha256
  runtime          = "nodejs20.x"
  timeout          = 300

  environment {
    variables = {
      PROCESSED_BUCKET_NAME = var.processed_bucket_name
      VIDEOS_BUCKET_NAME    = var.videos_bucket_name
    }
  }
}

# --- Triggers ---
resource "aws_s3_bucket_notification" "bucket_notification" {
  bucket = var.raw_bucket_id

  lambda_function {
    lambda_function_arn = aws_lambda_function.picture_service.arn
    events              = ["s3:ObjectCreated:*"]
  }

  depends_on = [aws_lambda_permission.allow_bucket]
}

resource "aws_lambda_permission" "allow_bucket" {
  statement_id  = "AllowExecutionFromS3"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.picture_service.arn
  principal     = "s3.amazonaws.com"
  source_arn    = var.raw_bucket_arn
}

resource "aws_cloudwatch_event_rule" "daily_video" {
  name                = "weather-archive-daily-video"
  description         = "Trigger video creation daily"
  schedule_expression = "rate(1 day)"
}

resource "aws_cloudwatch_event_target" "check_every_day" {
  rule      = aws_cloudwatch_event_rule.daily_video.name
  target_id = "lambda"
  arn       = aws_lambda_function.video_service.arn
}

resource "aws_lambda_permission" "allow_cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.video_service.arn
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_video.arn
}

output "api_function_arn" {
  value = aws_lambda_function.api_service.arn
}

output "api_invoke_arn" {
  value = aws_lambda_function.api_service.invoke_arn
}

output "api_function_name" {
  value = aws_lambda_function.api_service.function_name
}
