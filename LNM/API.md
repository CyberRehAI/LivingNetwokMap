# LiveNetViz 3D - API Documentation

## Table of Contents

1. [REST API](#rest-api)
2. [WebSocket Events](#websocket-events)
3. [Data Structures](#data-structures)
4. [Error Handling](#error-handling)

---

## REST API

Base URL: `http://localhost:3000`

### Health Check

**GET /health**

Check if server is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1234567890
}
```

---

### Nodes API

#### Get All Nodes

**GET /api/nodes**

Retrieve all registered nodes.

**Query Parameters:**
- `status` (optional) - Filter by status: `healthy`, `warning`, `down`

**Response:**
```json
{
  "success": true,
  "count": 10,
  "nodes": [
    {
      "nodeId": "node-001",
      "hostname": "server-01",
      "ip": "192.168.1.100",
      "cpu": 45.2,
      "ram": 62.5,
      "disk": 78.3,
      "latency": 5,
      "status": "healthy",
      "sent": 15000,
      "received": 32000,
      "lastUpdate": 1234567890
    }
  ],
  "timestamp": 1234567890
}
```

#### Get Node by ID

**GET /api/nodes/:nodeId**

**Response:**
```json
{
  "success": true,
  "node": { /* node object */ },
  "timestamp": 1234567890
}
```

#### Add Node Manually

**POST /api/nodes**

**Request Body:**
```json
{
  "nodeId": "manual-node-01",
  "hostname": "manual-server",
  "ip": "192.168.1.200"
}
```

**Response:**
```json
{
  "success": true,
  "node": { /* created node */ }
}
```

#### Update Node Metadata

**PUT /api/nodes/:nodeId**

Update node properties (not health metrics).

**Request Body:**
```json
{
  "hostname": "new-hostname",
  "label": "Database Server",
  "group": "production"
}
```

#### Delete Node

**DELETE /api/nodes/:nodeId**

**Response:**
```json
{
  "success": true,
  "message": "Node removed successfully"
}
```

#### Get Statistics

**GET /api/nodes/stats**

Get aggregated network statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalNodes": 50,
    "healthyNodes": 45,
    "warningNodes": 3,
    "downNodes": 2,
    "avgCpu": 35.5,
    "avgRam": 55.2,
    "avgLatency": 12.3,
    "totalTraffic": {
      "sent": 500000,
      "received": 750000
    }
  },
  "timestamp": 1234567890
}
```

---

### Update API

#### Send Node Update

**POST /api/update**

Send health metrics from agent.

**Request Body:**
```json
{
  "nodeId": "node-001",
  "hostname": "server-01",
  "ip": "192.168.1.100",
  "os": "Linux Ubuntu 22.04",
  "cpu": 45.2,
  "ram": 62.5,
  "disk": 78.3,
  "latency": 5,
  "status": "healthy",
  "sent": 15000,
  "received": 32000,
  "timestamp": "2024-01-01T12:00:00Z",
  "uptime": 86400
}
```

**Response:**
```json
{
  "success": true,
  "nodeId": "node-001",
  "status": "healthy",
  "timestamp": 1234567890
}
```

#### Batch Update

**POST /api/update/batch**

Send updates for multiple nodes.

**Request Body:**
```json
{
  "nodes": [
    { /* node 1 data */ },
    { /* node 2 data */ }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    { "nodeId": "node-001", "success": true },
    { "nodeId": "node-002", "success": true }
  ],
  "timestamp": 1234567890
}
```

---

### Topology API

#### Get Topology

**GET /api/topology**

Get all network connections.

**Response:**
```json
{
  "success": true,
  "connections": [
    {
      "id": "node-001-node-002",
      "source": "node-001",
      "target": "node-002",
      "bandwidth": 1000,
      "type": "ethernet",
      "created": 1234567890
    }
  ],
  "count": 10,
  "timestamp": 1234567890
}
```

#### Add Connection

**POST /api/topology/connection**

**Request Body:**
```json
{
  "source": "node-001",
  "target": "node-002",
  "bandwidth": 1000,
  "type": "ethernet"
}
```

#### Delete Connection

**DELETE /api/topology/connection/:connectionId**

#### Update Connection

**PUT /api/topology/connection/:connectionId**

**Request Body:**
```json
{
  "bandwidth": 10000,
  "type": "fiber"
}
```

#### Auto-Discover Topology

**POST /api/topology/auto-discover**

Automatically discover network topology.

**Response:**
```json
{
  "success": true,
  "connections": [ /* discovered connections */ ],
  "gateway": "node-001",
  "count": 15
}
```

---

### Scanner API

#### Scan Network

**POST /api/scanner/scan**

Scan a subnet for active devices.

**Request Body:**
```json
{
  "subnet": "192.168.1.0/24",
  "timeout": 1000
}
```

**Response:**
```json
{
  "success": true,
  "scan": {
    "subnet": "192.168.1.0/24",
    "totalScanned": 254,
    "activeHosts": 25,
    "newNodes": 10,
    "duration": 8500
  },
  "devices": [
    {
      "ip": "192.168.1.1",
      "hostname": "router.local",
      "mac": "00:11:22:33:44:55",
      "latency": 2
    }
  ],
  "timestamp": 1234567890
}
```

#### Scanner Status

**GET /api/scanner/status**

Check if C++ scanner module is available.

**Response:**
```json
{
  "success": true,
  "available": true,
  "type": "cpp",
  "capabilities": {
    "maxConcurrent": 50,
    "protocols": ["icmp", "tcp"]
  }
}
```

---

## WebSocket Events

Connect to: `ws://localhost:3000`

### Client → Server Events

#### request-nodes
Request current list of all nodes.

```javascript
socket.emit('request-nodes');
```

#### request-topology
Request current network topology.

```javascript
socket.emit('request-topology');
```

#### add-node
Manually add a node.

```javascript
socket.emit('add-node', {
  nodeId: 'manual-01',
  hostname: 'manual-server',
  ip: '192.168.1.200'
});
```

#### remove-node
Remove a node.

```javascript
socket.emit('remove-node', 'node-001');
```

---

### Server → Client Events

#### initial-state
Sent when client first connects.

```javascript
socket.on('initial-state', (data) => {
  console.log('Nodes:', data.nodes);
  console.log('Connections:', data.connections);
});
```

**Data:**
```json
{
  "nodes": [ /* array of nodes */ ],
  "connections": [ /* array of connections */ ],
  "timestamp": 1234567890
}
```

#### node-added
New node registered.

```javascript
socket.on('node-added', (node) => {
  console.log('New node:', node.nodeId);
});
```

#### node-updated
Node metrics updated.

```javascript
socket.on('node-updated', (node) => {
  console.log('Updated:', node.nodeId, node.cpu, node.ram);
});
```

#### node-removed
Node removed.

```javascript
socket.on('node-removed', (nodeId) => {
  console.log('Removed:', nodeId);
});
```

#### node-status-changed
Node status changed (healthy ↔ warning ↔ down).

```javascript
socket.on('node-status-changed', (node) => {
  console.log('Status change:', node.nodeId, node.status);
});
```

#### nodes-status-changed
Multiple nodes status changed (batch).

```javascript
socket.on('nodes-status-changed', (nodes) => {
  nodes.forEach(node => {
    console.log('Status:', node.nodeId, node.status);
  });
});
```

#### connection-added
New connection added.

```javascript
socket.on('connection-added', (connection) => {
  console.log('Connection:', connection.source, '→', connection.target);
});
```

#### connection-removed
Connection removed.

```javascript
socket.on('connection-removed', (connectionId) => {
  console.log('Removed connection:', connectionId);
});
```

#### topology-discovered
Topology auto-discovery completed.

```javascript
socket.on('topology-discovered', (connections) => {
  console.log('Discovered', connections.length, 'connections');
});
```

#### server-stats
Server statistics (sent periodically).

```javascript
socket.on('server-stats', (stats) => {
  console.log('Nodes:', stats.nodes);
  console.log('Clients:', stats.clients);
  console.log('Uptime:', stats.uptime);
});
```

---

## Data Structures

### Node Object

```typescript
{
  nodeId: string;        // Unique identifier
  hostname: string;      // Hostname or label
  ip: string;           // IP address
  os?: string;          // Operating system
  cpu: number;          // CPU usage (0-100)
  ram: number;          // RAM usage (0-100)
  disk: number;         // Disk usage (0-100)
  latency: number;      // Latency in ms (-1 if unreachable)
  status: "healthy" | "warning" | "down";
  sent: number;         // Bytes sent per second
  received: number;     // Bytes received per second
  sent_total?: number;  // Total bytes sent
  received_total?: number; // Total bytes received
  timestamp: string;    // ISO timestamp
  uptime?: number;      // Uptime in seconds
  lastUpdate: number;   // Unix timestamp
  manual?: boolean;     // Manually added
  discovered?: boolean; // Auto-discovered
}
```

### Connection Object

```typescript
{
  id: string;           // Unique identifier
  source: string;       // Source node ID
  target: string;       // Target node ID
  bandwidth: number;    // Bandwidth in Mbps
  type: string;         // Connection type (ethernet, fiber, wifi)
  created: number;      // Unix timestamp
  autoDiscovered?: boolean; // Auto-discovered
}
```

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error (development only)"
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `404` - Not Found
- `409` - Conflict (duplicate)
- `500` - Internal Server Error

### Common Errors

#### 400 Bad Request
```json
{
  "success": false,
  "error": "nodeId and ip are required"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "error": "Node not found"
}
```

#### 409 Conflict
```json
{
  "success": false,
  "error": "Connection already exists"
}
```

---

## Rate Limiting

Currently no rate limiting implemented. For production, consider adding:

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100 // 100 requests per minute
});

app.use('/api/', limiter);
```

---

## Authentication

Currently no authentication required. For production, add JWT or API keys:

```javascript
app.use('/api/', (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // Verify token
  next();
});
```
