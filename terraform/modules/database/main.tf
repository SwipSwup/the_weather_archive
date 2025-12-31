variable "vpc_id" {}
variable "db_username" {}
variable "db_password" {}

resource "aws_security_group" "rds_sg" {
  name        = "weather-archive-rds-sg"
  description = "Allow inbound access to RDS"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
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
  publicly_accessible    = true
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  db_name                = "weather_archive"
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
