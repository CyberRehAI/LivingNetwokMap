# Frontend to Backend Function Mapping

This document maps every frontend action to the specific backend file and function that handles it.

---

## 🔌 WebSocket Connection & Events

### **1. Frontend Connects to WebSocket**
**Frontend:** `frontend/src/realtime/socket.js` - `connect()` (Line 16-29)

**Backend:** `backend/server.js`
- **Function:** `io.on('connection', ...)` (Line 123-178)
- **What it does:** 
  - Tracks client in `connectedClients` Set (Line 124)
  - Sends `initial-state` event with all nodes and connections (Lines 128-132)

---

### **2. Frontend Receives Initial State**
**Frontend:** `frontend/src/main.js` - `socket.on('initial-state')` (Line 144-147)

**Backend:** `backend/server.js`
- **Function:** `socket.emit('initial-state', ...)` (Lines 128-132)
- **What it sends:**
  - All nodes from `global.nodesMap`
  - All connections from `global.connections`
  - Timestamp

---

### **3. Frontend Requests All Nodes**
**Frontend:** `frontend/src/realtime/socket.js` - `requestNodes()` (Line 66-68)
- Sends: `socket.emit('request-nodes')`

**Backend:** `backend/server.js`
- **Function:** `socket.on('request-nodes', ...)` (Lines 135-137)
- **What it does:** Sends all nodes via `nodes-update` event

---

### **4. Frontend Requests Topology**
**Frontend:** `frontend/src/realtime/socket.js` - `requestTopology()` (Line 71-73)
- Sends: `socket.emit('request-topology')`

**Backend:** `backend/server.js`
- **Function:** `socket.on('request-topology', ...)` (Lines 140-142)
- **What it does:** Sends all connections via `topology-update` event

---

## 📊 Node Management

### **5. Agent Sends Node Update**
**Frontend/Agent:** `agent/agent.py` - `send_update()` (Line 206-242)
- Sends: `POST /api/update` with node metrics

**Backend:** `backend/routes/update.js`
- **Function:** `router.post('/', ...)` (Lines 14-81)
- **What it does:**
  - Validates nodeId and ip (Lines 19-24)
  - Checks if new node (Line 27)
  - Stores in `global.nodesMap` (Line 40)
  - Compares previous status (Lines 36-37)
  - Emits WebSocket events:
    - `node-added` (if new) - Line 48
    - `node-status-changed` (if status changed) - Line 53
    - `node-updated` (always) - Line 57

---

### **6. Frontend Receives Node Added**
**Frontend:** `frontend/src/main.js` - `socket.on('node-added')` (Line 150-154)

**Backend:** `backend/routes/update.js` OR `backend/server.js`
- **Emitted from:**
  - `routes/update.js` Line 48 (when agent sends update)
  - `server.js` Line 152 (when manually added via WebSocket)
  - `routes/nodes.js` Line 131 (when manually added via API)
  - `routes/scanner.js` Line 75 (when discovered by scanner)

---

### **7. Frontend Receives Node Updated**
**Frontend:** `frontend/src/main.js` - `socket.on('node-updated')` (Line 156-158)

**Backend:** `backend/routes/update.js`
- **Function:** `io.emit('node-updated', updatedNode)` (Line 57)
- **Also emitted from:** `routes/nodes.js` Line 217 (metadata update)

---

### **8. Frontend Receives Node Status Changed**
**Frontend:** `frontend/src/main.js` - `socket.on('node-status-changed')` (Line 166-173)

**Backend:** `backend/routes/update.js` OR `backend/server.js`
- **Emitted from:**
  - `routes/update.js` Line 53 (when agent reports status change)
  - `server.js` Line 211 (when health checker detects timeout)

---

### **9. Frontend Receives Node Removed**
**Frontend:** `frontend/src/main.js` - `socket.on('node-removed')` (Line 160-164)

**Backend:** `backend/server.js` OR `backend/routes/nodes.js`
- **Emitted from:**
  - `server.js` Line 165 (when removed via WebSocket)
  - `routes/nodes.js` Line 172 (when removed via API)

---

### **10. Frontend Manually Adds Node (via WebSocket)**
**Frontend:** Can send `socket.emit('add-node', nodeData)`

**Backend:** `backend/server.js`
- **Function:** `socket.on('add-node', ...)` (Lines 145-153)
- **What it does:**
  - Stores in `global.nodesMap` with `manual: true` flag
  - Broadcasts `node-added` event to all clients

---

### **11. Frontend Manually Adds Node (via API)**
**Frontend:** Can send `POST /api/nodes`

