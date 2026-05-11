# LiveNetViz 3D - Real-Time Network Visualization System

## 🎯 Overview

**LiveNetViz 3D** is a comprehensive real-time 3D network mapping and monitoring system that visualizes network topology, monitors device health, and detects faults in real-time.

## 🏗 Architecture

### Components:
1. **Node Agents (Python)** - Lightweight agents installed on network devices
2. **Backend (Node.js + C++)** - Real-time API with WebSocket support
3. **Frontend (Three.js + Vite)** - Interactive 3D visualization
4. **Network Scanner (C++)** - High-performance subnet scanning

## 📁 Project Structure

```
LiveNetViz3D/
├── agent/                  # Python node agents
│   ├── agent.py           # Main agent script
│   ├── requirements.txt   # Python dependencies
│   └── config.json        # Agent configuration
├── backend/               # Node.js backend
│   ├── server.js          # Main server
│   ├── routes/            # API routes
│   ├── utils/             # Utilities
│   ├── cpp/               # C++ modules
│   └── package.json       # Node dependencies
├── frontend/              # Three.js frontend
│   ├── src/               # Source code
│   ├── public/            # Static assets
│   └── package.json       # Frontend dependencies
└── tests/                 # Testing utilities
    ├── fake-agent.py      # Fake data generator
    └── stress-test.js     # Performance tests

```

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd backend
npm install
npm run build-cpp  # Compile C++ modules
npm start
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Agent Deployment
```bash
cd agent
pip install -r requirements.txt
python agent.py --server http://localhost:3000
```

## 🎨 Features

- ✅ Real-time 3D network topology visualization
- ✅ Auto-discovery via subnet scanning
- ✅ Live health monitoring (CPU, RAM, latency)
- ✅ Fault detection with color coding (Green/Yellow/Red)
- ✅ Animated traffic flow visualization
- ✅ Interactive node details panel
- ✅ WebSocket-based real-time updates
- ✅ Support for 200+ concurrent nodes

## 🔧 Configuration

### Backend (.env)
```
PORT=3000
WEBSOCKET_PORT=3001
HEALTH_CHECK_INTERVAL=10000
```

### Agent (config.json)
```json
{
  "server_url": "http://localhost:3000",
  "update_interval": 2,
  "node_id": "auto"
}
```

## 📊 Status Indicators

| Color | Status | Condition |
|-------|--------|-----------|
| 🟢 Green | Healthy | Normal operation, latency < 50ms |
| 🟡 Yellow | Warning | High latency (50-200ms) or high resource usage |
| 🔴 Red | Down | No heartbeat for > 10 seconds |

## 🧪 Testing

```bash
# Run fake agents (simulates 50 nodes)
cd tests
python fake-agent.py --count 50

# Run stress test
cd tests
node stress-test.js
```

## 📝 License

MIT License - See LICENSE file for details
