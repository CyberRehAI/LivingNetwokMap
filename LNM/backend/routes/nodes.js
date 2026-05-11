/**
 * Nodes API Routes
 * Handles node listing, retrieval, and management
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { calculateNetworkStats } = require('../utils/checkHealth');

/**
 * GET /api/nodes
 * Get all nodes
 */
router.get('/', (req, res) => {
  try {
    const nodes = Array.from(global.nodesMap.values());
    
    // Optional filtering
    const { status } = req.query;
    let filteredNodes = nodes;
    
    if (status) {
      filteredNodes = nodes.filter(node => node.status === status);
    }
    
    res.json({
      success: true,
      count: filteredNodes.length,
      nodes: filteredNodes,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Error fetching nodes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch nodes'
    });
  }
});

/**
 * GET /api/nodes/stats
 * Get network statistics
 */
router.get('/stats', (req, res) => {
  try {
    const nodes = Array.from(global.nodesMap.values());
    const stats = calculateNetworkStats(nodes);
    
    res.json({
      success: true,
      stats,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Error calculating stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate statistics'
    });
  }
});

/**
 * GET /api/nodes/:nodeId
 * Get specific node by ID
 */
router.get('/:nodeId', (req, res) => {
  try {
    const { nodeId } = req.params;
    const node = global.nodesMap.get(nodeId);
    
    if (!node) {
      return res.status(404).json({
        success: false,
        error: 'Node not found'
      });
    }
    
    res.json({
      success: true,
      node,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Error fetching node:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch node'
    });
  }
});

/**
 * POST /api/nodes
 * Manually add a new node
 */
router.post('/', (req, res) => {
  try {
    const { nodeId, hostname, ip, ...rest } = req.body;
    
    // Validation
    if (!nodeId || !ip) {
      return res.status(400).json({
        success: false,
        error: 'nodeId and ip are required'
      });
    }
    
    const nodeData = {
      nodeId,
      hostname: hostname || nodeId,
      ip,
      cpu: 0,
      ram: 0,
      disk: 0,
      latency: 0,
      status: 'healthy',
      sent: 0,
      received: 0,
      lastUpdate: Date.now(),
      manual: true,
      ...rest
    };
    
    global.nodesMap.set(nodeId, nodeData);
    
    // Emit to all connected clients
    const io = req.app.get('io');
    io.emit('node-added', nodeData);
    
    logger.info(`Manually added node: ${nodeId} (${ip})`);
    
    res.status(201).json({
      success: true,
      node: nodeData
    });
  } catch (error) {
    logger.error('Error adding node:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add node'
    });
  }
});

/**
 * DELETE /api/nodes/:nodeId
 * Remove a node
 */
router.delete('/:nodeId', (req, res) => {
  try {
    const { nodeId } = req.params;
    
    if (!global.nodesMap.has(nodeId)) {
      return res.status(404).json({
        success: false,
        error: 'Node not found'
      });
    }
    
    global.nodesMap.delete(nodeId);
    
    // Remove associated connections
    global.connections = global.connections.filter(
      conn => conn.source !== nodeId && conn.target !== nodeId
    );
    
    // Emit to all connected clients
    const io = req.app.get('io');
    io.emit('node-removed', nodeId);
    
    logger.info(`Removed node: ${nodeId}`);
    
    res.json({
      success: true,
      message: 'Node removed successfully'
    });
  } catch (error) {
    logger.error('Error removing node:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove node'
    });
  }
});

/**
 * PUT /api/nodes/:nodeId
 * Update node metadata (not for health updates - use /api/update for that)
 */
router.put('/:nodeId', (req, res) => {
  try {
    const { nodeId } = req.params;
    const node = global.nodesMap.get(nodeId);
    
    if (!node) {
      return res.status(404).json({
        success: false,
        error: 'Node not found'
      });
    }
    
    // Update allowed fields (not health metrics)
    const allowedFields = ['hostname', 'label', 'group', 'position', 'metadata'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        node[field] = req.body[field];
      }
    });
    
    global.nodesMap.set(nodeId, node);
    
    // Emit update
    const io = req.app.get('io');
    io.emit('node-updated', node);
    
    logger.info(`Updated node metadata: ${nodeId}`);
    
    res.json({
      success: true,
      node
    });
  } catch (error) {
    logger.error('Error updating node:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update node'
    });
  }
});

module.exports = router;