**Backend:** `backend/routes/nodes.js`
- **Function:** `router.post('/', ...)` (Lines 99-146)
- **What it does:**
  - Validates nodeId and ip (Lines 104-109)
  - Creates node with default values (Lines 111-125)
  - Stores in `global.nodesMap` (Line 127)
  - Broadcasts `node-added` event (Line 131)

---

### **12. Frontend Removes Node (via WebSocket)**
**Frontend:** Can send `socket.emit('remove-node', nodeId)`

**Backend:** `backend/server.js`
- **Function:** `socket.on('remove-node', ...)` (Lines 156-166)
- **What it does:**
  - Deletes from `global.nodesMap` (Line 158)
  - Removes associated connections (Lines 161-163)
  - Broadcasts `node-removed` event (Line 165)

---

### **13. Frontend Removes Node (via API)**
**Frontend:** Can send `DELETE /api/nodes/:nodeId`

**Backend:** `backend/routes/nodes.js`
- **Function:** `router.delete('/:nodeId', ...)` (Lines 152-187)
- **What it does:**
  - Checks if node exists (Lines 156-161)
  - Deletes from `global.nodesMap` (Line 163)
  - Removes associated connections (Lines 166-168)
  - Broadcasts `node-removed` event (Line 172)

---

### **14. Frontend Gets All Nodes (via API)**
**Frontend:** Can send `GET /api/nodes`

**Backend:** `backend/routes/nodes.js`
- **Function:** `router.get('/', ...)` (Lines 15-40)
- **What it does:**
  - Gets all nodes from `global.nodesMap` (Line 17)
  - Optional filtering by status (Lines 20-25)
  - Returns JSON response with nodes array

---

### **15. Frontend Gets Specific Node (via API)**
**Frontend:** Can send `GET /api/nodes/:nodeId`

**Backend:** `backend/routes/nodes.js`
- **Function:** `router.get('/:nodeId', ...)` (Lines 69-93)
- **What it does:**
  - Gets node from `global.nodesMap` (Line 72)
  - Returns 404 if not found (Lines 74-79)
  - Returns node data

---

### **16. Frontend Updates Node Metadata (via API)**
**Frontend:** Can send `PUT /api/nodes/:nodeId`

**Backend:** `backend/routes/nodes.js`
- **Function:** `router.put('/:nodeId', ...)` (Lines 193-232)
- **What it does:**
  - Updates allowed fields: hostname, label, group, position, metadata (Lines 206-211)
  - Does NOT update health metrics (those come from `/api/update`)
  - Broadcasts `node-updated` event (Line 217)

---

### **17. Frontend Gets Network Statistics**
**Frontend:** Can send `GET /api/nodes/stats`

**Backend:** `backend/routes/nodes.js`
- **Function:** `router.get('/stats', ...)` (Lines 46-63)
- **Uses:** `utils/checkHealth.js` - `calculateNetworkStats()` (Line 49)
- **What it does:**
  - Calculates aggregate statistics (total, healthy, warning, down nodes)
  - Calculates averages (CPU, RAM, latency)
  - Sums total traffic
  - Returns statistics object

---

## 🔗 Topology Management

### **18. Frontend Receives Connection Added**
**Frontend:** `frontend/src/main.js` - `socket.on('connection-added')` (Line 176-178)

**Backend:** `backend/routes/topology.js`
- **Emitted from:** `router.post('/connection', ...)` Line 89

---

### **19. Frontend Receives Topology Discovered**
**Frontend:** `frontend/src/main.js` - `socket.on('topology-discovered')` (Line 180-183)

**Backend:** `backend/routes/topology.js`
- **Emitted from:** `router.post('/auto-discover', ...)` Line 202

---

### **20. Frontend Gets All Connections (via API)**
**Frontend:** Can send `GET /api/topology`

**Backend:** `backend/routes/topology.js`
- **Function:** `router.get('/', ...)` (Lines 14-29)
- **What it does:** Returns all connections from `global.connections`

---

### **21. Frontend Adds Connection (via API)**
**Frontend:** Can send `POST /api/topology/connection`

**Backend:** `backend/routes/topology.js`
- **Function:** `router.post('/connection', ...)` (Lines 35-105)
- **What it does:**
  - Validates source and target exist (Lines 48-60)
  - Checks for duplicate connections (Lines 63-74)
  - Creates connection object (Lines 76-83)
  - Adds to `global.connections` (Line 85)
  - Broadcasts `connection-added` event (Line 89)

---

### **22. Frontend Removes Connection (via API)**
**Frontend:** Can send `DELETE /api/topology/connection/:connectionId`

