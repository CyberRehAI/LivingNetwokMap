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

const express = require('express'); 
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import utilities and routes
const logger = require('./utils/logger');
const { checkNodeHealth, initHealthChecker } = require('./utils/checkHealth');
const nodesRouter = require('./routes/nodes');
const updateRouter = require('./routes/update');
const topologyRouter = require('./routes/topology');
const scannerRouter = require('./routes/scanner');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIO(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Configuration
const PORT = process.env.PORT || 3000;
const HEALTH_CHECK_INTERVAL = parseInt(process.env.HEALTH_CHECK_INTERVAL) || 10000;
const NODE_TIMEOUT = parseInt(process.env.NODE_TIMEOUT) || 10000;

// In-memory storage for nodes
// Structure: { nodeId: { ...nodeData, lastUpdate: timestamp } }
global.nodesMap = new Map();

// Store topology/connections
// Structure: { source: nodeId, target: nodeId, bandwidth: number }
global.connections = [];

// Socket.IO connections tracking
const connectedClients = new Set();

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: logger.stream }));
}

// Attach Socket.IO to app for route access
app.set('io', io);

// Health check endpoint (for agent latency measurement)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

// API Routes
app.use('/api/nodes', nodesRouter);
app.use('/api/update', updateRouter);
app.use('/api/topology', topologyRouter);
app.use('/api/scanner', scannerRouter);

// Root endpoint
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

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Socket.IO event handlers
io.on('connection', (socket) => {
  connectedClients.add(socket.id);
  logger.info(`Client connected: ${socket.id} (Total: ${connectedClients.size})`);

  // Send current state to newly connected client
  socket.emit('initial-state', {
    nodes: Array.from(global.nodesMap.values()),
    connections: global.connections,
    timestamp: Date.now()
  });

  // Handle client requesting all nodes
  socket.on('request-nodes', () => {
    socket.emit('nodes-update', Array.from(global.nodesMap.values()));
  });

  // Handle client requesting topology
  socket.on('request-topology', () => {
    socket.emit('topology-update', global.connections);
  });

  // Handle manual node addition from frontend
  socket.on('add-node', (nodeData) => {
    logger.info(`Manual node addition: ${nodeData.nodeId}`);
    global.nodesMap.set(nodeData.nodeId, {
      ...nodeData,
      lastUpdate: Date.now(),
      manual: true
    });
    io.emit('node-added', nodeData);
  });

  // Handle node removal
  socket.on('remove-node', (nodeId) => {
    logger.info(`Removing node: ${nodeId}`);
    global.nodesMap.delete(nodeId);
    
    // Remove associated connections
    global.connections = global.connections.filter(
      conn => conn.source !== nodeId && conn.target !== nodeId
    );
    
    io.emit('node-removed', nodeId);
  });

  // Handle client disconnect
  socket.on('disconnect', () => {
    connectedClients.delete(socket.id);
    logger.info(`Client disconnected: ${socket.id} (Total: ${connectedClients.size})`);
  });

  // Handle errors
  socket.on('error', (error) => {
    logger.error(`Socket error for ${socket.id}:`, error);
  });
});

/**
 * Background Health Checker
 * Periodically checks all nodes and marks them as down if no update received
 */
function startHealthChecker() {
  setInterval(() => {
    const now = Date.now();
    let changedNodes = [];

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

    // Emit changes to all connected clients
    if (changedNodes.length > 0) {
      io.emit('nodes-status-changed', changedNodes);
    }

  }, HEALTH_CHECK_INTERVAL);
  
  logger.info(`Health checker started (interval: ${HEALTH_CHECK_INTERVAL}ms, timeout: ${NODE_TIMEOUT}ms)`);
}

/**
 * Statistics Reporter
 * Periodically logs system statistics
 */
function startStatsReporter() {
  setInterval(() => {
    const stats = {
      nodes: global.nodesMap.size,
      connections: global.connections.length,
      clients: connectedClients.size,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };
    
    logger.info(`Stats - Nodes: ${stats.nodes}, Connections: ${stats.connections}, Clients: ${stats.clients}`);
    
    // Emit stats to clients
    io.emit('server-stats', {
      nodes: stats.nodes,
      connections: stats.connections,
      clients: stats.clients,
      uptime: stats.uptime
    });
    
  }, 60000); // Every minute
}

/**
 * Graceful Shutdown Handler
 */
function gracefulShutdown() {
  logger.info('Shutting down gracefully...');
  
  // Close all socket connections
  io.close(() => {
    logger.info('Socket.IO closed');
  });
  
  // Close HTTP server
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
server.listen(PORT, () => {
  logger.info(`═══════════════════════════════════════════════════`);
  logger.info(`  LiveNetViz 3D Backend Server`);
  logger.info(`═══════════════════════════════════════════════════`);
  logger.info(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`  HTTP Server: http://localhost:${PORT}`);
  logger.info(`  WebSocket: ws://localhost:${PORT}`);
  logger.info(`  Health Check Interval: ${HEALTH_CHECK_INTERVAL}ms`);
  logger.info(`  Node Timeout: ${NODE_TIMEOUT}ms`);
  logger.info(`═══════════════════════════════════════════════════`);
  
  // Start background workers
  startHealthChecker();
  startStatsReporter();
});

// Export for testing
module.exports = { app, server, io };
