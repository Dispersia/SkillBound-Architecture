#!/bin/bash
set -e

wget -O- apt.releases.hashicorp.com | gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | tee /etc/apt/sources.list.d/hashicorp.list

apt-get update && apt-get install -y consul nomad

mkdir -p /opt/consul /opt/nomad/data