**Backend:** `backend/routes/topology.js`
- **Function:** `router.delete('/connection/:connectionId', ...)` (Lines 111-144)
- **What it does:**
  - Finds connection by ID (Line 115)
  - Removes from `global.connections` (Line 124)
  - Broadcasts `connection-removed` event (Line 128)

---

### **23. Frontend Auto-Discovers Topology**
**Frontend:** `frontend/src/main.js` - `autoDiscoverTopology()` (Lines 447-465)
- Sends: `POST /api/topology/auto-discover`

**Backend:** `backend/routes/topology.js`
- **Function:** `router.post('/auto-discover', ...)` (Lines 150-220)
- **What it does:**
  - Finds or designates gateway node (Lines 163-171)
  - Connects all other nodes to gateway (Lines 176-198)
  - Creates star topology
  - Broadcasts `topology-discovered` event (Line 202)

---

### **24. Frontend Updates Connection (via API)**
**Frontend:** Can send `PUT /api/topology/connection/:connectionId`

**Backend:** `backend/routes/topology.js`
- **Function:** `router.put('/connection/:connectionId', ...)` (Lines 226-261)
- **What it does:**
  - Updates bandwidth and type (Lines 240-241)
  - Broadcasts `connection-updated` event (Line 245)

---

## 🔍 Network Scanning

### **25. Frontend Scans Network**
**Frontend:** `frontend/src/main.js` - `scanNetwork()` (Lines 416-445)
- Sends: `POST /api/scanner/scan` with subnet

**Backend:** `backend/routes/scanner.js`
- **Function:** `router.post('/scan', ...)` (Lines 24-102)
- **What it does:**
  - Validates subnet format (Lines 29-34)
  - Calls C++ scanner or JavaScript fallback (Lines 37-40, 45)
  - Creates nodes for discovered devices (Lines 51-77)
  - Sets `discovered: true` flag
  - Broadcasts `node-added` events (Line 75)
  - Returns scan results

**C++ Scanner:** `backend/cpp/scanner.cpp`
- **Called from:** `routes/scanner.js` Line 45
- **Function:** `ScanSubnet()` (N-API wrapper, Lines 290-333)
- **What it does:**
  - Creates `NetworkScanner` instance (Line 309)
  - Calls `scanSubnet()` which:
    - Parses subnet (e.g., `192.168.1.0/24`)
    - Creates 50 concurrent threads (Line 260)
    - Each thread calls `scanHost()` for one IP (Line 267)
    - `scanHost()` calls `pingHost()` (ICMP ping) (Line 219)
    - Uses mutex for thread-safe result storage (Line 229)
    - Returns vector of active hosts
  - Converts C++ results to JavaScript object (Lines 316-332)
  - Returns: `{ activeHosts, totalScanned, duration }`

---

### **26. Frontend Gets Scanner Status**
**Frontend:** Can send `GET /api/scanner/status`

**Backend:** `backend/routes/scanner.js`
- **Function:** `router.get('/status', ...)` (Lines 183-193)
- **What it does:**
  - Returns if C++ scanner is available
  - Returns scanner capabilities

---

## ⚙️ Background Processes

### **27. Health Checker Detects Timeout**
**Backend:** `backend/server.js`
- **Function:** `startHealthChecker()` (Lines 184-217)
- **Runs:** Every 10 seconds (HEALTH_CHECK_INTERVAL)
- **What it does:**
  - Checks each node's `lastUpdate` timestamp (Line 190)
  - If > 10 seconds: marks as 'down' (Lines 193-198)
  - Broadcasts `nodes-status-changed` event (Line 211)

**Frontend Receives:** `frontend/src/main.js` - `socket.on('node-status-changed')` (Line 166)

---

### **28. Statistics Reporter**
**Backend:** `backend/server.js`
- **Function:** `startStatsReporter()` (Lines 223-244)
- **Runs:** Every 60 seconds
- **What it does:**
  - Collects system statistics (Lines 225-231)
  - Logs statistics (Line 233)
  - Broadcasts `server-stats` event (Lines 236-241)

**Frontend Can Receive:** `socket.on('server-stats', ...)` (if implemented)

---

## 🏥 Health Check

### **29. Agent Measures Latency**
**Agent:** `agent/agent.py` - `_measure_latency()` (Line 143-155)
- Sends: `GET /health`

**Backend:** `backend/server.js`
- **Function:** `app.get('/health', ...)` (Lines 91-93)
- **What it does:** Returns `{ status: 'ok', timestamp: Date.now() }`

