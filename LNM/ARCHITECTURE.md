# LiveNetViz 3D - System Architecture

## 🏛 Overview

LiveNetViz 3D is a distributed real-time network monitoring and visualization system consisting of three main components:

1. **Node Agents** (Python) - Data collection
2. **Backend Server** (Node.js + C++) - Data processing and distribution
3. **Frontend Client** (Three.js + Vite) - 3D visualization

```
┌─────────────────────────────────────────────────────────────┐
│                     LiveNetViz 3D System                     │
└─────────────────────────────────────────────────────────────┘

  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
  │   Agents     │         │   Backend    │         │  Frontend    │
  │  (Python)    │────────▶│  (Node.js)   │◀────────│  (Three.js)  │
  │              │  HTTP   │              │ WebSocket│              │
  └──────────────┘         └──────────────┘         └──────────────┘
        │                         │                         │
        │                         │                         │
    Collect                   Process                   Visualize
    Metrics                   & Store                  in 3D
```

---

## 📊 Component Architecture

### 1. Node Agent (Python)

**Purpose:** Collect system metrics and report to backend

**Technology Stack:**
- Python 3.8+
- `psutil` - System metrics
- `requests` - HTTP communication

**Architecture:**
```
┌─────────────────────────────────────────┐
│           Node Agent                     │
├─────────────────────────────────────────┤
│  ┌──────────────────────────────────┐  │
│  │   Metrics Collector               │  │
│  │  - CPU Monitor                    │  │
│  │  - RAM Monitor                    │  │
│  │  - Network Traffic Monitor        │  │
│  │  - Latency Measurement            │  │
│  └──────────────────────────────────┘  │
│              ▼                          │
│  ┌──────────────────────────────────┐  │
│  │   Status Determiner               │  │
│  │  - Healthy / Warning / Down       │  │
│  └──────────────────────────────────┘  │
│              ▼                          │
│  ┌──────────────────────────────────┐  │
│  │   HTTP Client                     │  │
│  │  - Retry Logic                    │  │
│  │  - Exponential Backoff            │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Key Features:**
- Non-blocking metric collection
- Automatic retry on failure
- Configurable update intervals
- Resource-efficient (< 50MB RAM)

**Data Flow:**
1. Collect metrics every 2 seconds
2. Calculate deltas (network traffic)
3. Measure latency to backend
4. Determine status based on thresholds
5. Send JSON payload via POST
6. Handle response/errors

---

### 2. Backend Server (Node.js + C++)

**Purpose:** Central data hub and real-time distribution

**Technology Stack:**
- Node.js 16+
- Express - REST API
- Socket.IO - WebSocket communication
- C++ (N-API) - Network scanning
- Winston - Logging
- (Optional) Redis - Caching

**Architecture:**
```
┌───────────────────────────────────────────────────────────┐
│                    Backend Server                          │
├───────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐         ┌─────────────┐                 │
│  │  REST API   │         │  WebSocket  │                 │
│  │  (Express)  │         │ (Socket.IO) │                 │
│  └─────────────┘         └─────────────┘                 │
│         │                        │                         │
│         └────────┬───────────────┘                         │
│                  ▼                                         │
│      ┌──────────────────────┐                            │
│      │   Route Handlers     │                            │
│      │  - /api/nodes        │                            │
│      │  - /api/update       │                            │
│      │  - /api/topology     │                            │
│      │  - /api/scanner      │                            │
│      └──────────────────────┘                            │
│                  ▼                                         │
│      ┌──────────────────────┐                            │
│      │   Business Logic     │                            │
│      │  - Node Management   │                            │
│      │  - Health Checking   │                            │
│      │  - Topology Mgmt     │                            │
│      └──────────────────────┘                            │
│                  ▼                                         │
│      ┌──────────────────────┐     ┌─────────────┐       │
│      │   Data Store         │────▶│   Redis     │       │
│      │  (In-Memory Map)     │     │  (Optional) │       │
│      └──────────────────────┘     └─────────────┘       │
│                  ▼                                         │
│      ┌──────────────────────┐                            │
│      │   C++ Scanner        │                            │
│      │  - Network Scan      │                            │
│      │  - ICMP Ping         │                            │
│      │  - Multi-threaded    │                            │
│      └──────────────────────┘                            │
│                                                             │
└───────────────────────────────────────────────────────────┘
```

**Key Components:**

#### a) REST API Layer
- Express.js server
- CORS middleware
- JSON body parsing
- Error handling
- Request logging

#### b) WebSocket Layer
- Socket.IO server
- Event-driven architecture
- Room-based broadcasting
- Connection management

#### c) Storage Layer
```javascript
// In-memory storage
global.nodesMap = Map<nodeId, NodeData>
global.connections = Array<Connection>

