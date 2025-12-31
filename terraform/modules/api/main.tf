variable "lambda_invoke_arn" {}
variable "lambda_function_name" {}
variable "lambda_execution_arn" {}

resource "aws_apigatewayv2_api" "weather_api" {
  name          = "weather-archive-http-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.weather_api.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_apigatewayv2_integration" "api_lambda_integration" {
  api_id                 = aws_apigatewayv2_api.weather_api.id
  integration_type       = "AWS_PROXY"
  connection_type        = "INTERNET"
  description            = "Lambda Integration"
  integration_method     = "POST"
  integration_uri        = var.lambda_invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "upload_image" {
  api_id    = aws_apigatewayv2_api.weather_api.id
  route_key = "POST /image"
  target    = "integrations/${aws_apigatewayv2_integration.api_lambda_integration.id}"
}

resource "aws_apigatewayv2_route" "get_data" {
  api_id    = aws_apigatewayv2_api.weather_api.id
  route_key = "GET /data"
  target    = "integrations/${aws_apigatewayv2_integration.api_lambda_integration.id}"
}

resource "aws_lambda_permission" "allow_apigateway" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.weather_api.execution_arn}/*/*"
}

output "api_endpoint" {
  value = aws_apigatewayv2_api.weather_api.api_endpoint
}
