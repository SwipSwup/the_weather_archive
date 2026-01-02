variable "vpc_id" {}
variable "db_username" {}
variable "db_password" {}
variable "private_subnet_ids" {
  type = list(string)
}
variable "lambda_security_group_id" {}

resource "aws_db_subnet_group" "default" {
  name       = "weather-archive-db-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "Weather Archive DB Subnet Group"
  }
}

resource "aws_security_group" "rds_sg" {
  name        = "weather-archive-rds-sg"
  description = "Allow inbound access to RDS from Lambda"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.lambda_security_group_id]
  }

  # SECURE: No outbound internet access needed for RDS
  # egress {
  #   from_port   = 0
  #   to_port     = 0
  #   protocol    = "-1"
  #   cidr_blocks = ["0.0.0.0/0"]
  # }

  tags = {
    Name = "Weather Archive RDS SG"
  }
}

resource "aws_db_instance" "postgres" {
  identifier             = "weather-archive-db"
  engine                 = "postgres"
  engine_version         = "14"
  instance_class         = "db.t3.micro"
  username               = var.db_username
  password               = var.db_password
  allocated_storage      = 20
  skip_final_snapshot    = true
  publicly_accessible    = false # SECURE: No public access
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.default.name
  db_name                = "weather_archive"

  tags = {
    Name = "Weather Archive DB"
  }
}

output "db_endpoint" {
  value = aws_db_instance.postgres.endpoint
}

output "db_username" {
  value = aws_db_instance.postgres.username
}

output "db_name" {
  value = aws_db_instance.postgres.db_name
}

output "db_address" {
  value = aws_db_instance.postgres.address
}
