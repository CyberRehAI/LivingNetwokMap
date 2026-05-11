# LiveNetViz 3D - Viva Preparation Guide

## 📚 Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Component Deep Dive](#component-deep-dive)
4. [Data Flow & Communication](#data-flow--communication)
5. [Key Technologies & Why They Were Chosen](#key-technologies--why-they-were-chosen)
6. [How to Explain Each Component](#how-to-explain-each-component)
7. [Common Viva Questions & Answers](#common-viva-questions--answers)
8. [Technical Details to Remember](#technical-details-to-remember)

---

## Project Overview

### What is LiveNetViz 3D?

**LiveNetViz 3D** is a **real-time network monitoring and visualization system** that:
- Monitors network devices (servers, computers, IoT devices) in real-time
- Visualizes network topology in an interactive 3D environment
- Detects faults and health issues automatically
- Provides live metrics (CPU, RAM, network traffic, latency)
- Auto-discovers devices on the network

### Problem It Solves

**Traditional network monitoring tools** are:
- 2D and hard to visualize complex networks
- Not real-time
- Difficult to understand network relationships
- Expensive enterprise solutions

**Our solution** provides:
- ✅ Real-time 3D visualization
- ✅ Free and open-source
- ✅ Easy to understand visual representation
- ✅ Automatic fault detection
- ✅ Live health monitoring

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    LiveNetViz 3D System                      │
└─────────────────────────────────────────────────────────────┘

  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
  │   Agents     │         │   Backend    │         │  Frontend    │
  │  (Python)    │────────▶│  (Node.js)   │◀────────│  (Three.js)  │
  │              │  HTTP   │              │ WebSocket│              │
  └──────────────┘         └──────────────┘         └──────────────┘
        │                         │                         │
    Collect                   Process                   Visualize
    Metrics                   & Store                  in 3D
```

### Three Main Components

1. **Node Agents (Python)** - Installed on network devices
   - Collects system metrics (CPU, RAM, network)
   - Sends updates to backend every 2 seconds
   - Lightweight (< 50MB RAM)

2. **Backend Server (Node.js + C++)** - Central hub
   - Receives updates from agents
   - Stores node data in memory
   - Broadcasts updates via WebSocket
   - Network scanning (C++ for performance)

3. **Frontend Client (Three.js)** - 3D visualization
   - Interactive 3D scene
   - Real-time updates via WebSocket
   - User controls and panels

---

## Component Deep Dive

### 1. Node Agent (Python)

**Location:** `agent/agent.py`

**Purpose:** Collect system metrics and report to backend

**Key Functions:**

```python
# Main components:
- NetworkAgent class
  - collect_metrics()      # Gathers CPU, RAM, disk, network stats
  - send_update()          # POST to /api/update
  - _measure_latency()     # Measures response time to backend
  - _determine_status()    # Calculates healthy/warning/down
```

**What it does:**
1. Every 2 seconds:
   - Collects CPU usage (psutil)
   - Collects RAM usage (psutil)
   - Collects disk usage (psutil)
   - Calculates network traffic (bytes/sec)
   - Measures latency to backend
   - Determines status (healthy/warning/down)

2. Sends JSON payload to backend:
```json
{
  "nodeId": "hostname-abc123",
  "hostname": "server-01",
  "ip": "192.168.1.100",
  "cpu": 45.2,
  "ram": 62.5,
  "disk": 78.3,
  "latency": 5,
  "status": "healthy",
  "sent": 15000,
  "received": 32000
}
```

3. Retry logic with exponential backoff if connection fails

**Technologies:**
- Python 3.8+
- `psutil` - System metrics library
- `requests` - HTTP client

---

### 2. Backend Server (Node.js)

**Location:** `backend/server.js`

**Purpose:** Central data hub and real-time distribution

**Key Components:**

#### a) REST API (Express.js)
- `GET /api/nodes` - Get all nodes
- `POST /api/update` - Receive agent updates
- `GET /api/topology` - Get network connections
- `POST /api/scanner/scan` - Scan network subnet

#### b) WebSocket Server (Socket.IO)
- Real-time bidirectional communication
- Events:
  - `node-added` - New node registered
  - `node-updated` - Metrics updated
  - `node-status-changed` - Status changed
  - `topology-discovered` - Connections found

#### c) In-Memory Storage
```javascript
global.nodesMap = Map<nodeId, NodeData>
global.connections = Array<Connection>
```

#### d) Health Checker (Background Worker)
- Runs every 10 seconds
- Checks if nodes haven't updated in > 10 seconds
- Marks them as "down" if timeout
- Broadcasts status changes

#### e) C++ Network Scanner
- High-performance subnet scanning
- Multi-threaded (50 concurrent)
- ICMP ping + TCP fallback
- Scans /24 networks (254 IPs) in ~8 seconds

**Data Flow:**
1. Agent sends POST `/api/update`
2. Backend validates and stores in `nodesMap`
3. Detects if status changed
4. Broadcasts via WebSocket to all connected clients
5. Frontend receives and updates 3D visualization

---

### 3. Frontend Client (Three.js)

**Location:** `frontend/src/main.js`

**Purpose:** Interactive 3D visualization

**Key Components:**

#### a) Three.js Scene Setup
- Scene, Camera, Renderer
- OrbitControls (mouse/touch navigation)
- Lighting (ambient + directional)

#### b) NodeRenderer (`src/3d/NodeRenderer.js`)
- Creates 3D spheres for each node
- Color coding:
  - 🟢 Green = Healthy
  - 🟡 Yellow = Warning
  - 🔴 Red = Down
- Labels with hostnames
- Click detection for details panel

#### c) LinesRenderer (`src/3d/LinesRenderer.js`)
- Draws connection lines between nodes
- Animated particles for traffic flow
- Updates based on topology data

#### d) SocketClient (`src/realtime/socket.js`)
- Connects to backend WebSocket
- Listens for real-time events
- Updates 3D scene when data changes

#### e) UI Controller (`src/ui/UI.js`)
- Stats panel (total nodes, healthy, warning, down)
- Node details panel (on click)
- Control buttons (scan, auto-discover, layout)
- Notifications

**Rendering Loop:**
```javascript
animate() {
  requestAnimationFrame(animate);
  // Update node positions
  // Update connections
  // Update camera
  renderer.render(scene, camera);
}
```

**Layouts:**
- Sphere - Nodes arranged on sphere surface
- Grid - 2D grid layout
- Ring - Circular arrangement
- Random - Random positions

---

## Data Flow & Communication

### Complete Update Cycle

```
1. Agent collects metrics (every 2s)
   ↓
2. Agent POST /api/update → Backend
   ↓
3. Backend validates & stores in nodesMap
   ↓
4. Backend detects status change (if any)
   ↓
5. Backend emits WebSocket event (node-updated)
   ↓
6. Frontend receives event
   ↓
7. Frontend updates 3D node (color, position, metrics)
   ↓
8. Renderer renders frame (60 FPS)
```

### Network Discovery Flow

```
1. User clicks "Scan Network" in frontend
   ↓
2. Frontend POST /api/scanner/scan { subnet: "192.168.1.0/24" }
   ↓
3. Backend calls C++ scanner module
   ↓
4. C++ scanner pings all 254 IPs (multi-threaded)
   ↓
5. Returns list of active hosts
   ↓
6. Backend creates nodes for each host
   ↓
7. Backend emits node-added events
   ↓
8. Frontend receives and adds nodes to 3D scene
```

### Topology Discovery Flow

```
1. User clicks "Auto Discover Topology"
   ↓
2. Frontend POST /api/topology/auto-discover
   ↓
3. Backend analyzes node IPs and creates connections
   (Based on subnet relationships)
   ↓
4. Backend emits topology-discovered event
   ↓
5. Frontend receives connections
   ↓
6. LinesRenderer draws connection lines
```

---

## Key Technologies & Why They Were Chosen

### Backend: Node.js
**Why?**
- ✅ Excellent for real-time applications (WebSocket)
- ✅ Event-driven (perfect for network monitoring)
- ✅ Large ecosystem (Express, Socket.IO)
- ✅ Can integrate C++ for performance-critical parts

### Frontend: Three.js
**Why?**
- ✅ Industry-standard 3D library
- ✅ WebGL-based (hardware accelerated)
- ✅ No framework overhead (vanilla JS)
- ✅ Great performance (60 FPS)

### Agent: Python
**Why?**
- ✅ Easy to deploy on any OS
- ✅ `psutil` library for system metrics
- ✅ Lightweight and resource-efficient
- ✅ Cross-platform (Windows, Linux, macOS)

### C++ Network Scanner
**Why?**
- ✅ Performance: 50x faster than JavaScript
- ✅ Multi-threading support
- ✅ Direct socket access
- ✅ Can scan 254 IPs in 8 seconds

### WebSocket (Socket.IO)
**Why?**
- ✅ Real-time bidirectional communication
- ✅ Low latency (< 10ms)
- ✅ Auto-reconnection
- ✅ Event-based architecture

---

## How to Explain Each Component

### When Asked: "What does the agent do?"

**Answer:**
"The agent is a lightweight Python script installed on each network device. It continuously monitors system resources like CPU, RAM, disk usage, and network traffic. Every 2 seconds, it collects these metrics, calculates the node's health status, and sends this data to the backend server via HTTP POST. It also measures latency to the backend to ensure connectivity. If the connection fails, it uses exponential backoff retry logic to reconnect."

**Key Points:**
- Lightweight (< 50MB RAM)
- Cross-platform
- Automatic retry on failure
- Configurable update intervals

---

### When Asked: "How does the backend work?"

**Answer:**
"The backend is a Node.js server that acts as the central hub. It has two main communication channels: REST API for agent updates and WebSocket for real-time frontend updates. When an agent sends metrics via POST /api/update, the backend stores them in an in-memory Map for fast access. It then broadcasts these updates to all connected frontend clients via WebSocket. There's also a background health checker that runs every 10 seconds to detect nodes that haven't updated and marks them as down. For network scanning, we use a C++ addon for high-performance subnet scanning."

**Key Points:**
- In-memory storage (fast, but not persistent)
- WebSocket for real-time updates
- Background health checking
- C++ scanner for performance

---

### When Asked: "How does the 3D visualization work?"

**Answer:**
"The frontend uses Three.js, a WebGL-based 3D library, to render an interactive 3D scene. Each network node is represented as a colored sphere - green for healthy, yellow for warning, red for down. The scene uses OrbitControls so users can rotate, zoom, and pan. When the backend sends real-time updates via WebSocket, the frontend updates the corresponding 3D node's color, position, and displays metrics in a details panel. Connection lines between nodes are drawn using Three.js lines, and we animate particles along these lines to show data flow. The rendering loop runs at 60 FPS for smooth animation."

**Key Points:**
- Three.js for 3D rendering
- Color-coded nodes
- Interactive controls
- Real-time updates
- 60 FPS rendering

---

### When Asked: "How does network scanning work?"

**Answer:**
"Network scanning is done by a C++ addon for performance. When a user enters a subnet like 192.168.1.0/24, the backend calls the C++ scanner which uses multi-threaded ICMP ping (or TCP fallback) to check all 254 IPs. It can scan concurrently with 50 threads, completing a full /24 scan in about 8 seconds. For each active host found, it resolves the hostname and creates a node entry. The results are then broadcast to all frontend clients via WebSocket."

**Key Points:**
- C++ for performance
- Multi-threaded (50 concurrent)
- ICMP + TCP fallback
- Fast (8 seconds for 254 IPs)

---

## Common Viva Questions & Answers

### Q1: "What is the main purpose of this project?"

**Answer:**
"The main purpose is to provide real-time network monitoring and visualization in a 3D environment. It helps network administrators quickly identify healthy, warning, and down nodes, understand network topology, and monitor system resources across multiple devices simultaneously."

---

### Q2: "Why did you choose 3D visualization instead of 2D?"

**Answer:**
"3D visualization provides several advantages: (1) Better spatial understanding of network topology, (2) Can visualize more nodes without clutter, (3) More engaging and intuitive, (4) Can show relationships between nodes more clearly with connection lines in 3D space, (5) Modern web browsers support WebGL, making it accessible."

---

### Q3: "How do you ensure real-time updates?"

**Answer:**
"We use WebSocket (Socket.IO) for bidirectional real-time communication. Agents send updates every 2 seconds via HTTP POST, and the backend immediately broadcasts these via WebSocket to all connected frontend clients. This ensures sub-second latency between data collection and visualization. The frontend rendering loop runs at 60 FPS to smoothly update the 3D scene."

---

### Q4: "What happens if a node goes down?"

**Answer:**
"The backend has a background health checker that runs every 10 seconds. If a node hasn't sent an update in more than 10 seconds, it's automatically marked as 'down'. The status change is immediately broadcast to all frontend clients via WebSocket, and the 3D node changes from green/yellow to red. When the node recovers and sends an update, it automatically transitions back to healthy status."

---

### Q5: "How does the system scale?"

**Answer:**
"Currently tested with 200+ concurrent nodes. The system uses in-memory storage for fast access (O(1) lookups), event-driven architecture for scalability, and C++ for CPU-intensive operations. For production scaling, we can add Redis for distributed state, use Node.js cluster mode for multiple workers, and implement level-of-detail (LOD) rendering in the frontend for handling 500+ nodes."

---

### Q6: "What are the limitations of your system?"

**Answer:**
"Current limitations: (1) No data persistence - data is lost on restart (can add Redis/database), (2) No authentication - suitable for local network only, (3) Frontend may slow down with 500+ nodes (can add LOD and frustum culling), (4) C++ scanner requires admin privileges for ICMP on some systems (has TCP fallback). These are planned improvements for production deployment."

---

### Q7: "How do you measure network traffic?"

**Answer:**
"The agent uses Python's `psutil` library to get network I/O counters. It stores the previous values and calculates the delta (difference) between checks. By dividing the delta by the time interval, we get bytes per second. This gives us real-time upload and download speeds for each node."

---

### Q8: "What is the difference between healthy, warning, and down status?"

**Answer:**
"- **Healthy (Green)**: CPU < 80%, RAM < 85%, latency < 200ms, and node is responding
- **Warning (Yellow)**: CPU > 80% OR RAM > 85% OR latency > 200ms, but still responding
- **Down (Red)**: No update received for > 10 seconds OR latency measurement failed"

---

### Q9: "How does topology discovery work?"

**Answer:**
"When a user clicks 'Auto Discover Topology', the backend analyzes all registered nodes' IP addresses. It creates connections based on subnet relationships - nodes in the same subnet are likely connected. The algorithm can also use routing tables if available. These connections are then visualized as lines in the 3D scene, with animated particles showing data flow direction."

---

### Q10: "What technologies did you use and why?"

**Answer:**
"- **Node.js**: Excellent for real-time apps, event-driven, great ecosystem
- **Three.js**: Industry-standard 3D library, WebGL-accelerated, high performance
- **Python**: Easy deployment, cross-platform, great system monitoring libraries
- **C++**: For network scanning - 50x faster than JavaScript, multi-threading support
- **Socket.IO**: Real-time WebSocket with auto-reconnection, event-based
- **Express**: Simple REST API framework, widely used"

---

## Technical Details to Remember

### Ports
- Backend: `3000` (HTTP) and `3000` (WebSocket)
- Frontend: `5173` (Vite dev server)

### Update Intervals
- Agent sends updates: Every **2 seconds**
- Health checker runs: Every **10 seconds**
- Node timeout: **10 seconds** (no update = down)

### Status Thresholds
- **Healthy**: CPU < 80%, RAM < 85%, latency < 200ms
- **Warning**: CPU > 80% OR RAM > 85% OR latency > 200ms
- **Down**: No update for > 10 seconds

### Performance Metrics
- Tested with: **200+ nodes**
- Update rate: **100 updates/second**
- Frontend FPS: **60 FPS**
- Network scan: **254 IPs in ~8 seconds**
- Memory usage: **~500MB at 200 nodes**

### Data Structures
```javascript
// Node
{
  nodeId: string,
  hostname: string,
  ip: string,
  cpu: number (0-100),
  ram: number (0-100),
  disk: number (0-100),
  latency: number (ms),
  status: "healthy" | "warning" | "down",
  sent: number (bytes/sec),
  received: number (bytes/sec),
  lastUpdate: timestamp
}

// Connection
{
  id: string,
  source: nodeId,
  target: nodeId,
  bandwidth: number (Mbps),
  type: string
}
```

### Key Files
- `agent/agent.py` - Python agent (500+ lines)
- `backend/server.js` - Main server (300+ lines)
- `backend/routes/update.js` - Update endpoint
- `frontend/src/main.js` - Main app (400+ lines)
- `frontend/src/3d/NodeRenderer.js` - 3D nodes (400+ lines)
- `backend/cpp/scanner.cpp` - C++ scanner (500+ lines)

---

## Quick Reference: How to Start the System

```powershell
# Option 1: Use launcher script
python start.py

# Option 2: Manual start
# Terminal 1: Backend
cd backend
npm install
npm start

# Terminal 2: Frontend
cd frontend
npm install
npm run dev

# Terminal 3: Agent
cd agent
pip install -r requirements.txt
python agent.py --server http://localhost:3000
```

**Access:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Health Check: http://localhost:3000/health

---

## Tips for Viva

1. **Start with the big picture**: Explain the problem, then the solution
2. **Use the architecture diagram**: Draw it if needed
3. **Explain data flow**: Show how data moves from agent → backend → frontend
4. **Mention technologies**: Explain WHY you chose each one
5. **Be honest about limitations**: Shows understanding
6. **Demonstrate if possible**: Have it running on your laptop
7. **Know the numbers**: Update intervals, timeouts, performance metrics
8. **Explain the 3D visualization**: Why it's better than 2D
9. **Talk about real-time**: WebSocket, event-driven architecture
10. **Mention scalability**: How you'd improve it for production

---

## Final Checklist

Before your viva, make sure you can explain:
- [ ] What the project does (problem + solution)
- [ ] The three main components (Agent, Backend, Frontend)
- [ ] How data flows through the system
- [ ] Why you chose each technology
- [ ] How real-time updates work
- [ ] How fault detection works
- [ ] How network scanning works
- [ ] How 3D visualization works
- [ ] System limitations and improvements
- [ ] How to start and use the system

---

**Good luck with your viva! 🎓**

