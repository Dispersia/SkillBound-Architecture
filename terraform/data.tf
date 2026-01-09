data "digitalocean_ssh_key" "skill-bound-ssh" {
    name = "skill-bound-ssh"
}

data "cloudinit_config" "server_config" {
    gzip = false
    base64_encode = false

    part {
        content_type = "text/x-shellscript"
        content = file("${path.module}/scripts/install.sh")
    }

    part {
        content_type = "text/cloud-config"
        content = yamlencode({
            write_files = [
                {
                    path = "/etc/consul.d/consul.hcl"
                    content = templatefile("${path.module}/templates/consul.hcl.tftpl", {
                        datacenter = var.region
                        tag_name = "nomad-server"
                    })
                },
                {
                    path = "/etc/nomad.d/nomad.hcl"
                    content = templatefile("${path.module}/templates/nomad.hcl.tftpl", {
                        datacenter = var.region
                    })
                }
            ]
            run_cmd = [
                ["systemctl", "enable", "--now", "consul"],
                ["systemctl", "enable", "--now", "nomad"]
            ]
        })
    }
}