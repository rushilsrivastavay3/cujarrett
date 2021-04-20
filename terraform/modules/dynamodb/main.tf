resource "aws_dynamodb_table" "destiny_insights_backend_mods" {
  name           = "destiny-insights-backend-mods"
  billing_mode   = "PROVISIONED"
  read_capacity  = 5
  write_capacity = 5
  hash_key       = "timestamp"

  point_in_time_recovery {
    enabled = true
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  attribute {
    name = "mod1"
    type = "S"
  }

  attribute {
    name = "mod2"
    type = "S"
  }

  global_secondary_index {
    name               = "mod1"
    hash_key           = "mod1"
    write_capacity     = 5
    read_capacity      = 5
    projection_type    = "ALL"
  }

  global_secondary_index {
    name               = "mod2"
    hash_key           = "mod2"
    write_capacity     = 5
    read_capacity      = 5
    projection_type    = "ALL"
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_dynamodb_table" "destiny_insights_backend_bungie_api_auth" {
  name           = "destiny-insights-backend-bungie-api-auth"
  billing_mode   = "PROVISIONED"
  read_capacity  = 1
  write_capacity = 1
  hash_key       = "app"

  attribute {
    name = "app"
    type = "S"
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_dynamodb_table" "destiny_insights_backend_last_updated" {
  name           = "destiny-insights-backend-last-updated"
  billing_mode   = "PROVISIONED"
  read_capacity  = 1
  write_capacity = 1
  hash_key       = "app"

  attribute {
    name = "app"
    type = "S"
  }

  lifecycle {
    prevent_destroy = true
  }
}

output "destiny_insights_backend_mods_table_arn" {
  value = aws_dynamodb_table.destiny_insights_backend_mods.arn
}

output "destiny_insights_backend_bungie_api_auth_table_arn" {
  value = aws_dynamodb_table.destiny_insights_backend_bungie_api_auth.arn
}

output "destiny_insights_backend_last_updated_table_arn" {
  value = aws_dynamodb_table.destiny_insights_backend_last_updated.arn
}
