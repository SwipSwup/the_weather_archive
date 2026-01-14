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
variable "processed_bucket_id" {}
variable "api_key" {}
variable "private_subnet_ids" {
  type = list(string)
}
variable "vpc_id" {}

# --- Security Group for Lambda ---
resource "aws_security_group" "lambda_sg" {
  name        = "weather-archive-lambda-sg"
  description = "Security Group for Lambda Functions"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"] # Allow outbound internet access (via NAT)
  }

  tags = {
    Name = "Weather Archive Lambda SG"
  }
}




data "aws_iam_role" "lab_role" {
  name = "LabRole"
}

# locals {
#   lab_role_arn = "arn:aws:iam::062236189973:role/LabRole"
# }

# --- Lambda Archives ---
data "archive_file" "upload_service_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../../../backend/upload_service"
  output_path = "${path.module}/upload_service.zip"
}

data "archive_file" "read_service_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../../../backend/read_service"
  output_path = "${path.module}/read_service.zip"
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
resource "aws_lambda_function" "upload_service" {
  filename                       = data.archive_file.upload_service_zip.output_path
  function_name                  = "weather-archive-upload"
  role                           = data.aws_iam_role.lab_role.arn
  handler                        = "index.handler"
  source_code_hash               = data.archive_file.upload_service_zip.output_base64sha256
  runtime                        = "nodejs20.x"
  timeout                        = 10
  reserved_concurrent_executions = 1

  environment {
    variables = {
      RAW_BUCKET_NAME = var.raw_bucket_name
      DB_HOST         = var.db_address
      DB_USER         = var.db_username
      DB_PASS         = var.db_password
      DB_NAME         = var.db_name
      API_KEY         = var.api_key
      REDIS_URL       = var.redis_url
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  tags = {
    Name = "Weather Archive Upload Service"
  }
}

resource "aws_lambda_function" "read_service" {
  filename                       = data.archive_file.read_service_zip.output_path
  function_name                  = "weather-archive-read"
  role                           = data.aws_iam_role.lab_role.arn
  handler                        = "index.handler"
  source_code_hash               = data.archive_file.read_service_zip.output_base64sha256
  runtime                        = "nodejs20.x"
  timeout                        = 10
  reserved_concurrent_executions = 1

  environment {
    variables = {
      DB_HOST               = var.db_address
      DB_USER               = var.db_username
      DB_PASS               = var.db_password
      DB_NAME               = var.db_name
      REDIS_URL             = var.redis_url
      VIDEOS_BUCKET_NAME    = var.videos_bucket_name
      PROCESSED_BUCKET_NAME = var.processed_bucket_name
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  tags = {
    Name = "Weather Archive Picture Service"
  }
}

resource "aws_lambda_function" "picture_service" {
  filename                       = data.archive_file.picture_service_zip.output_path
  function_name                  = "weather-archive-picture"
  role                           = data.aws_iam_role.lab_role.arn
  handler                        = "index.handler"
  source_code_hash               = data.archive_file.picture_service_zip.output_base64sha256
  runtime                        = "nodejs20.x"
  timeout                        = 60 # Increased for processing
  memory_size                    = 1024
  reserved_concurrent_executions = 2

  environment {
    variables = {
      PROCESSED_BUCKET_NAME = var.processed_bucket_name
      DB_HOST               = var.db_address
      DB_USER               = var.db_username
      DB_PASS               = var.db_password
      DB_NAME               = var.db_name
      API_KEY               = var.api_key
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  tags = {
    Name = "Weather Archive Picture Service"
  }
}



# --- FFmpeg Layer ---
resource "aws_lambda_layer_version" "ffmpeg_layer" {
  filename   = "${path.module}/../../../backend/ffmpeg-layer.zip"
  layer_name = "ffmpeg-layer"

  compatible_runtimes = ["nodejs20.x", "nodejs18.x"]
}

resource "aws_lambda_function" "video_service" {
  filename                       = data.archive_file.video_service_zip.output_path
  function_name                  = "weather-archive-video"
  role                           = data.aws_iam_role.lab_role.arn
  handler                        = "index.handler"
  source_code_hash               = data.archive_file.video_service_zip.output_base64sha256
  runtime                        = "nodejs18.x"
  timeout                        = 300
  memory_size                    = 2048
  reserved_concurrent_executions = 2
  layers                         = [aws_lambda_layer_version.ffmpeg_layer.arn]

  environment {
    variables = {
      PROCESSED_BUCKET_NAME = var.processed_bucket_name
      VIDEOS_BUCKET_NAME    = var.videos_bucket_name
      DB_HOST               = var.db_address
      DB_USER               = var.db_username
      DB_PASS               = var.db_password
      DB_NAME               = var.db_name
      REDIS_URL             = var.redis_url
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  tags = {
    Name = "Weather Archive Video Service"
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

# --- Video Service Schedule (CloudWatch) ---
resource "aws_cloudwatch_event_rule" "video_schedule" {
  name                = "video-creation-schedule"
  description         = "Trigger video creation every 24 hours"
  schedule_expression = "rate(24 hours)" # Or cron(0 * * * ? *)
}

resource "aws_cloudwatch_event_target" "trigger_video_lambda" {
  rule      = aws_cloudwatch_event_rule.video_schedule.name
  target_id = "VideoServiceTarget"
  arn       = aws_lambda_function.video_service.arn
}

resource "aws_lambda_permission" "allow_cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.video_service.arn
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.video_schedule.arn
}



output "upload_function_arn" {
  value = aws_lambda_function.upload_service.arn
}

output "upload_invoke_arn" {
  value = aws_lambda_function.upload_service.invoke_arn
}

output "upload_function_name" {
  value = aws_lambda_function.upload_service.function_name
}

output "read_function_arn" {
  value = aws_lambda_function.read_service.arn
}

output "read_invoke_arn" {
  value = aws_lambda_function.read_service.invoke_arn
}

output "read_function_name" {
  value = aws_lambda_function.read_service.function_name
}

# --- Test Trigger Service ---
data "archive_file" "test_trigger_service_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../../../backend/test_trigger_service"
  output_path = "${path.module}/test_trigger_service.zip"
}

resource "aws_lambda_function" "test_trigger_service" {
  filename                       = data.archive_file.test_trigger_service_zip.output_path
  function_name                  = "weather-archive-test-trigger"
  role                           = data.aws_iam_role.lab_role.arn
  handler                        = "index.handler"
  source_code_hash               = data.archive_file.test_trigger_service_zip.output_base64sha256
  runtime                        = "nodejs20.x"
  timeout                        = 10
  reserved_concurrent_executions = 1

  environment {
    variables = {
      VIDEO_SERVICE_ARN = aws_lambda_function.video_service.arn
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  tags = {
    Name = "Weather Archive Test Trigger Service"
  }
}

output "test_trigger_invoke_arn" {
  value = aws_lambda_function.test_trigger_service.invoke_arn
}

output "test_trigger_function_name" {
  value = aws_lambda_function.test_trigger_service.function_name
}

output "lambda_security_group_id" {
  value = aws_security_group.lambda_sg.id
}

# --- City Service ---
data "archive_file" "city_service_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../../../backend/city_service"
  output_path = "${path.module}/city_service.zip"
}

resource "aws_lambda_function" "city_service" {
  filename                       = data.archive_file.city_service_zip.output_path
  function_name                  = "weather-archive-city"
  role                           = data.aws_iam_role.lab_role.arn
  handler                        = "index.handler"
  source_code_hash               = data.archive_file.city_service_zip.output_base64sha256
  runtime                        = "nodejs20.x"
  timeout                        = 10
  reserved_concurrent_executions = 1

  environment {
    variables = {
      DB_HOST = var.db_address
      DB_USER = var.db_username
      DB_PASS = var.db_password
      DB_NAME = var.db_name
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  tags = {
    Name = "Weather Archive City Service"
  }
}

output "city_invoke_arn" {
  value = aws_lambda_function.city_service.invoke_arn
}

output "city_function_name" {
  value = aws_lambda_function.city_service.function_name
}

# --- Date Service ---
data "archive_file" "date_service_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../../../backend/date_service"
  output_path = "${path.module}/date_service.zip"
}

resource "aws_lambda_function" "date_service" {
  filename                       = data.archive_file.date_service_zip.output_path
  function_name                  = "weather-archive-date"
  role                           = data.aws_iam_role.lab_role.arn
  handler                        = "index.handler"
  source_code_hash               = data.archive_file.date_service_zip.output_base64sha256
  runtime                        = "nodejs20.x"
  timeout                        = 10
  reserved_concurrent_executions = 1

  environment {
    variables = {
      DB_HOST   = var.db_address
      DB_USER   = var.db_username
      DB_PASS   = var.db_password
      DB_NAME   = var.db_name
      REDIS_URL = var.redis_url
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  tags = {
    Name = "Weather Archive Date Service"
  }
}

output "date_invoke_arn" {
  value = aws_lambda_function.date_service.invoke_arn
}

output "date_function_name" {
  value = aws_lambda_function.date_service.function_name
}