---

## 📋 Quick Reference Table

| Frontend Action | Backend File | Function/Endpoint | Line(s) |
|----------------|--------------|-------------------|---------|
| **WebSocket Connect** | `server.js` | `io.on('connection')` | 123-178 |
| **Initial State** | `server.js` | `socket.emit('initial-state')` | 128-132 |
| **Request Nodes** | `server.js` | `socket.on('request-nodes')` | 135-137 |
| **Request Topology** | `server.js` | `socket.on('request-topology')` | 140-142 |
| **Agent Update** | `routes/update.js` | `POST /api/update` | 14-81 |
| **Node Added Event** | `routes/update.js` | `io.emit('node-added')` | 48 |
| **Node Updated Event** | `routes/update.js` | `io.emit('node-updated')` | 57 |
| **Status Changed Event** | `routes/update.js` | `io.emit('node-status-changed')` | 53 |
| **Get All Nodes** | `routes/nodes.js` | `GET /api/nodes` | 15-40 |
| **Get Node Stats** | `routes/nodes.js` | `GET /api/nodes/stats` | 46-63 |
| **Get Specific Node** | `routes/nodes.js` | `GET /api/nodes/:nodeId` | 69-93 |
| **Add Node** | `routes/nodes.js` | `POST /api/nodes` | 99-146 |
| **Remove Node** | `routes/nodes.js` | `DELETE /api/nodes/:nodeId` | 152-187 |
| **Update Node** | `routes/nodes.js` | `PUT /api/nodes/:nodeId` | 193-232 |
| **Get Topology** | `routes/topology.js` | `GET /api/topology` | 14-29 |
| **Add Connection** | `routes/topology.js` | `POST /api/topology/connection` | 35-105 |
| **Remove Connection** | `routes/topology.js` | `DELETE /api/topology/connection/:id` | 111-144 |
| **Auto-Discover** | `routes/topology.js` | `POST /api/topology/auto-discover` | 150-220 |
| **Scan Network** | `routes/scanner.js` | `POST /api/scanner/scan` | 24-102 |
| **C++ Scanner** | `cpp/scanner.cpp` | `ScanSubnet()` (N-API) | 290-333 |
| **Scanner Status** | `routes/scanner.js` | `GET /api/scanner/status` | 183-193 |
| **Health Check** | `server.js` | `GET /health` | 91-93 |
| **Health Checker** | `server.js` | `startHealthChecker()` | 184-217 |
| **Stats Reporter** | `server.js` | `startStatsReporter()` | 223-244 |

---

## 🔄 Complete Data Flow Examples

### **Example 1: Agent Sends Update**
```
Agent (agent.py)
  ↓ POST /api/update
routes/update.js (Line 14)
  ↓ Validate & Store
global.nodesMap.set()
  ↓ Emit WebSocket
io.emit('node-updated')
  ↓ WebSocket Event
Frontend (main.js Line 156)
  ↓ Update 3D Scene
NodeRenderer.updateNode()
```

### **Example 2: Frontend Scans Network**
```
Frontend (main.js Line 416)
  ↓ POST /api/scanner/scan
routes/scanner.js (Line 24)
  ↓ Call C++ Scanner
scanner.scanSubnet()
  ↓ Create Nodes
global.nodesMap.set()
  ↓ Emit WebSocket
io.emit('node-added')
  ↓ WebSocket Event
Frontend (main.js Line 150)
  ↓ Add to 3D Scene
NodeRenderer.addNode()
```

### **Example 3: Health Checker Detects Failure**
```
Background Worker (server.js Line 184)
  ↓ Runs every 10 seconds
Check lastUpdate timestamps
  ↓ If > 10 seconds
Mark node as 'down'
  ↓ Emit WebSocket
io.emit('nodes-status-changed')
  ↓ WebSocket Event
Frontend (main.js Line 166)
  ↓ Update Node Color
NodeRenderer.updateNode() → Red
```

---

## 🎯 Key Takeaways

1. **Most Real-Time Updates:** Handled by `routes/update.js` (agent updates)
2. **Node Management:** Handled by `routes/nodes.js` (CRUD operations)
3. **Topology:** Handled by `routes/topology.js` (connections)
4. **Network Scanning:** Handled by `routes/scanner.js` (discovery)
5. **WebSocket Events:** All emitted from `server.js` or route files
6. **Background Workers:** `server.js` (health checker, stats reporter)
7. **Health Check:** `server.js` Line 91 (simple endpoint)

---

**This mapping helps you understand exactly which backend file handles each frontend action! 🎓**

