import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";
import * as fs from "fs";

const project = new digitalocean.Project("SkillBound", {
  name: "skill-bound",
  environment: "production"
});

const loadBalancer = new digitalocean.LoadBalancer("loadBalancer", {
  projectId: project.id,
  region: "sfo3",
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

function createAutoScaledDroplets(name: string, tags: pulumi.Input<string>[]) {
  return new digitalocean.DropletAutoscale(name, {
    name: name,
    config: {
      minInstances: 1,
      maxInstances: 1,
      targetCpuUtilization: 0.5,
      targetMemoryUtilization: 0.5,
      cooldownMinutes: 5,
    },
    dropletTemplate: {
      projectId: project.id,
      size: "s-1vcpu-512mb-10gb",
      region: "sfo3",
      image: "ubuntu-25-10-x64",
      tags: tags,
      sshKeys: [],
      withDropletAgent: true,
      ipv6: true,
      userData: createUserData(),
    }
  });
}

const webAutoscale = createAutoScaledDroplets("web-server", [webTag.name]);
const controlPlaneAutoscale = createAutoScaledDroplets("control-plane-server", [controlPlaneTag.name]);
const gameAutoscale = createAutoScaledDroplets("game-server", [gameTag.name]);

export const loadBalancerIP = loadBalancer.ip;
export const webAutoscaleID = webAutoscale.id;
export const controlPlaneAutoscaleID = controlPlaneAutoscale.id;
export const gameAutoscaleID = gameAutoscale.id;