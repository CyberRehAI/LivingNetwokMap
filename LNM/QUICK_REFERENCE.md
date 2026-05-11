# LiveNetViz 3D - Quick Reference Cheat Sheet

## 🎯 One-Line Summary
Real-time 3D network monitoring system that visualizes device health and topology.

---

## 🏗 Architecture (3 Components)

```
Agent (Python) → Backend (Node.js) → Frontend (Three.js)
   Collects         Processes            Visualizes
   Metrics          & Stores             in 3D
```

---

## 📊 Key Numbers to Remember

| Metric | Value |
|--------|-------|
| Agent update interval | 2 seconds |
| Health check interval | 10 seconds |
| Node timeout | 10 seconds |
| Backend port | 3000 |
| Frontend port | 5173 |
| Max tested nodes | 200+ |
| Network scan time | 8 seconds (254 IPs) |
| Frontend FPS | 60 FPS |

---

## 🎨 Status Colors

| Color | Status | Condition |
|-------|--------|-----------|
| 🟢 Green | Healthy | CPU < 80%, RAM < 85%, Latency < 200ms |
| 🟡 Yellow | Warning | CPU > 80% OR RAM > 85% OR Latency > 200ms |
| 🔴 Red | Down | No update for > 10 seconds |

---

## 🔄 Data Flow (Simple)

```
1. Agent collects metrics (CPU, RAM, network)
2. Agent POST /api/update → Backend
3. Backend stores in memory
4. Backend emits WebSocket event
5. Frontend receives event
6. Frontend updates 3D node
7. Renderer shows updated node
```

---

## 💻 Technologies & Why

| Technology | Purpose | Why Chosen |
|------------|---------|------------|
| **Node.js** | Backend server | Real-time, event-driven, WebSocket support |
| **Three.js** | 3D visualization | Industry standard, WebGL, 60 FPS |
| **Python** | Agent | Easy deploy, cross-platform, psutil library |
| **C++** | Network scanner | 50x faster, multi-threading, performance |
| **Socket.IO** | Real-time comm | Low latency, auto-reconnect, events |

---

## 📁 Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `agent/agent.py` | Python agent | 500+ |
| `backend/server.js` | Main server | 300+ |
| `backend/routes/update.js` | Update endpoint | 150 |
| `frontend/src/main.js` | Main app | 400+ |
| `frontend/src/3d/NodeRenderer.js` | 3D nodes | 400+ |
| `backend/cpp/scanner.cpp` | C++ scanner | 500+ |

---

## 🚀 How to Start

```powershell
# Quick start
python start.py

# Or manually:
# Terminal 1: cd backend && npm start
# Terminal 2: cd frontend && npm run dev
# Terminal 3: cd agent && python agent.py --server http://localhost:3000
```

---

## ❓ Common Questions - Quick Answers

**Q: What does it do?**  
A: Monitors network devices in real-time and shows them in 3D.

**Q: Why 3D?**  
A: Better visualization, can show more nodes, more intuitive.

**Q: How real-time?**  
A: WebSocket updates every 2 seconds, 60 FPS rendering.

**Q: How does it detect faults?**  
A: Health checker runs every 10s, marks nodes as down if no update.

**Q: How does scanning work?**  
A: C++ multi-threaded scanner, 50 concurrent, 8s for 254 IPs.

**Q: What are limitations?**  
A: No persistence, no auth, slows down at 500+ nodes.

**Q: How to scale?**  
A: Add Redis, Node.js cluster, LOD rendering.

---

## 🔑 Key Concepts

1. **Event-Driven**: Backend uses events (node-added, node-updated)
2. **In-Memory Storage**: Fast but not persistent (Map data structure)
3. **WebSocket**: Real-time bidirectional communication
4. **Health Checker**: Background worker detects timeouts
5. **Color Coding**: Visual status indication (green/yellow/red)
6. **Topology**: Network connections visualized as lines
7. **Multi-threaded**: C++ scanner uses 50 threads for speed

---

## 📝 Data Structure (Node)

```javascript
{
  nodeId: "hostname-abc123",
  hostname: "server-01",
  ip: "192.168.1.100",
  cpu: 45.2,        // 0-100%
  ram: 62.5,        // 0-100%
  disk: 78.3,       // 0-100%
  latency: 5,       // milliseconds
  status: "healthy", // healthy/warning/down
  sent: 15000,       // bytes/sec
  received: 32000,  // bytes/sec
  lastUpdate: timestamp
}
```

---

## 🎯 Viva Tips

1. ✅ Start with problem → solution
2. ✅ Draw architecture diagram
3. ✅ Explain data flow
4. ✅ Mention WHY for each technology
5. ✅ Be honest about limitations
6. ✅ Know the numbers (intervals, timeouts)
7. ✅ Explain 3D advantage over 2D
8. ✅ Talk about real-time (WebSocket)
9. ✅ Mention scalability improvements

---

## 🔧 API Endpoints (Important Ones)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/api/nodes` | GET | Get all nodes |
| `/api/update` | POST | Agent sends metrics |
| `/api/scanner/scan` | POST | Scan network subnet |
| `/api/topology` | GET | Get connections |

---

## 📡 WebSocket Events

**Server → Client:**
- `node-added` - New node registered
- `node-updated` - Metrics updated
- `node-status-changed` - Status changed
- `topology-discovered` - Connections found

**Client → Server:**
- `request-nodes` - Get all nodes
- `add-node` - Manually add node
- `remove-node` - Remove node

---

## 🎓 Remember These Points

1. **Real-time**: WebSocket, 2s updates, 60 FPS
2. **Fault Detection**: 10s timeout, automatic status change
3. **Performance**: C++ scanner, in-memory storage, event-driven
4. **Visualization**: Three.js, color-coded, interactive
5. **Scalability**: Tested 200+, can improve with Redis/cluster

---

**Good luck! 🚀**

