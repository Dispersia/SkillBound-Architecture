terraform {
    backend "s3" {
      endpoint = "https://sfo3.digitaloceanspaces.com"
      bucket = "skill-bound-bucket"
      key = "terraform.tfstate"
      region = "sfo3"
      acl = "private"
    }
}

resource "digitalocean_tag" "control-plane-server" {
    name = "control-plane-server"
}

resource "digitalocean_tag" "web-server" {
    name = "web-server"
}

resource "digitalocean_tag" "game-server" {
    name = "game-server"
}

resource "digitalocean_droplet_autoscale" "control-plane-autoscale-pool" {
    name = "control-plane-autoscale"

    config {
        min_instances = 1
        max_instances = 1
        target_cpu_utilization = 0.5
        target_memory_utilization = 0.5
        cooldown_minutes = 5
    }

    droplet_template {
      size = "s-1vcpu-512mb-10gb"
      region = var.region
      image = var.image
      tags = ["nomad-server", digitalocean_tag.control-plane-server]
      ssh_keys = [digitalocean_ssh_key.skill-bound-ssh]
      with_droplet_agent = true
      ipv6 = true
      user_data = data.cloudinit_config.server_config.rendered
    }
}