// Optional Redis for persistence
redis.set('nodes', JSON.stringify(nodesMap))
```

#### d) Health Checker
```javascript
setInterval(() => {
  nodes.forEach(node => {
    if (now - node.lastUpdate > NODE_TIMEOUT) {
      node.status = 'down';
      emit('node-status-changed', node);
    }
  });
}, HEALTH_CHECK_INTERVAL);
```

#### e) C++ Scanner Module
- Native Node.js addon
- High-performance ICMP/TCP scanning
- Multi-threaded (50 concurrent)
- Cross-platform (Windows, Linux, macOS)

**Data Flow:**
1. Agent sends POST /api/update
2. Validate and parse JSON
3. Update in-memory Map
4. Detect status changes
5. Broadcast to all WebSocket clients
6. Log event

---

### 3. Frontend Client (Three.js + Vite)

**Purpose:** Interactive 3D visualization

**Technology Stack:**
- Vite - Build tool
- Three.js - 3D rendering
- Socket.IO Client - Real-time updates
- Vanilla JS - No framework overhead

**Architecture:**
```
┌───────────────────────────────────────────────────────────┐
│                    Frontend Client                         │
├───────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              Main Application (main.js)              │ │
│  └─────────────────────────────────────────────────────┘ │
│                          │                                 │
│           ┌──────────────┼──────────────┐                 │
│           ▼              ▼              ▼                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│  │   3D Scene   │ │   WebSocket  │ │   UI Layer   │     │
│  │   Manager    │ │   Client     │ │   Manager    │     │
│  └──────────────┘ └──────────────┘ └──────────────┘     │
│         │                 │                 │             │
│         ▼                 ▼                 ▼             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│  │   Node       │ │   Event      │ │   Controls   │     │
│  │   Renderer   │ │   Handlers   │ │   & Panels   │     │
│  └──────────────┘ └──────────────┘ └──────────────┘     │
│         │                                   │             │
│         ▼                                   ▼             │
│  ┌──────────────┐                  ┌──────────────┐     │
│  │   Lines      │                  │   Stats      │     │
│  │   Renderer   │                  │   Display    │     │
│  └──────────────┘                  └──────────────┘     │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

**Key Modules:**

#### a) NodeRenderer.js
```javascript
class NodeRenderer {
  - addNode(data, position)
  - updateNode(data)
  - removeNode(nodeId)
  - moveNode(nodeId, position)
  - Color coding (green/yellow/red)
  - Labels and tooltips
  - Click detection
  - Hover effects
}
```

#### b) LinesRenderer.js
```javascript
class LinesRenderer {
  - updateConnections(connections, positions)
  - createConnection(source, target)
  - animateTraffic()
  - Particle systems for data flow
}
```

#### c) SocketClient.js
```javascript
class SocketClient {
  - connect()
  - on(event, callback)
  - emit(event, data)
  - Auto-reconnect
  - Event forwarding
}
```

#### d) UI.js
```javascript
class UI {
  - updateStats()
  - showNodeDetails()
  - showNotification()
  - Control event handlers
}
```

**Rendering Pipeline:**
```
┌─────────────┐
│ Update Data │
└─────────────┘
      │
      ▼
┌─────────────┐
│Update Nodes │ (Position, Color, Scale)
└─────────────┘
      │
      ▼
┌─────────────┐
│Update Lines │ (Connections, Traffic)
└─────────────┘
      │
      ▼
┌─────────────┐
│Update Camera│ (Orbit controls, Auto-rotate)
└─────────────┘
      │
      ▼
┌─────────────┐
│   Render    │ (60 FPS target)
└─────────────┘
```

---

## 🔄 Data Flow

### Complete Update Cycle

```
Agent                Backend              Frontend
  │                    │                     │
  │  1. POST /update   │                     │
  ├───────────────────▶│                     │
  │                    │                     │
  │  2. 200 OK         │                     │
  │◀───────────────────┤                     │
  │                    │                     │
  │                    │  3. node-updated    │
  │                    ├────────────────────▶│
  │                    │                     │
  │                    │                     │  4. Update 3D
  │                    │                     │     Node
  │                    │                     │
```

### Connection Lifecycle

```
Frontend             Backend              Frontend
  │                    │                     │
  │ 1. Scan Network    │                     │
  ├───────────────────▶│                     │
  │                    │                     │
  │                    │  2. Discover Nodes  │
  │                    │     (C++ Scanner)   │
  │                    │                     │
  │                    │  3. node-added ×N   │
  │◀───────────────────┼────────────────────▶│
  │                    │                     │
  │ 4. Auto-discover   │                     │
  │    Topology        │                     │
  ├───────────────────▶│                     │
  │                    │                     │
  │                    │  5. Create          │
  │                    │     Connections     │
  │                    │                     │
  │                    │  6. topology-       │
  │                    │     discovered      │
  │◀───────────────────┼────────────────────▶│
```

---

## 🗄 Data Models

### Node Data Model

