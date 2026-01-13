import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";
import * as std from "@pulumi/std";
import * as fs from "fs";

const project = new digitalocean.Project("SkillBound", {
  name: "skill-bound",
  environment: "production"
});

const loadBalancer = new digitalocean.LoadBalancer("loadBalancer", {
  projectId: project.id,
  region: digitalocean.Region.SFO3,
  forwardingRules: [{
    entryProtocol: "http",
    entryPort: 80,
    targetProtocol: "http",
    targetPort: 80,
  }],
  healthcheck: {
    protocol: "http",
    port: 80,
    path: "/",
    checkIntervalSeconds: 10,
    responseTimeoutSeconds: 5,
    healthyThreshold: 3,
    unhealthyThreshold: 3,
  }
});

const webTag = new digitalocean.Tag("webTag", { name: "web-server" });
const controlPlaneTag = new digitalocean.Tag("controlPlaneTag", { name: "control-plane-server" });
const gameTag = new digitalocean.Tag("gameTag", { name: "game-server" });

const createUserData = () => {
  const nomadConfig = fs.readFileSync('./nomad.hcl', 'utf8');
  const consulConfig = fs.readFileSync('./consul.hcl', 'utf8');

  return `#cloud-config
write_files:
  - path: /etc/nomad.d/nomad.hcl
    content: |
${nomadConfig.split('\n').map(line => '      ' + line).join('\n')}
    owner: root:root
    permissions: '0644'
  - path: /etc/consul.d/consul.hcl
    content: |
${consulConfig.split('\n').map(line => '      ' + line).join('\n')}
    owner: root:root
    permissions: '0644'

package_update: true
packages:
  - nomad
  - consul

runcmd:
  - systemctl enable nomad
  - systemctl start nomad
  - systemctl enable consul
  - systemctl start consul
`;
};

const sshKey = new digitalocean.SshKey("default", {
  name: "Arch Laptop",
  publicKey: std.file({
    input: "/home/dispe/.ssh/id_rsa.pub",
  }).then(invoke => invoke.result),
});

const gameAutoScale = new digitalocean.DropletAutoscale("game-server", {
    name: "game-server",
    config: {
      minInstances: 1,
      maxInstances: 1,
      targetCpuUtilization: 0.5,
      targetMemoryUtilization: 0.5,
      cooldownMinutes: 5,
    },
    dropletTemplate: {
      projectId: project.id,
      size: digitalocean.DropletSlug.DropletS1VCPU512MB10GB,
      region: digitalocean.Region.SFO3,
      image: "ubuntu-25-10-x64",
      tags: [gameTag.name],
      sshKeys: [sshKey.fingerprint],
      withDropletAgent: true,
      ipv6: true,
      userData: createUserData(),
    }
  });

const createDroplet = (name: string, tags: pulumi.Output<string>[]) => {
  return new digitalocean.Droplet(name, {
    image: "ubuntu-25-10-x64",
    name: name,
    region: digitalocean.Region.SFO3,
    size: digitalocean.DropletSlug.DropletS1VCPU512MB10GB,
    tags: tags
  });
}

createDroplet("web-server", [webTag.name]);
createDroplet("control-plane-server", [controlPlaneTag.name]);

export const loadBalancerIP = loadBalancer.ip;