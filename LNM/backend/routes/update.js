/**
 * Update API Route
 * Receives heartbeat updates from node agents
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * POST /api/update
 * Receive node health update from agent
 */
router.post('/', (req, res) => {
  try {
    const nodeData = req.body;
    
    // Validation
    if (!nodeData.nodeId || !nodeData.ip) {
      return res.status(400).json({
        success: false,
        error: 'nodeId and ip are required'
      });
    }
    
    // Check if this is a new node
    const isNewNode = !global.nodesMap.has(nodeData.nodeId);
    
    // Update node data
    const updatedNode = {
      ...nodeData,
      lastUpdate: Date.now()
    };
    
    // Get previous status for comparison
    const previousNode = global.nodesMap.get(nodeData.nodeId);
    const previousStatus = previousNode ? previousNode.status : null;
    
    // Store in memory
    global.nodesMap.set(nodeData.nodeId, updatedNode);
    
    // Get Socket.IO instance
    const io = req.app.get('io');
    
    // Emit appropriate event
    if (isNewNode) {
      logger.info(`New node registered: ${nodeData.nodeId} (${nodeData.ip})`);
      io.emit('node-added', updatedNode);
    } else {
      // Only emit if status changed or it's been a while
      if (previousStatus !== nodeData.status) {
        logger.info(`Node ${nodeData.nodeId} status changed: ${previousStatus} -> ${nodeData.status}`);
        io.emit('node-status-changed', updatedNode);
      }
      
      // Always emit real-time update for metrics
      io.emit('node-updated', updatedNode);
    }
    
    // Log detailed update in debug mode
    logger.debug(
      `Update from ${nodeData.nodeId}: ` +
      `CPU=${nodeData.cpu}% RAM=${nodeData.ram}% ` +
      `Latency=${nodeData.latency}ms Status=${nodeData.status}`
    );
    
    res.json({
      success: true,
      nodeId: nodeData.nodeId,
      status: nodeData.status,
      timestamp: Date.now()
    });
    
  } catch (error) {
    logger.error('Error processing update:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process update'
    });
  }
});

/**
 * POST /api/update/batch
 * Receive batch updates from multiple nodes
 */
router.post('/batch', (req, res) => {
  try {
    const { nodes } = req.body;
    
    if (!Array.isArray(nodes)) {
      return res.status(400).json({
        success: false,
        error: 'nodes must be an array'
      });
    }
    
    const io = req.app.get('io');
    const results = [];
    
    nodes.forEach(nodeData => {
      if (nodeData.nodeId && nodeData.ip) {
        const isNewNode = !global.nodesMap.has(nodeData.nodeId);
        
        const updatedNode = {
          ...nodeData,
          lastUpdate: Date.now()
        };
        
        global.nodesMap.set(nodeData.nodeId, updatedNode);
        
        if (isNewNode) {
          io.emit('node-added', updatedNode);
        } else {
          io.emit('node-updated', updatedNode);
        }
        
        results.push({
          nodeId: nodeData.nodeId,
          success: true
        });
      } else {
        results.push({
          nodeId: nodeData.nodeId || 'unknown',
          success: false,
          error: 'Missing required fields'
        });
      }
    });
    
    logger.info(`Batch update processed: ${results.length} nodes`);
    
    res.json({
      success: true,
      results,
      timestamp: Date.now()
    });
    
  } catch (error) {
    logger.error('Error processing batch update:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process batch update'
    });
  }
});

module.exports = router;