```typescript
interface Node {
  // Identity
  nodeId: string;
  hostname: string;
  ip: string;
  
  // System Info
  os?: string;
  uptime?: number;
  
  // Metrics
  cpu: number;          // 0-100
  ram: number;          // 0-100
  disk: number;         // 0-100
  latency: number;      // milliseconds
  
  // Network
  sent: number;         // bytes/sec
  received: number;     // bytes/sec
  sent_total?: number;
  received_total?: number;
  
  // Status
  status: 'healthy' | 'warning' | 'down';
  lastUpdate: number;   // Unix timestamp
  
  // Metadata
  manual?: boolean;
  discovered?: boolean;
  position?: Vector3;
}
```

### Connection Data Model

```typescript
interface Connection {
  id: string;
  source: string;       // nodeId
  target: string;       // nodeId
  bandwidth: number;    // Mbps
  type: string;         // ethernet, fiber, wifi
  created: number;
  autoDiscovered?: boolean;
}
```

---

## 🔐 Security Architecture

### Current Implementation
- **Authentication:** None (local network assumed)
- **Authorization:** None
- **Encryption:** Plain HTTP/WebSocket

### Production Recommendations

```
┌────────────────────────────────────────────┐
│         Security Layers                     │
├────────────────────────────────────────────┤
│  1. TLS/HTTPS (Transport Layer)            │
│  2. JWT Authentication (Application Layer) │
│  3. RBAC Authorization (Access Control)    │
│  4. Rate Limiting (DDoS Protection)        │
│  5. Input Validation (Injection Prevention)│
│  6. CORS Policy (Browser Security)         │
└────────────────────────────────────────────┘
```

---

## ⚡ Performance Optimizations

### Backend
- **In-memory storage** for O(1) lookups
- **Event-driven architecture** for scalability
- **C++ for CPU-intensive operations**
- **Batch updates** to reduce overhead

### Frontend
- **Object pooling** for 3D geometries
- **Frustum culling** for off-screen nodes
- **Level of detail (LOD)** for distant objects
- **RequestAnimationFrame** for smooth rendering

### Network
- **WebSocket** for bi-directional communication
- **Binary protocols** (future: MessagePack)
- **Connection pooling**

---

## 📈 Scalability

### Current Limits
- **Nodes:** 200-500 (depending on hardware)
- **Update Rate:** 100 updates/sec
- **Clients:** 50 simultaneous
- **Memory:** ~500MB at 200 nodes

### Scaling Strategy

**Horizontal Scaling:**
```
┌─────────┐    ┌─────────┐    ┌─────────┐
│Backend 1│    │Backend 2│    │Backend 3│
└────┬────┘    └────┬────┘    └────┬────┘
     │              │              │
     └──────┬───────┴───────┬──────┘
            │               │
       ┌────▼────┐     ┌────▼────┐
       │  Redis  │     │  NATS   │
       │ (State) │     │ (Pubsub)│
       └─────────┘     └─────────┘
```

**Vertical Scaling:**
- Increase Node.js workers (cluster mode)
- Add Redis for distributed state
- Use message queue (NATS, RabbitMQ)

---

## 🛠 Deployment Architecture

### Development
```
Localhost:3000 (Backend)
Localhost:5173 (Frontend)
```

### Production
```
                 ┌──────────────┐
                 │   Nginx      │
                 │   Reverse    │
                 │   Proxy      │
                 └──────┬───────┘
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
   ┌──────────┐  ┌──────────┐  ┌──────────┐
   │Backend 1 │  │Backend 2 │  │Backend 3 │
   │  PM2     │  │  PM2     │  │  PM2     │
   └──────────┘  └──────────┘  └──────────┘
          │             │             │
          └─────────────┼─────────────┘
                        ▼
                 ┌──────────┐
                 │  Redis   │
                 └──────────┘
```

---

## 📝 Logging & Monitoring

### Log Levels
- **ERROR** - Critical failures
- **WARN** - Non-critical issues
- **INFO** - Important events
- **DEBUG** - Detailed debugging

### Metrics to Monitor
- Node count
- Update rate (req/sec)
- WebSocket connections
- Memory usage
- CPU usage
- Response times

### Tools
- Winston (logging)
- PM2 (process monitoring)
- Prometheus + Grafana (metrics)

---

## 🔄 Future Enhancements

1. **Historical Data Storage**
   - Time-series database (InfluxDB)
   - Metrics history
   - Trend analysis

2. **Advanced Visualizations**
   - Heatmaps
   - Traffic flow animations
   - Alert overlays

3. **Machine Learning**
   - Anomaly detection
   - Predictive failures
   - Auto-optimization

4. **Mobile App**
   - React Native
   - Push notifications
   - Quick view dashboard

---

## 📞 Support & Contribution

For architecture questions:
- Review this document
- Check API.md for interfaces
- See INSTALL.md for deployment

For contributions:
- Follow the architecture patterns
- Add tests for new features
- Update documentation
