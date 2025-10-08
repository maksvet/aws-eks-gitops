# AWS EKS GitOps Demo

A demo-ready Kubernetes deployment showcasing GitOps practices with Flux CD, featuring a containerized nginx application with auto-scaling, public access via TLS/SSL, and disaster recovery considerations.

http://app.maxlabxq9n.work.gd



## Directory Structure

```
aws-eks-gitops/
├── clusters/
│   └── eks-cluster-lab/
│       ├── flux-system/          # Flux CD configuration
│       └── demo/                 # Demo application
│           ├── namespace.yaml
│           ├── nginx-deployment.yaml
│           ├── nginx-service.yaml
│           ├── nginx-ingress.yaml
│           ├── nginx-hpa.yaml
│           └── kustomization.yaml
└── README.md
```


## Architecture Overview

This setup demonstrates:
- **GitOps workflow** using Flux CD for continuous deployment
- **Auto-scaling** with Horizontal Pod Autoscaler based on CPU metrics
- **Public access** with AWS Load Balancer and TLS/SSL certificates
- **Infrastructure as Code** with all manifests version-controlled

## Prerequisites

- AWS CLI configured with appropriate credentials
- kubectl installed
- Flux CLI installed
- Domain name with DNS configured
- GitHub repository access

## Deployed Components

### Kubernetes Resources

1. **Deployment** (`nginx-deployment.yaml`)
   - Starts with 1 replica
   - Resource requests: 100m CPU, 128Mi memory
   - Resource limits: 500m CPU, 256Mi memory
   - Uses official nginx:latest image

2. **Service** (`nginx-service.yaml`)
   - Type: LoadBalancer
   - Exposes port 80
   - AWS automatically provisions an ELB

3. **Ingress** (`nginx-ingress.yaml`)
   - NGINX Ingress Controller
   - Automatic TLS certificate via cert-manager
   - Routes traffic to nginx service

4. **HPA** (`nginx-hpa.yaml`)
   - Min replicas: 1
   - Max replicas: 2
   - Target CPU utilization: 70%
   - Automatically scales based on load

## Deployment Steps

### 1. Install Required Controllers

```bash
# Install AWS Load Balancer Controller
kubectl apply -k "github.com/aws/eks-charts/stable/aws-load-balancer-controller//crds?ref=master"
helm repo add eks https://aws.github.io/eks-charts
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=eks-cluster-lab

# Install NGINX Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/aws/deploy.yaml

# Install cert-manager for TLS
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Install metrics-server for HPA
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### 2. Configure DNS

After the LoadBalancer is created, get the external IP:

```bash
kubectl get svc nginx-service -n demo
```

Create an A record in your DNS provider pointing `nginx-demo.yourdomain.com` to the LoadBalancer's external IP/hostname.



## Disaster Recovery Strategy

### Multi-Region and Multi-AZ Approach

**Current Setup (Single Region, Multi-AZ):**
The EKS cluster is configured with worker nodes distributed across multiple availability zones within a single AWS region. This provides high availability against AZ-level failures. Kubernetes automatically distributes pods across AZs using pod topology spread constraints.

**Extended DR Strategy for Multi-Region:**

To extend this setup for full disaster recovery across regions, implement the following:

1. **Active-Passive Multi-Region Setup:**
   - Deploy identical EKS clusters in a secondary AWS region (e.g., us-west-2 as backup to us-east-1)
   - Use AWS Route 53 health checks with failover routing policies to automatically route traffic to the healthy region
   - Replicate container images to Amazon ECR repositories in both regions
   - Use Flux CD to maintain identical configurations across regions via GitOps

2. **Data and State Management:**
   - Implement Velero for cluster-level backups (pods, services, persistent volumes)
   - Schedule automated backups to S3 buckets with cross-region replication enabled
   - For stateful applications, use AWS RDS with cross-region read replicas or DynamoDB Global Tables
   - Store critical secrets in AWS Secrets Manager with cross-region replication

3. **Automated Failover:**
   - Configure Route 53 health checks to monitor application endpoints
   - Set DNS TTL to 60 seconds for faster failover
   - Implement automated disaster recovery drills using chaos engineering tools (e.g., Litmus Chaos)
   - Use Flux CD to automatically reconcile and deploy to the DR cluster
   - Maintain RTO (Recovery Time Objective) < 15 minutes and RPO (Recovery Point Objective) < 5 minutes

4. **Monitoring and Alerting:**
   - Deploy Prometheus and Grafana for metrics across all regions
   - Configure CloudWatch cross-region dashboards
   - Set up PagerDuty/Opsgenie alerts for failover events
   - Implement synthetic monitoring for external health checks

**Cost Optimization:**
Run the DR cluster with minimal node capacity (1-2 nodes) and use Cluster Autoscaler to scale up during failover events, reducing standby costs by ~70%.

