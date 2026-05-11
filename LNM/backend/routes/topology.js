/**
 * Topology API Routes
 * Manages network topology and connections between nodes
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * GET /api/topology
 * Get all network connections
 */
router.get('/', (req, res) => {
  try {
    res.json({
      success: true,
      connections: global.connections,
      count: global.connections.length,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Error fetching topology:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch topology'
    });
  }
});

/**
 * POST /api/topology/connection
 * Add a new connection between nodes
 */
router.post('/connection', (req, res) => {
  try {
    const { source, target, bandwidth, type } = req.body;
    
    // Validation
    if (!source || !target) {
      return res.status(400).json({
        success: false,
        error: 'source and target are required'
      });
    }
    
    // Check if nodes exist
    if (!global.nodesMap.has(source)) {
      return res.status(404).json({
        success: false,
        error: `Source node ${source} not found`
      });
    }
    
    if (!global.nodesMap.has(target)) {
      return res.status(404).json({
        success: false,
        error: `Target node ${target} not found`
      });
    }
    
    // Check if connection already exists
    const existingConnection = global.connections.find(
      conn => 
        (conn.source === source && conn.target === target) ||
        (conn.source === target && conn.target === source)
    );
    
    if (existingConnection) {
      return res.status(409).json({
        success: false,
        error: 'Connection already exists'
      });
    }
    
    const connection = {
      id: `${source}-${target}`,
      source,
      target,
      bandwidth: bandwidth || 0,
      type: type || 'ethernet',
      created: Date.now()
    };
    
    global.connections.push(connection);
    
    // Emit to all connected clients
    const io = req.app.get('io');
    io.emit('connection-added', connection);
    
    logger.info(`Added connection: ${source} <-> ${target}`);
    
    res.status(201).json({
      success: true,
      connection
    });
    
  } catch (error) {
    logger.error('Error adding connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add connection'
    });
  }
});

/**
 * DELETE /api/topology/connection/:connectionId
 * Remove a connection
 */
router.delete('/connection/:connectionId', (req, res) => {
  try {
    const { connectionId } = req.params;
    
    const index = global.connections.findIndex(conn => conn.id === connectionId);
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found'
      });
    }
    
    global.connections.splice(index, 1);
    
    // Emit to all connected clients
    const io = req.app.get('io');
    io.emit('connection-removed', connectionId);
    
    logger.info(`Removed connection: ${connectionId}`);
    
    res.json({
      success: true,
      message: 'Connection removed successfully'
    });
    
  } catch (error) {
    logger.error('Error removing connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove connection'
    });
  }
});

/**
 * POST /api/topology/auto-discover
 * Auto-discover topology based on network analysis
 */
router.post('/auto-discover', (req, res) => {
  try {
    // Simple auto-discovery: connect all nodes to a central gateway
    const nodes = Array.from(global.nodesMap.keys());
    
    if (nodes.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Need at least 2 nodes for topology discovery'
      });
    }
    
    // Find or designate a gateway node
    let gateway = nodes.find(nodeId => 
      global.nodesMap.get(nodeId).hostname?.toLowerCase().includes('gateway') ||
      global.nodesMap.get(nodeId).hostname?.toLowerCase().includes('router')
    );
    
    if (!gateway) {
      // Use first node as gateway
      gateway = nodes[0];
    }
    
    const newConnections = [];
    
    // Connect all other nodes to gateway
    nodes.forEach(nodeId => {
      if (nodeId !== gateway) {
        const connectionId = `${gateway}-${nodeId}`;
        
        // Check if connection already exists
        const exists = global.connections.find(conn => conn.id === connectionId);
        
        if (!exists) {
          const connection = {
            id: connectionId,
            source: gateway,
            target: nodeId,
            bandwidth: 1000, // Default 1Gbps
            type: 'ethernet',
            created: Date.now(),
            autoDiscovered: true
          };
          
          global.connections.push(connection);
          newConnections.push(connection);
        }
      }
    });
    
    // Emit to all connected clients
    const io = req.app.get('io');
    io.emit('topology-discovered', newConnections);
    
    logger.info(`Auto-discovered ${newConnections.length} connections (gateway: ${gateway})`);
    
    res.json({
      success: true,
      connections: newConnections,
      gateway,
      count: newConnections.length
    });
    
  } catch (error) {
    logger.error('Error auto-discovering topology:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to auto-discover topology'
    });
  }
});

/**
 * PUT /api/topology/connection/:connectionId
 * Update connection properties
 */
router.put('/connection/:connectionId', (req, res) => {
  try {
    const { connectionId } = req.params;
    const { bandwidth, type } = req.body;
    
    const connection = global.connections.find(conn => conn.id === connectionId);
    
    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found'
      });
    }
    
    if (bandwidth !== undefined) connection.bandwidth = bandwidth;
    if (type !== undefined) connection.type = type;
    
    // Emit update
    const io = req.app.get('io');
    io.emit('connection-updated', connection);
    
    logger.info(`Updated connection: ${connectionId}`);
    
    res.json({
      success: true,
      connection
    });
    
  } catch (error) {
    logger.error('Error updating connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update connection'
    });
  }
});

module.exports = router;
