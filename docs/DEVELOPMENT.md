# SilentVideoSynth Deployment Guide

## Overview

This guide covers deployment options for SilentVideoSynth, from local development to production environments. The application consists of a FastAPI backend with AI models and a Next.js frontend.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   Frontend      │    │   Backend       │    │   AI Models     │
│   (Next.js)     │◄──►│   (FastAPI)     │◄──►│   (PyTorch)     │
│   Port: 3000    │    │   Port: 8000    │    │   GPU Required  │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   Nginx         │    │   File Storage  │    │   Model Storage │
│   (Load Balancer)│    │   (Generated)   │    │   (Weights)     │
│   Port: 80/443  │    │                 │    │                 │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Prerequisites

### Hardware Requirements

**Minimum (Development):**
- CPU: 4 cores, 3.0GHz
- RAM: 8GB
- GPU: GTX 1060 or equivalent (4GB VRAM)
- Storage: 20GB free space

**Recommended (Production):**
- CPU: 8+ cores, 3.5GHz+
- RAM: 32GB+
- GPU: RTX 3080 or equivalent (10GB+ VRAM)
- Storage: 100GB+ SSD
- Network: High bandwidth for file uploads

### Software Requirements

- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Node.js**: 18+ (for local development)
- **Python**: 3.9+ (for local development)
- **NVIDIA Docker**: For GPU support

## Deployment Options

### Option 1: Docker Compose (Recommended)

This is the easiest way to deploy the full stack.

#### 1. Clone and Setup

```bash
git clone https://github.com/your-org/silentvideosynth.git
cd silentvideosynth

# Copy environment file
cp .env.example .env

# Edit environment variables
nano .env
```

#### 2. Configure Environment Variables

```bash
# .env file
NODE_ENV=production

# Backend Configuration
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
MODEL_PATH=/app/models
GENERATED_FILES_PATH=/app/generated_outputs
MAX_FILE_SIZE=104857600

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
NEXT_PUBLIC_APP_VERSION=1.0.0

# Database (if needed)
DATABASE_URL=sqlite:///app/data/app.db

# Security
SECRET_KEY=your-secret-key-here
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com

# GPU Support
CUDA_VISIBLE_DEVICES=0
```

#### 3. Deploy with Docker Compose

```bash
# Build and start all services
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop services
docker-compose down
```

#### 4. Verify Deployment

```bash
# Check frontend
curl http://localhost:3000/api/health

# Check backend
curl http://localhost:8000/api/health

# Check full stack
curl http://localhost/api/health
```

### Option 2: Kubernetes Deployment

For production environments with high availability requirements.

#### 1. Create Kubernetes Manifests

**namespace.yaml:**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: silentvideosynth
```

**backend-deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: silentvideosynth
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: silentvideosynth/backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: CUDA_VISIBLE_DEVICES
          value: "0"
        resources:
          requests:
            memory: "4Gi"
            cpu: "2"
            nvidia.com/gpu: 1
          limi