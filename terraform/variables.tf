variable "do_token" {
    type = string
    sensitive = true
}

variable "image" {
    type = string
    default = "ubuntu-25-10-x64"
}

variable "region" {
    type = string
    default = "sfo3"
}
