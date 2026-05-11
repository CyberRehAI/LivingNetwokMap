# Backend Complete Understanding Guide - For Viva

This comprehensive guide covers all backend files with **detailed line-by-line explanations** for main files and **brief explanations** for supporting files.

---

## 📚 Table of Contents

1. [Main Files (Detailed)](#main-files-detailed)
   - [server.js - Main Server](#serverjs---main-server)
   - [routes/update.js - Update Endpoint](#routesupdatejs---update-endpoint)

2. [Supporting Routes (Brief)](#supporting-routes-brief)
   - [routes/nodes.js - Node Management](#routesnodesjs---node-management)
   - [routes/topology.js - Topology Management](#routestopologyjs---topology-management)
   - [routes/scanner.js - Network Scanner](#routesscannerjs---network-scanner)

3. [C++ Scanner Module (Brief)](#c-scanner-module-brief)
   - [cpp/scanner.cpp - High-Performance Network Scanner](#cppscannercpp---high-performance-network-scanner)

4. [Utilities (Brief)](#utilities-brief)
   - [utils/logger.js - Logging](#utilsloggerjs---logging)
   - [utils/checkHealth.js - Health Utilities](#utilscheckhealthjs---health-utilities)

5. [Auto-Discovery (Brief)](#auto-discovery-brief)
   - [auto-discover.js - Network Discovery](#auto-discoverjs---network-discovery)

---

## Main Files (Detailed)

## 📁 `server.js` - Main Server

### **Lines 1-16: File Header & Documentation**
```javascript
/**
 * LiveNetViz 3D - Main Backend Server
 * 
 * This server provides:
 * - REST API for node management
 * - WebSocket real-time updates via Socket.IO
 * - In-memory node storage with optional Redis
 * - Health check and fault detection
 * - Network topology management
 * 
 * Architecture:
 * - Express for HTTP API
 * - Socket.IO for real-time bidirectional communication
 * - Background worker for health checks
 * - C++ addon for network scanning
 */
```

**Explanation:** Documentation header describing what the server does. Shows you understand the architecture.

---

### **Lines 18-26: Import Dependencies**
```javascript
const express = require('express');      // Web framework for REST API
const http = require('http');            // HTTP server (needed for Socket.IO)
const socketIO = require('socket.io');   // WebSocket library
const cors = require('cors');            // Cross-Origin Resource Sharing
const helmet = require('helmet');        // Security headers
const compression = require('compression'); // Compress responses
const morgan = require('morgan');       // HTTP request logger
const dotenv = require('dotenv');        // Environment variables
const path = require('path');            // Path utilities
```

**Explanation:**
- **express**: Creates REST API endpoints
- **http**: Creates HTTP server (Socket.IO needs this)
- **socketIO**: Enables WebSocket for real-time communication
- **cors**: Allows frontend (localhost:5173) to access backend
- **helmet**: Adds security headers (prevents XSS, etc.)
- **compression**: Compresses responses (faster transfer)
- **morgan**: Logs HTTP requests (GET, POST, etc.)
- **dotenv**: Loads `.env` file for configuration
- **path**: File path utilities

**Viva Tip:** "I use Express for REST API and Socket.IO for WebSocket. Both run on the same HTTP server for efficiency."

---

### **Lines 28-29: Load Environment Variables**
```javascript
// Load environment variables
dotenv.config();
```

**Explanation:** Loads variables from `.env` file (PORT, CORS_ORIGIN, etc.). Allows configuration without changing code.

---

### **Lines 31-37: Import Custom Modules**
```javascript
const logger = require('./utils/logger');
const { checkNodeHealth, initHealthChecker } = require('./utils/checkHealth');
const nodesRouter = require('./routes/nodes');
const updateRouter = require('./routes/update');
const topologyRouter = require('./routes/topology');
const scannerRouter = require('./routes/scanner');
```

**Explanation:**
- **logger**: Winston logger for structured logging
- **checkNodeHealth**: Utility to check if node is healthy
- **nodesRouter**: Routes for `/api/nodes` (GET, POST, DELETE)
- **updateRouter**: Routes for `/api/update` (receives agent updates)
- **topologyRouter**: Routes for `/api/topology` (network connections)
- **scannerRouter**: Routes for `/api/scanner` (network scanning)

---

### **Lines 39-41: Initialize Express & HTTP Server**
```javascript
const app = express();
const server = http.createServer(app);
```

**Explanation:**
- **app**: Express application instance
- **server**: HTTP server created from Express app (needed for Socket.IO)

**Why?** Socket.IO needs an HTTP server, not just Express app.

---

### **Lines 43-52: Initialize Socket.IO**
```javascript
const io = socketIO(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});
```

**Explanation:**
- **io**: Socket.IO server instance
- **cors.origin**: Allows frontend at localhost:5173 to connect
- **pingTimeout**: 60 seconds - if no pong received, disconnect
- **pingInterval**: 25 seconds - send ping every 25s to check connection

**Viva Tip:** "Socket.IO uses ping/pong to detect dead connections. If no pong for 60 seconds, it disconnects."

---

### **Lines 54-57: Configuration Constants**
```javascript
const PORT = process.env.PORT || 3000;
const HEALTH_CHECK_INTERVAL = parseInt(process.env.HEALTH_CHECK_INTERVAL) || 10000;
const NODE_TIMEOUT = parseInt(process.env.NODE_TIMEOUT) || 10000;
```

**Explanation:**
- **PORT**: Server port (3000 default)
- **HEALTH_CHECK_INTERVAL**: How often health checker runs (10 seconds)
- **NODE_TIMEOUT**: If node hasn't updated in 10 seconds, mark as down

---

### **Lines 59-65: In-Memory Data Storage**
```javascript
// In-memory storage for nodes
global.nodesMap = new Map();

// Store topology/connections
global.connections = [];
```

**Explanation:**
- **global.nodesMap**: JavaScript Map for O(1) node lookups
- **global.connections**: Array of connection objects

**Why Map?** Map provides O(1) lookup time (faster than array.find()).

**Viva Tip:** "I use a Map for O(1) node lookups. It's in-memory for speed, but data is lost on restart. For production, I'd add Redis."

---

### **Line 68: Track WebSocket Clients**
```javascript
const connectedClients = new Set();
```

**Explanation:** Set of connected WebSocket client IDs. Used to track how many frontend clients are connected.

---

### **Lines 70-78: Middleware Setup**
```javascript
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
```

**Explanation:**
- **helmet()**: Adds security headers
- **compression()**: Gzip compresses responses
- **cors()**: Allows frontend to make requests
- **express.json()**: Parses JSON request bodies (up to 10MB)
- **express.urlencoded()**: Parses form data

---

### **Lines 80-85: Logging Middleware**
```javascript
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: logger.stream }));
}
```

**Explanation:**
- **Development**: Simple console logs
- **Production**: Detailed logs written to file via Winston logger

---

### **Line 88: Attach Socket.IO to Express**
```javascript
app.set('io', io);
```

**Explanation:** Stores Socket.IO instance in Express app, so routes can access it via `req.app.get('io')`.

**Why?** Routes need to emit WebSocket events, but can't import `io` directly (circular dependency).

---

### **Lines 90-93: Health Check Endpoint**
```javascript
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});
```

**Explanation:** Simple endpoint that agents ping to measure latency. Returns 200 OK with timestamp.

---

### **Lines 95-99: API Route Registration**
```javascript
app.use('/api/nodes', nodesRouter);
app.use('/api/update', updateRouter);
app.use('/api/topology', topologyRouter);
app.use('/api/scanner', scannerRouter);
```

**Explanation:** Mounts route handlers for different API endpoints.

---

### **Lines 101-111: Root Endpoint**
```javascript
app.get('/', (req, res) => {
  res.json({
    name: 'LiveNetViz 3D Backend',
    version: '1.0.0',
    status: 'running',
    nodes: global.nodesMap.size,
    connections: global.connections.length,
    clients: connectedClients.size
  });
});
```

**Explanation:** Root endpoint returns server status and statistics.

---

### **Lines 113-120: Error Handling Middleware**
```javascript
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});
```

**Explanation:** Catches any unhandled errors, logs them, and returns 500 error.

---

### **Lines 122-178: Socket.IO Event Handlers**

#### **Line 123: Connection Event**
```javascript
io.on('connection', (socket) => {
```

**Explanation:** Fires when a frontend client connects via WebSocket.

---

#### **Lines 124-125: Track Client**
```javascript
connectedClients.add(socket.id);
logger.info(`Client connected: ${socket.id} (Total: ${connectedClients.size})`);
```

**Explanation:** Adds client ID to Set and logs connection.

---

#### **Lines 127-132: Send Initial State**
```javascript
socket.emit('initial-state', {
  nodes: Array.from(global.nodesMap.values()),
  connections: global.connections,
  timestamp: Date.now()
});
```

**Explanation:** When frontend connects, immediately send all current nodes and connections.

**Why?** Frontend gets full state on connection, no need for separate API call.

---

#### **Lines 134-137: Request Nodes Handler**
```javascript
socket.on('request-nodes', () => {
  socket.emit('nodes-update', Array.from(global.nodesMap.values()));
});
```

**Explanation:** If frontend requests all nodes, send them via WebSocket.

---

#### **Lines 139-142: Request Topology Handler**
```javascript
socket.on('request-topology', () => {
  socket.emit('topology-update', global.connections);
});
```

**Explanation:** Sends all network connections to requesting client.

---

#### **Lines 144-153: Manual Node Addition**
```javascript
socket.on('add-node', (nodeData) => {
  logger.info(`Manual node addition: ${nodeData.nodeId}`);
  global.nodesMap.set(nodeData.nodeId, {
    ...nodeData,
    lastUpdate: Date.now(),
    manual: true
  });
  io.emit('node-added', nodeData);
});
```

**Explanation:**
- Frontend can manually add a node
- Stores in `nodesMap` with `manual: true` flag
- Broadcasts to ALL clients using `io.emit()`

**Difference:**
- `socket.emit()`: Send to one client
- `io.emit()`: Broadcast to all clients

---

#### **Lines 155-166: Node Removal Handler**
```javascript
socket.on('remove-node', (nodeId) => {
  logger.info(`Removing node: ${nodeId}`);
  global.nodesMap.delete(nodeId);
  
  // Remove associated connections
  global.connections = global.connections.filter(
    conn => conn.source !== nodeId && conn.target !== nodeId
  );
  
  io.emit('node-removed', nodeId);
});
```

**Explanation:**
- Deletes node from Map
- Removes all connections involving this node
- Broadcasts removal to all clients

---

#### **Lines 168-172: Disconnect Handler**
```javascript
socket.on('disconnect', () => {
  connectedClients.delete(socket.id);
  logger.info(`Client disconnected: ${socket.id} (Total: ${connectedClients.size})`);
});
```

**Explanation:** When client disconnects, remove from tracking Set and log.

---

### **Lines 180-217: Health Checker Function**

#### **Line 184: Function Definition**
```javascript
function startHealthChecker() {
```

**Explanation:** Background worker function that checks node health periodically.

---

#### **Line 185: Set Interval**
```javascript
setInterval(() => {
```

**Explanation:** Runs every `HEALTH_CHECK_INTERVAL` milliseconds (10 seconds).

---

#### **Lines 189-207: Check Each Node**
```javascript
global.nodesMap.forEach((node, nodeId) => {
  const timeSinceUpdate = now - node.lastUpdate;
  
  // Check if node timed out
  if (timeSinceUpdate > NODE_TIMEOUT) {
    const previousStatus = node.status;
    
    // Mark as down
    node.status = 'down';
    node.latency = -1;
    
    if (previousStatus !== 'down') {
      logger.warn(`Node ${nodeId} marked as DOWN (no update for ${timeSinceUpdate}ms)`);
      changedNodes.push(node);
    }
    
    global.nodesMap.set(nodeId, node);
  }
});
```

**Explanation:**
1. Loop through all nodes
2. Calculate time since last update
3. If > 10 seconds (NODE_TIMEOUT):
   - Mark as 'down'
   - Set latency to -1 (unreachable)
   - If status actually changed, add to `changedNodes`
   - Update Map

**Viva Tip:** "The health checker runs every 10 seconds. If a node hasn't updated in 10 seconds, it's marked as down and all frontend clients are notified."

---

#### **Lines 209-212: Broadcast Changes**
```javascript
if (changedNodes.length > 0) {
  io.emit('nodes-status-changed', changedNodes);
}
```

**Explanation:** If any nodes changed status, broadcast to all connected clients.

---

### **Lines 219-244: Statistics Reporter**

**Purpose:** Background worker that logs and broadcasts system statistics every 60 seconds.

**Key Points:**
- Collects: node count, connection count, client count, memory usage, uptime
- Logs statistics
- Broadcasts to all frontend clients via WebSocket

---

### **Lines 246-268: Graceful Shutdown**

**Purpose:** Handles server shutdown gracefully.

**Key Steps:**
1. Close all Socket.IO connections
2. Close HTTP server
3. Force exit after 10 seconds if graceful shutdown fails

---

### **Lines 270-282: Process Signal Handlers**

**Purpose:** Handle system signals and errors.

- **SIGTERM/SIGINT**: Trigger graceful shutdown
- **uncaughtException**: Log and shutdown
- **unhandledRejection**: Log Promise rejections

---

### **Lines 284-299: Start Server**

**Purpose:** Starts HTTP server and background workers.

**Key Steps:**
1. Listen on port 3000
2. Log startup banner
3. Start health checker
4. Start statistics reporter

---

## 📁 `routes/update.js` - Update Endpoint

### **Lines 1-8: Header & Imports**
```javascript
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
```

**Explanation:** Creates Express router for `/api/update` routes.

---

### **Lines 14-81: POST /api/update Route**

#### **Line 16: Get Request Body**
```javascript
const nodeData = req.body;
```

**Explanation:** Extracts JSON data from request body (sent by agent).

---

#### **Lines 18-24: Validation**
```javascript
if (!nodeData.nodeId || !nodeData.ip) {
  return res.status(400).json({
    success: false,
    error: 'nodeId and ip are required'
  });
}
```

**Explanation:** Validates required fields. Returns 400 if missing.

---

#### **Line 27: Check if New Node**
```javascript
const isNewNode = !global.nodesMap.has(nodeData.nodeId);
```

**Explanation:** Checks if node exists in Map (O(1) lookup).

---

#### **Lines 29-33: Create Updated Node Object**
```javascript
const updatedNode = {
  ...nodeData,
  lastUpdate: Date.now()
};
```

**Explanation:** Spreads all properties from agent and adds `lastUpdate` timestamp.

---

#### **Lines 35-37: Get Previous Status**
```javascript
const previousNode = global.nodesMap.get(nodeData.nodeId);
const previousStatus = previousNode ? previousNode.status : null;
```

**Explanation:** Gets existing node and extracts previous status for comparison.

---

#### **Line 40: Store in Memory**
```javascript
global.nodesMap.set(nodeData.nodeId, updatedNode);
```

**Explanation:** Updates or creates node in Map.

---

#### **Line 43: Get Socket.IO Instance**
```javascript
const io = req.app.get('io');
```

**Explanation:** Retrieves Socket.IO instance from Express app.

---

#### **Lines 45-58: Emit WebSocket Events**

**New Node:**
```javascript
if (isNewNode) {
  logger.info(`New node registered: ${nodeData.nodeId} (${nodeData.ip})`);
  io.emit('node-added', updatedNode);
}
```

**Existing Node:**
```javascript
else {
  if (previousStatus !== nodeData.status) {
    logger.info(`Node ${nodeData.nodeId} status changed: ${previousStatus} -> ${nodeData.status}`);
    io.emit('node-status-changed', updatedNode);
  }
  
  // Always emit real-time update for metrics
  io.emit('node-updated', updatedNode);
}
```

**Explanation:**
- **If new node**: Emit `node-added` event
- **If status changed**: Emit `node-status-changed` (critical event)
- **Always**: Emit `node-updated` (for real-time metrics display)

---

#### **Lines 67-72: Success Response**
```javascript
res.json({
  success: true,
  nodeId: nodeData.nodeId,
  status: nodeData.status,
  timestamp: Date.now()
});
```

**Explanation:** Returns JSON response to agent confirming update received.

---

### **Lines 83-146: POST /api/update/batch Route**

**Purpose:** Handles batch updates from multiple nodes at once (more efficient).

**Key Steps:**
1. Validate `nodes` is an array
2. Loop through each node
3. Validate each node (nodeId, ip)
4. Update storage
5. Emit WebSocket events
6. Track success/failure in results array
7. Return results

**Why Batch?** More efficient than multiple individual requests.

---

## Supporting Routes (Brief)

## 📁 `routes/nodes.js` - Node Management

**Purpose:** Handles CRUD operations for nodes.

### **Key Endpoints:**

1. **GET `/api/nodes`** (Lines 15-40)
   - Returns all nodes
   - Optional filtering by status: `?status=healthy`
   - Returns: `{ success, count, nodes, timestamp }`

2. **GET `/api/nodes/stats`** (Lines 46-63)
   - Returns network statistics
   - Uses `calculateNetworkStats()` utility
   - Returns: `{ success, stats, timestamp }`

3. **GET `/api/nodes/:nodeId`** (Lines 69-93)
   - Returns specific node by ID
   - Returns 404 if not found
   - Returns: `{ success, node, timestamp }`

4. **POST `/api/nodes`** (Lines 99-146)
   - Manually add a new node
   - Validates nodeId and ip
   - Creates node with default values (cpu: 0, ram: 0, etc.)
   - Sets `manual: true` flag
   - Broadcasts `node-added` event

5. **DELETE `/api/nodes/:nodeId`** (Lines 152-187)
   - Removes a node
   - Also removes all associated connections
   - Broadcasts `node-removed` event

6. **PUT `/api/nodes/:nodeId`** (Lines 193-232)
   - Updates node metadata (not health metrics)
   - Only allows: hostname, label, group, position, metadata
   - Health metrics must use `/api/update`
   - Broadcasts `node-updated` event

**Viva Tip:** "The nodes route handles CRUD operations. Health metrics come from agents via `/api/update`, while metadata can be updated via PUT `/api/nodes/:nodeId`."

---

## 📁 `routes/topology.js` - Topology Management

**Purpose:** Manages network connections between nodes.

### **Key Endpoints:**

1. **GET `/api/topology`** (Lines 14-29)
   - Returns all connections
   - Returns: `{ success, connections, count, timestamp }`

2. **POST `/api/topology/connection`** (Lines 35-105)
   - Adds a new connection between nodes
   - Validates source and target exist
   - Checks for duplicate connections (bidirectional)
   - Creates connection: `{ id, source, target, bandwidth, type, created }`
   - Broadcasts `connection-added` event

3. **DELETE `/api/topology/connection/:connectionId`** (Lines 111-144)
   - Removes a connection
   - Broadcasts `connection-removed` event

4. **POST `/api/topology/auto-discover`** (Lines 150-220)
   - Auto-discovers network topology
   - Finds or designates a gateway node (by hostname)
   - Connects all other nodes to gateway (star topology)
   - Creates connections with default 1Gbps bandwidth
   - Broadcasts `topology-discovered` event

5. **PUT `/api/topology/connection/:connectionId`** (Lines 226-261)
   - Updates connection properties (bandwidth, type)
   - Broadcasts `connection-updated` event

**Viva Tip:** "The topology route manages network connections. Auto-discover creates a star topology with a gateway node at the center."

---

## 📁 `routes/scanner.js` - Network Scanner

**Purpose:** Handles network scanning using C++ addon or JavaScript fallback.

### **Key Components:**

1. **C++ Module Loading** (Lines 10-18)
   - Tries to load C++ scanner module
   - Gracefully falls back if not compiled  
   - Logs availability status

2. **POST `/api/scanner/scan`** (Lines 24-102)
   - Scans a subnet for active devices
   - Validates subnet format (e.g., `192.168.1.0/24`)
   - Calls C++ scanner or JavaScript fallback
   - Creates nodes for discovered devices
   - Sets `discovered: true` flag
   - Broadcasts `node-added` events
   - Returns: `{ success, scan, devices, timestamp }`

3. **Fallback Scanner** (Lines 107-177)
   - JavaScript implementation when C++ not available
   - Uses `ping` command (OS-specific)
   - Only supports /24 subnets
   - Much slower than C++ version

4. **GET `/api/scanner/status`** (Lines 183-193)
   - Returns scanner module status
   - Shows if C++ module is available
   - Returns capabilities

**Viva Tip:** "The scanner route uses a C++ addon for performance. If not compiled, it falls back to JavaScript ping commands, which is slower but works everywhere."

---

## Utilities (Brief)

## 📁 `utils/logger.js` - Logging

**Purpose:** Winston logger setup for structured logging.

### **Key Features:**

1. **Log Directory** (Lines 10-14)
   - Creates `logs/` directory if it doesn't exist

2. **Log Format** (Lines 16-22)
   - JSON format with timestamp
   - Includes error stack traces
   - Structured for parsing

3. **Console Format** (Lines 24-35)
   - Colorized output for development
   - Human-readable format

4. **Logger Instance** (Lines 38-56)
   - Two file transports:
     - `combined.log`: All logs
     - `error.log`: Only errors
   - 10MB max file size, 5 files rotation

5. **Console Transport** (Lines 58-63)
   - Only in development mode
   - Colorized output

6. **Morgan Stream** (Lines 65-70)
   - Allows Morgan HTTP logger to write to Winston
   - Used in server.js line 84

**Viva Tip:** "I use Winston for structured logging. It writes to files in production and shows colorized output in development."

---

## 📁 `utils/checkHealth.js` - Health Utilities

**Purpose:** Health checking utilities and statistics calculation.

### **Key Functions:**

1. **`checkNodeHealth(node)`** (Lines 13-68)
   - Assesses node health based on metrics
   - Checks:
     - Last update time (>10s = down)
     - Latency (>200ms = warning, -1 = down)
     - CPU (>90% = critical, >80% = warning)
     - RAM (>95% = critical, >85% = warning)
     - Disk (>95% = critical)
   - Returns: `{ nodeId, healthy, warnings, status }`

2. **`initHealthChecker(nodesMap, onStatusChange, interval)`** (Lines 76-101)
   - Initializes health checker interval
   - Runs every `interval` milliseconds
   - Checks all nodes
   - Calls callback when status changes
   - Logs warnings

3. **`calculateNetworkStats(nodes)`** (Lines 108-155)
   - Calculates aggregate network statistics
   - Counts: total, healthy, warning, down nodes
   - Calculates averages: CPU, RAM, latency
   - Sums total traffic (sent/received)
   - Returns: `{ totalNodes, healthyNodes, warningNodes, downNodes, avgCpu, avgRam, avgLatency, totalTraffic }`

**Viva Tip:** "The health utilities provide reusable functions for checking node health and calculating statistics. The main server uses a simpler timeout-based checker, but these utilities provide more detailed assessment."

---

## C++ Scanner Module (Brief)

## 📁 `cpp/scanner.cpp` - High-Performance Network Scanner

**Purpose:** Native C++ addon for fast network scanning (50x faster than JavaScript).

**Why C++?** Network scanning is CPU-intensive. C++ with multi-threading provides much better performance than JavaScript.

### **Key Components:**

1. **NetworkScanner Class** (Lines 51-287)
   - Main scanner class
   - Multi-threaded scanning (50 concurrent threads)
   - Platform-specific implementations (Windows/Linux)

2. **pingHost()** (Lines 72-150)
   - **Windows**: Uses `IcmpSendEcho` API (Lines 74-97)
   - **Linux**: Creates raw ICMP socket (Lines 99-149)
   - Falls back to TCP probe if ICMP fails (permissions)
   - Measures latency in milliseconds

3. **tcpProbe()** (Lines 153-199)
   - Fallback method when ICMP not available
   - Tries to connect to port 80 (HTTP)
   - Non-blocking socket with timeout
   - Works without admin/root privileges

4. **calculateChecksum()** (Lines 57-69)
   - Calculates ICMP packet checksum
   - Required for ICMP packet construction
   - Standard network protocol checksum algorithm

5. **scanHost()** (Lines 217-232)
   - Scans a single IP address
   - Calls `pingHost()` to check if active
   - Resolves hostname if active
   - Thread-safe result storage (uses mutex)

6. **scanSubnet()** (Lines 249-286)
   - Main scanning function
   - Parses subnet (e.g., `192.168.1.0/24`)
   - Creates 50 concurrent threads
   - Scans all 254 IPs in /24 subnet
   - Returns vector of active hosts

7. **N-API Wrapper Functions** (Lines 290-360)
   - **ScanSubnet()**: Exposes `scanSubnet()` to Node.js (Lines 290-333)
   - **GetCapabilities()**: Returns scanner capabilities (Lines 336-360)
   - Converts C++ data types to JavaScript objects

8. **Platform-Specific Code**
   - **Windows** (Lines 24-30, 73-97): Uses WinSock and ICMP API
   - **Linux** (Lines 32-41, 99-149): Uses raw sockets and POSIX APIs
   - Conditional compilation with `#ifdef _WIN32`

### **How It Works:**

1. **Called from:** `routes/scanner.js` Line 45
   ```javascript
   const results = await scanner.scanSubnet(subnet, timeout);
   ```

2. **Process:**
   - Parses subnet (e.g., `192.168.1.0/24`)
   - Creates 50 threads
   - Each thread scans one IP at a time
   - Uses mutex to safely add results
   - Returns all active hosts

3. **Performance:**
   - Scans 254 IPs in ~8 seconds
   - 50 concurrent threads
   - ICMP ping (fast) with TCP fallback

### **Key Concepts:**

- **Multi-threading**: 50 threads scan concurrently (Line 260)
- **Mutex**: Thread-safe result storage (Line 54, 229)
- **Platform-specific**: Different code for Windows vs Linux
- **N-API**: Node.js addon API for C++ integration
- **ICMP**: Internet Control Message Protocol (ping)
- **TCP Fallback**: Uses TCP connect if ICMP unavailable

### **Viva Explanation:**

**"Why did you use C++ for network scanning?"**

"I used C++ because network scanning is CPU-intensive and requires low-level socket access. The C++ scanner uses multi-threading with 50 concurrent threads, allowing it to scan 254 IPs in about 8 seconds - 50x faster than JavaScript. It uses ICMP ping on Windows via the `IcmpSendEcho` API, and raw sockets on Linux. If ICMP isn't available (permissions), it falls back to TCP connection probes. The scanner is compiled as a Node.js native addon using N-API, which allows JavaScript to call C++ functions directly."

**"How does it work?"**

"The scanner takes a subnet like `192.168.1.0/24`, parses it to get the base IP, then creates 50 threads. Each thread scans one IP at a time using ICMP ping. When a host responds, it resolves the hostname and stores the result in a thread-safe vector using a mutex. After all threads complete, it returns the list of active hosts to Node.js, which then creates nodes for each discovered device."

**"What if the C++ module isn't compiled?"**

"If the C++ module isn't available, the JavaScript route falls back to a simple ping-based scanner that uses the system's `ping` command. It's slower but works everywhere without compilation."

---

## Auto-Discovery (Brief)

## 📁 `auto-discover.js` - Network Discovery

**Purpose:** Automatically discovers and adds network nodes when system starts.

### **Key Functions:**

1. **`getLocalNetworkRange()`** (Lines 17-34)
   - Gets local network interfaces
   - Extracts network base (e.g., `192.168.1`)
   - Returns array of network ranges

2. **`discoverNodes()`** (Lines 39-127)
   - Main discovery function
   - Adds localhost first
   - Adds current host
   - Scans common IPs (1, 10, 50, 100, 254) in each network
   - Tries to connect to `/health` endpoint
   - Adds discovered nodes
   - Calls `addDemoNodes()` for visualization

3. **`addNode(nodeData)`** (Lines 132-144)
   - Adds a node via POST `/api/nodes`
   - Handles errors gracefully
   - Ignores duplicate errors (409)

4. **`addDemoNodes()`** (Lines 149-209)
   - Adds demo nodes for immediate visualization:
     - Gateway (192.168.1.1)
     - Web Server (192.168.1.10)
     - Database Server (192.168.1.11)
     - Workstations (192.168.1.100, 101)
   - Adds connections between nodes

5. **`waitForBackend()`** (Lines 238-260)
   - Waits for backend to be ready
   - Polls `/health` endpoint
   - Max 30 attempts with 1 second delay

6. **`runAutoDiscovery()`** (Lines 265-280)
   - Main entry point
   - Waits for backend
   - Runs discovery
   - Exits when complete

**Viva Tip:** "Auto-discovery runs at startup to populate the visualization with demo nodes. It scans the local network and adds any nodes it finds, plus some demo nodes for immediate visualization."

---

## 🎯 Key Concepts Summary

### **1. Data Flow**
```
Agent → POST /api/update → Validate → Store → Broadcast WebSocket → Frontend
```

### **2. Real-Time Updates**
- **Single update**: `io.emit('node-updated', node)` - all clients receive
- **Status change**: `io.emit('node-status-changed', node)` - critical event
- **New node**: `io.emit('node-added', node)` - new registration

### **3. Fault Detection**
- Health checker runs every 10 seconds
- Checks `lastUpdate` timestamp
- If > 10 seconds: mark as 'down'
- Broadcast status change to all clients

### **4. Data Storage**
- **Map**: O(1) lookups, fast
- **In-memory**: No persistence (lost on restart)
- **Production**: Would use Redis or database

### **5. Architecture Pattern**
- **REST API**: For agent updates and CRUD operations
- **WebSocket**: For real-time frontend updates
- **Background Workers**: Health checker, statistics reporter
- **Modular Routes**: Separate files for different concerns
- **C++ Native Addon**: For performance-critical operations (network scanning)

### **6. C++ Scanner Integration**
- **Called from**: `routes/scanner.js` Line 45
- **Purpose**: High-performance network scanning (50x faster than JS)
- **Features**: Multi-threaded (50 threads), ICMP ping, TCP fallback
- **Performance**: Scans 254 IPs in ~8 seconds
- **Fallback**: JavaScript ping-based scanner if C++ not compiled

---

## 🔧 Common Modifications

### **1. Change Node Timeout**
```javascript
// Line 57 in server.js
const NODE_TIMEOUT = parseInt(process.env.NODE_TIMEOUT) || 15000; // 15 seconds
```

### **2. Add New Metric**
```javascript
// In routes/update.js, line 30-33
const updatedNode = {
  ...nodeData,
  lastUpdate: Date.now(),
  temperature: nodeData.temperature || null  // Add new field
};
```

### **3. Add Rate Limiting**
```javascript
// After line 78 in server.js
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({ windowMs: 60000, max: 100 });
app.use('/api/update', limiter);
```

### **4. Change Health Check Interval**
```javascript
// Line 56 in server.js
const HEALTH_CHECK_INTERVAL = parseInt(process.env.HEALTH_CHECK_INTERVAL) || 5000; // 5 seconds
```

### **5. Add New Route**
```javascript
// In server.js, after line 99
const customRouter = require('./routes/custom');
app.use('/api/custom', customRouter);
```

---

## 📝 Viva Talking Points

1. **"Explain the backend architecture"**
   - "The backend uses Express for REST API and Socket.IO for WebSocket. Both run on the same HTTP server. I use an in-memory Map for O(1) node lookups, and a background health checker runs every 10 seconds to detect failed nodes."

2. **"How does real-time updates work?"**
   - "When an agent sends POST /api/update, I validate the data, store it in the Map, then broadcast via WebSocket using `io.emit()`. All connected frontend clients receive the update instantly."

3. **"How do you detect faults?"**
   - "A background worker runs every 10 seconds. It checks each node's `lastUpdate` timestamp. If no update received for >10 seconds, it marks the node as 'down' and broadcasts the status change to all clients."

4. **"Why use Map instead of Array?"**
   - "Map provides O(1) lookup time using the nodeId as key. Array.find() would be O(n), which is slow with many nodes."

5. **"What happens when a node goes down?"**
   - "The health checker detects it hasn't updated in 10 seconds, marks it as 'down', sets latency to -1, and broadcasts `node-status-changed` event. All frontend clients see the node turn red immediately."

6. **"How does network scanning work?"**
   - "The scanner route uses a C++ addon for high-performance scanning. It can scan 254 IPs in about 8 seconds using multi-threaded ICMP pings. If the C++ module isn't available, it falls back to JavaScript ping commands."

7. **"How is the code organized?"**
   - "I use modular routes - separate files for nodes, updates, topology, and scanner. Each route handles a specific concern. Utilities like logger and health checker are in separate files for reusability."

8. **"Why did you use C++ for network scanning?"**
   - "Network scanning is CPU-intensive and requires low-level socket access. The C++ scanner uses multi-threading with 50 concurrent threads, allowing it to scan 254 IPs in about 8 seconds - 50x faster than JavaScript. It uses ICMP ping on Windows via `IcmpSendEcho` API, and raw sockets on Linux. If ICMP isn't available, it falls back to TCP connection probes. The scanner is compiled as a Node.js native addon using N-API."

---

## 🎓 Study Checklist

Before your viva, make sure you can explain:

- [ ] How the server initializes (Express + Socket.IO)
- [ ] How agents send updates (POST /api/update)
- [ ] How real-time updates work (WebSocket broadcasting)
- [ ] How fault detection works (health checker)
- [ ] Why Map is used (O(1) lookups)
- [ ] How routes are organized (modular structure)
- [ ] How network scanning works (C++ vs fallback)
- [ ] Why C++ scanner is used (performance, multi-threading)
- [ ] How topology discovery works (auto-discover)
- [ ] How logging works (Winston)
- [ ] How to modify common settings (timeout, intervals)

---

**Good luck with your viva! 🎓**

This guide covers all backend files with detailed explanations for the main files and brief explanations for supporting files. You now have complete understanding of the entire backend system!

