variable "upload_invoke_arn" {}
variable "upload_function_name" {}
variable "read_invoke_arn" {}
variable "read_function_name" {}
variable "test_trigger_invoke_arn" {}
variable "test_trigger_function_name" {}
variable "city_invoke_arn" {}
variable "city_function_name" {}

variable "date_invoke_arn" {}
variable "date_function_name" {}

resource "aws_apigatewayv2_api" "weather_api" {
  name          = "weather-archive-http-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT", "OPTIONS"]
    allow_headers = ["content-type", "x-image-city", "x-image-device-id", "x-image-timestamp", "x-api-key"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.weather_api.id
  name        = "$default"
  auto_deploy = true
}

# --- Upload Service Integration ---
resource "aws_apigatewayv2_integration" "upload_integration" {
  api_id                 = aws_apigatewayv2_api.weather_api.id
  integration_type       = "AWS_PROXY"
  connection_type        = "INTERNET"
  description            = "Upload Service Integration"
  integration_method     = "POST"
  integration_uri        = var.upload_invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "get_upload_url" {
  api_id    = aws_apigatewayv2_api.weather_api.id
  route_key = "GET /upload-url"
  target    = "integrations/${aws_apigatewayv2_integration.upload_integration.id}"
}

resource "aws_lambda_permission" "allow_apigateway_upload" {
  statement_id  = "AllowExecutionFromAPIGatewayUpload"
  action        = "lambda:InvokeFunction"
  function_name = var.upload_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.weather_api.execution_arn}/*/*"
}

# --- Read Service Integration ---
resource "aws_apigatewayv2_integration" "read_integration" {
  api_id                 = aws_apigatewayv2_api.weather_api.id
  integration_type       = "AWS_PROXY"
  connection_type        = "INTERNET"
  description            = "Read Service Integration"
  integration_method     = "POST"
  integration_uri        = var.read_invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "get_data" {
  api_id    = aws_apigatewayv2_api.weather_api.id
  route_key = "GET /data"
  target    = "integrations/${aws_apigatewayv2_integration.read_integration.id}"
}

resource "aws_lambda_permission" "allow_apigateway_read" {
  statement_id  = "AllowExecutionFromAPIGatewayRead"
  action        = "lambda:InvokeFunction"
  function_name = var.read_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.weather_api.execution_arn}/*/*"
}

resource "aws_apigatewayv2_integration" "test_trigger_integration" {
  api_id                 = aws_apigatewayv2_api.weather_api.id
  integration_type       = "AWS_PROXY"
  connection_type        = "INTERNET"
  description            = "Test Trigger Service Integration"
  integration_method     = "POST"
  integration_uri        = var.test_trigger_invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "post_test_trigger" {
  api_id    = aws_apigatewayv2_api.weather_api.id
  route_key = "POST /video/trigger"
  target    = "integrations/${aws_apigatewayv2_integration.test_trigger_integration.id}"
}

resource "aws_lambda_permission" "allow_apigateway_test_trigger" {
  statement_id  = "AllowExecutionFromAPIGatewayTestTrigger"
  action        = "lambda:InvokeFunction"
  function_name = var.test_trigger_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.weather_api.execution_arn}/*/*"
}

# --- City Service Integration ---
resource "aws_apigatewayv2_integration" "city_integration" {
  api_id                 = aws_apigatewayv2_api.weather_api.id
  integration_type       = "AWS_PROXY"
  connection_type        = "INTERNET"
  description            = "City Service Integration"
  integration_method     = "POST"
  integration_uri        = var.city_invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "get_cities" {
  api_id    = aws_apigatewayv2_api.weather_api.id
  route_key = "GET /cities"
  target    = "integrations/${aws_apigatewayv2_integration.city_integration.id}"
}

resource "aws_lambda_permission" "allow_apigateway_city" {
  statement_id  = "AllowExecutionFromAPIGatewayCity"
  action        = "lambda:InvokeFunction"
  function_name = var.city_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.weather_api.execution_arn}/*/*"
}


# --- Date Service Integration ---
resource "aws_apigatewayv2_integration" "date_integration" {
  api_id                 = aws_apigatewayv2_api.weather_api.id
  integration_type       = "AWS_PROXY"
  connection_type        = "INTERNET"
  description            = "Date Service Integration"
  integration_method     = "POST"
  integration_uri        = var.date_invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "get_dates" {
  api_id    = aws_apigatewayv2_api.weather_api.id
  route_key = "GET /dates"
  target    = "integrations/${aws_apigatewayv2_integration.date_integration.id}"
}

resource "aws_lambda_permission" "allow_apigateway_date" {
  statement_id  = "AllowExecutionFromAPIGatewayDate"
  action        = "lambda:InvokeFunction"
  function_name = var.date_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.weather_api.execution_arn}/*/*"
}

output "api_endpoint" {
  value = aws_apigatewayv2_api.weather_api.api_endpoint
}
