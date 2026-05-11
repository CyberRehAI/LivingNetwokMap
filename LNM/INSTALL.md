# LiveNetViz 3D - Complete Installation Guide

## 📋 Prerequisites

### Required Software

1. **Node.js 16+** - [Download](https://nodejs.org/)
2. **Python 3.8+** - [Download](https://python.org/)
3. **Git** - [Download](https://git-scm.com/)

### Windows-Specific Requirements

For C++ compilation:
- **Visual Studio 2019+** with C++ build tools
- OR **Visual Studio Build Tools 2019+**

### Linux-Specific Requirements

```bash
sudo apt-get update
sudo apt-get install build-essential python3-dev
```

### macOS-Specific Requirements

```bash
xcode-select --install
```

---

## 🚀 Quick Start

### Windows (PowerShell)

```powershell
# Run setup
.\setup.ps1

# Start all components
.\run.ps1
```

### Linux/macOS (Bash)

```bash
# Make scripts executable
chmod +x setup.sh run.sh

# Run setup
./setup.sh

# Start all components
./run.sh
```

---

## 📦 Manual Installation

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Build C++ scanner module
npm run build-cpp

# Start backend
npm start
```

**Verify backend is running:**
```bash
curl http://localhost:3000/health
```

Expected response: `{"status":"ok","timestamp":...}`

---

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

**Access frontend:** http://localhost:5173

---

### 3. Agent Setup

```bash
cd agent

# Install Python dependencies
pip install -r requirements.txt

# Start agent
python agent.py --server http://localhost:3000
```

---

## 🔧 Configuration

### Backend Configuration (.env)

```env
PORT=3000
WEBSOCKET_PORT=3001
NODE_ENV=development

HEALTH_CHECK_INTERVAL=10000
NODE_TIMEOUT=10000

REDIS_ENABLED=false
REDIS_HOST=localhost
REDIS_PORT=6379

AUTO_DISCOVERY=false
SCAN_SUBNET=192.168.1.0/24

LOG_LEVEL=info
LOG_FILE=./logs/server.log

CORS_ORIGIN=http://localhost:5173
```

### Agent Configuration (config.json)

```json
{
  "server_url": "http://localhost:3000",
  "update_interval": 2,
  "node_id": null,
  "retry_attempts": 3,
  "log_level": "INFO"
}
```

---

## 🧪 Testing

### Run Fake Agents

```bash
cd tests

# Start 50 fake agents
python fake-agent.py --count 50

# Custom configuration
python fake-agent.py --count 100 --server http://192.168.1.100:3000 --interval 5
```

### Run Stress Test

```bash
cd tests

# Test backend performance
node stress-test.js

# Test remote server
node stress-test.js http://192.168.1.100:3000
```

---

## 🌐 Network Deployment

### Deploy Backend on Server

```bash
# Install PM2 for process management
npm install -g pm2

# Start backend with PM2
cd backend
pm2 start server.js --name livenetviz-backend

# Save PM2 configuration
pm2 save

# Setup auto-start on boot
pm2 startup
```

### Deploy Frontend

```bash
cd frontend

# Build for production
npm run build

# Serve with nginx or any static server
# Files will be in dist/
```

### Deploy Agents on Network Devices

**Option 1: Manual Installation**
```bash
# Copy agent folder to target device
scp -r agent/ user@device:/opt/livenetviz-agent/

# SSH into device
ssh user@device

# Install and run
cd /opt/livenetviz-agent
pip install -r requirements.txt
python agent.py --server http://your-server:3000 --node-id device-01
```

**Option 2: Systemd Service (Linux)**

Create `/etc/systemd/system/livenetviz-agent.service`:

```ini
[Unit]
Description=LiveNetViz 3D Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/livenetviz-agent
ExecStart=/usr/bin/python3 /opt/livenetviz-agent/agent.py --server http://your-server:3000
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable livenetviz-agent
sudo systemctl start livenetviz-agent
```

---

## 🐳 Docker Deployment

### Backend Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build C++ module
RUN apk add --no-cache python3 make g++
RUN npm run build-cpp

EXPOSE 3000

CMD ["npm", "start"]
```

### Frontend Dockerfile

```dockerfile
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - REDIS_ENABLED=true
      - REDIS_HOST=redis
    depends_on:
      - redis

  frontend:
    build: ./frontend
    ports:
      - "80:80"

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

  agent:
    build: ./agent
    environment:
      - SERVER_URL=http://backend:3000
    depends_on:
      - backend
```

Run with:
```bash
docker-compose up -d
```

---

## 🔒 Security Considerations

### Production Checklist

- [ ] Change default ports
- [ ] Enable HTTPS/TLS
- [ ] Set strong CORS policies
- [ ] Enable authentication
- [ ] Use Redis for session management
- [ ] Configure firewall rules
- [ ] Enable rate limiting
- [ ] Use environment variables for secrets
- [ ] Regular security updates

### Enable HTTPS

```javascript
// backend/server.js
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('path/to/private-key.pem'),
  cert: fs.readFileSync('path/to/certificate.pem')
};

const server = https.createServer(options, app);
```

---

## 📊 Monitoring

### Backend Metrics

```bash
# Using PM2
pm2 monit

# Custom metrics endpoint
curl http://localhost:3000/api/nodes/stats
```

### Log Management

```bash
# View logs
tail -f backend/logs/combined.log

# View errors only
tail -f backend/logs/error.log

# Using PM2
pm2 logs livenetviz-backend
```

---

## 🛠 Troubleshooting

### Backend Won't Start

**Check port availability:**
```bash
# Windows
netstat -ano | findstr :3000

# Linux/macOS
lsof -i :3000
```

**Solution:** Change PORT in `.env` or kill process using port

### C++ Module Build Fails

**Windows:**
- Install Visual Studio Build Tools
- Run in "x64 Native Tools Command Prompt"

**Linux:**
```bash
sudo apt-get install build-essential python3-dev
```

**macOS:**
```bash
xcode-select --install
```

### Agent Can't Connect

**Check backend is accessible:**
```bash
curl http://your-server:3000/health
```

**Check firewall:**
```bash
# Windows
netsh advfirewall firewall add rule name="LiveNetViz" dir=in action=allow protocol=TCP localport=3000

# Linux (ufw)
sudo ufw allow 3000/tcp
```

### Frontend Can't Connect to Backend

**Check CORS settings in backend `.env`:**
```env
CORS_ORIGIN=http://localhost:5173
```

**Or allow all (development only):**
```env
CORS_ORIGIN=*
```

### Network Scanner Requires Admin Rights

**Linux:**
```bash
sudo setcap cap_net_raw+ep $(which node)
```

**Windows:**
- Run backend as Administrator

**Alternative:**
- Scanner will fall back to TCP probes automatically

---

## 🔄 Updates

### Update Backend

```bash
cd backend
git pull
npm install
npm run build-cpp
pm2 restart livenetviz-backend
```

### Update Frontend

```bash
cd frontend
git pull
npm install
npm run build
```

### Update Agent

```bash
cd agent
git pull
pip install -r requirements.txt
# Restart agent service
```

---

## 📞 Support

For issues and questions:
- Check the troubleshooting section
- Review logs in `backend/logs/`
- Check agent logs in `agent/agent.log`
- Open an issue on GitHub

---

## 📄 License

MIT License - See LICENSE file for details
