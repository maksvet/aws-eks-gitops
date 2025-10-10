# AWS EKS GitOps Demo

Production-ready Kubernetes deployment on AWS EKS Auto Mode with GitOps automation, featuring a containerized Express.js application, auto-scaling, and disaster recovery capabilities.

**Live Demo:** http://app.maxlabxq9n.work.gd

---

## Architecture

```
Developer → GitHub → CI/CD (Actions) → GHCR → GitOps (Flux CD) → EKS Auto Mode → ALB → User
```

**Key Features:**
- ✅ GitOps workflow with Flux CD
- ✅ Automated CI/CD pipeline with GitHub Actions
- ✅ Horizontal Pod Autoscaling (HPA) based on CPU
- ✅ AWS Application Load Balancer with health checks
- ✅ Security scanning with Trivy
- ✅ Multi-AZ high availability


## Prerequisites

- AWS EKS Auto Mode cluster [eks-cluster-lab](https://github.com/maksvet/aws-eks-terraform)
- kubectl configured for cluster access
- Flux CD installed (`flux bootstrap github ...`)
- AWS Load Balancer Controller installed
- Domain with DNS configured (app.maxlabxq9n.work.gd)

---

## CI/CD Pipeline

### How It Works

```
Code Push → Build Image → Security Scan → Push to GHCR → Create PR → Manual Merge → Flux Deploys
```

**Trigger:** 
- Push to `main` branch or changes in `app/` directory
- Manual dispatch via GitHub Actions

**Pipeline Steps:**
1. **Build** - Docker image from [app/Dockerfile](app/Dockerfile)
2. **Tag** - `ghcr.io/maksvet/aws-eks-gitops/sample-app:<commit-sha>` + `latest`
3. **Scan** - Trivy vulnerability scan (results in Security tab)
4. **Update** - Creates PR updating [sample-app-deployment.yaml](clusters/eks-cluster-lab/demo/sample-app-deployment.yaml)
5. **Deploy** - Flux applies changes after PR merge

**Security:**
- No hard-coded secrets (uses `GITHUB_TOKEN`)
- Immutable image tags (commit SHA)
- Automated vulnerability scanning
- Pull request workflow prevents accidental deployments

### Local Testing

```bash
# Test application
cd app && npm install && npm start
curl http://localhost:8080

# Test Docker build
docker build -t sample-app:test ./app
docker run -p 8080:8080 sample-app:test
```

### Monitoring Pipeline

- **Actions:** https://github.com/maksvet/aws-eks-gitops/actions
- **Security:** https://github.com/maksvet/aws-eks-gitops/security
- **Pull Requests:** Auto-created by CI after successful build

---

## Kubernetes Resources

| Resource | Config | Purpose |
|----------|--------|---------|
| **Deployment** | 2 replicas, 100m/128Mi requests, 500m/256Mi limits | Runs Express.js app with health checks |
| **Service** | ClusterIP on port 80 → 8080 | Internal service discovery |
| **Ingress** | AWS ALB, target-type: ip | Public HTTPS access via domain |
| **HPA** | 2-10 replicas, 70% CPU target | Auto-scaling based on load |
| **Namespace** | `demo` | Resource isolation |

**Key Configuration:**
- Image: `ghcr.io/maksvet/aws-eks-gitops/sample-app:<sha>`
- Health checks: liveness (10s delay) + readiness (5s delay)
- HPA behavior: aggressive scale-up, gradual scale-down (5min stabilization)

### Bootstrap Flux CD

```bash
export GITHUB_TOKEN=<token>
export GITHUB_USER=<username>

flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=aws-eks-gitops \
  --branch=main \
  --path=./clusters/eks-cluster-lab \
  --personal

# Verify Flux
flux check
kubectl get kustomizations -n flux-system
```

### Verify Deployment

```bash
# Check application
kubectl get all -n demo
kubectl get hpa -n demo
kubectl logs -n demo -l app=sample-app

# Get ALB hostname
kubectl get ingress sample-app-ingress -n demo

# Test endpoint
curl http://app.maxlabxq9n.work.gd
```

---

## Disaster Recovery Strategy

### Current: Single Region, Multi-AZ
- **EKS Auto Mode** distributes pods across multiple AZs automatically
- **ALB health checks** route traffic only to healthy pods
- **HPA** ensures minimum 2 replicas for high availability

### Extended: Multi-Region DR

**1. Active-Passive Multi-Region:**
- Deploy identical EKS cluster in secondary region (us-west-2)
- Use Route 53 failover routing with health checks
- Flux CD maintains identical configs via same Git repo
- Container images replicated via GHCR (multi-region by default)

**2. Data & State Management:**
- Velero for cluster backups to S3 with cross-region replication
- External state stores (RDS, DynamoDB Global Tables) with cross-region replication
- AWS Secrets Manager with cross-region replication for secrets

**3. Automated Failover:**
- Route 53 health checks monitor application endpoints
- DNS TTL: 60 seconds for fast failover
- Automated DR drills quarterly using chaos engineering
- **RTO:** < 15 minutes | **RPO:** < 5 minutes

**4. Cost Optimization:**
- Run DR cluster with minimal capacity (1-2 nodes)
- Auto-scale up during failover events
- ~70% cost reduction vs. active-active setup

---

## Assignment Deliverables

### Assignment 1: Kubernetes Deployment & Scaling ✅
- **Manifests:** [clusters/eks-cluster-lab/demo/](clusters/eks-cluster-lab/demo/)
- **Public Access:** http://app.maxlabxq9n.work.gd
- **HPA:** CPU-based auto-scaling (2-10 replicas)
- **DR Strategy:** Multi-region active-passive approach documented above

### Assignment 2: IaC + CI/CD ✅
- **IaC:** EKS cluster via Terraform [maksvet/aws-eks-terraform](https://github.com/maksvet/aws-eks-terraform)
- **IaC:** Kubernetes manifests managed via GitOps (Flux CD)
- **CI/CD:** [.github/workflows/ci-workflow.yaml](.github/workflows/ci-workflow.yaml)
- **Registry:** GitHub Container Registry (GHCR)
- **Security:** Trivy scanning, no hard-coded secrets