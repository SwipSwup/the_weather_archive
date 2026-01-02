variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "public_subnet_id" {
  description = "ID of a public subnet for the NAT Gateway"
  type        = string
}

variable "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  type        = string
}

variable "bucket_region" {
  description = "Region for S3 Endpoint"
  type        = string
  default     = "us-east-1"
}

# --- Private Subnets ---
resource "aws_subnet" "private_1" {
  vpc_id            = var.vpc_id
  cidr_block        = cidrsubnet(var.vpc_cidr_block, 8, 100) # e.g., 172.31.100.0/24
  availability_zone = "us-east-1a"

  tags = {
    Name        = "WeatherArchive-Private-1"
    Environment = "Lab"
    Project     = "WeatherArchive"
  }
}

resource "aws_subnet" "private_2" {
  vpc_id            = var.vpc_id
  cidr_block        = cidrsubnet(var.vpc_cidr_block, 8, 101) # e.g., 172.31.101.0/24
  availability_zone = "us-east-1b"

  tags = {
    Name        = "WeatherArchive-Private-2"
    Environment = "Lab"
    Project     = "WeatherArchive"
  }
}

# --- NAT Gateway ---
resource "aws_eip" "nat" {
  domain = "vpc"

  tags = {
    Name    = "WeatherArchive-NAT-EIP"
    Project = "WeatherArchive"
  }
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = var.public_subnet_id

  tags = {
    Name    = "WeatherArchive-NAT"
    Project = "WeatherArchive"
  }

}

# --- Route Table (Private) ---
resource "aws_route_table" "private" {
  vpc_id = var.vpc_id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = {
    Name    = "WeatherArchive-Private-RT"
    Project = "WeatherArchive"
  }
}

resource "aws_route_table_association" "private_1" {
  subnet_id      = aws_subnet.private_1.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_2" {
  subnet_id      = aws_subnet.private_2.id
  route_table_id = aws_route_table.private.id
}

# --- VPC Endpoint (S3) ---
# Saves cost by routing S3 traffic internally, bypassing the NAT Gateway
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = var.vpc_id
  service_name = "com.amazonaws.${var.bucket_region}.s3"

  route_table_ids = [aws_route_table.private.id]

  tags = {
    Name    = "WeatherArchive-S3-Endpoint"
    Project = "WeatherArchive"
  }
}

output "private_subnet_ids" {
  value = [aws_subnet.private_1.id, aws_subnet.private_2.id]
}

output "vpc_id" {
  value = var.vpc_id
}
