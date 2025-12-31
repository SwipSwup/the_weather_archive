terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

module "storage" {
  source        = "./modules/storage"
  bucket_suffix = random_id.bucket_suffix.hex
}

module "database" {
  source      = "./modules/database"
  vpc_id      = data.aws_vpc.default.id
  db_username = var.db_username
  db_password = var.db_password
}

module "backend" {
  source                = "./modules/backend"
  raw_bucket_name       = module.storage.raw_bucket_name
  processed_bucket_name = module.storage.processed_bucket_name
  videos_bucket_name    = module.storage.videos_bucket_name
  raw_bucket_arn        = module.storage.raw_bucket_arn
  processed_bucket_arn  = module.storage.processed_bucket_arn
  videos_bucket_arn     = module.storage.videos_bucket_arn
  raw_bucket_id         = module.storage.raw_bucket_id
  db_address            = module.database.db_address
  db_username           = module.database.db_username
  db_password           = var.db_password
  db_name               = module.database.db_name
  redis_url             = var.redis_url
}

module "api" {
  source               = "./modules/api"
  lambda_invoke_arn    = module.backend.api_invoke_arn
  lambda_function_name = module.backend.api_function_name
  lambda_execution_arn = module.backend.api_function_arn # approximation for permission, but actually we need execution_arn of api gateway passed to lambda permission? No, permission is in module api.
  # We need to ensure permission gets correct ARN.
  # Permission in api module: source_arn = "${aws_apigatewayv2_api.weather_api.execution_arn}/*/*"
  # This is fine. Just need function name.
}
