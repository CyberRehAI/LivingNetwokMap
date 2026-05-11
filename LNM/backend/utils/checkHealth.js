/**
 * Health Check Utility
 * Monitors node health and detects failures
 */

const logger = require('./logger');

/**
 * Check if a node is healthy based on various metrics
 * @param {Object} node - Node data object
 * @returns {Object} - Health assessment
 */
function checkNodeHealth(node) {
  const now = Date.now();
  const timeSinceUpdate = now - node.lastUpdate;
  
  const assessment = {
    nodeId: node.nodeId,
    healthy: true,
    warnings: [],
    status: 'healthy'
  };

  // Check last update time
  if (timeSinceUpdate > 10000) { // 10 seconds
    assessment.healthy = false;
    assessment.status = 'down';
    assessment.warnings.push(`No update for ${Math.round(timeSinceUpdate / 1000)}s`);
    return assessment;
  }

  // Check latency
  if (node.latency > 200) {
    assessment.warnings.push(`High latency: ${node.latency}ms`);
    assessment.status = 'warning';
  } else if (node.latency === -1) {
    assessment.healthy = false;
    assessment.status = 'down';
    assessment.warnings.push('Cannot measure latency');
    return assessment;
  }

  // Check CPU
  if (node.cpu > 90) {
    assessment.warnings.push(`Critical CPU: ${node.cpu}%`);
    assessment.status = 'warning';
  } else if (node.cpu > 80) {
    assessment.warnings.push(`High CPU: ${node.cpu}%`);
    if (assessment.status === 'healthy') assessment.status = 'warning';
  }

  // Check RAM
  if (node.ram > 95) {
    assessment.warnings.push(`Critical RAM: ${node.ram}%`);
    assessment.status = 'warning';
  } else if (node.ram > 85) {
    assessment.warnings.push(`High RAM: ${node.ram}%`);
    if (assessment.status === 'healthy') assessment.status = 'warning';
  }

  // Check disk
  if (node.disk > 95) {
    assessment.warnings.push(`Critical Disk: ${node.disk}%`);
    assessment.status = 'warning';
  }

  return assessment;
}

/**
 * Initialize health checker interval
 * @param {Map} nodesMap - Global nodes map
 * @param {Function} onStatusChange - Callback when status changes
 * @param {Number} interval - Check interval in ms
 */
function initHealthChecker(nodesMap, onStatusChange, interval = 5000) {
  setInterval(() => {
    nodesMap.forEach((node, nodeId) => {
      const assessment = checkNodeHealth(node);
      
      // If status changed, update and notify
      if (assessment.status !== node.status) {
        logger.warn(`Node ${nodeId} status changed: ${node.status} -> ${assessment.status}`);
        
        node.status = assessment.status;
        nodesMap.set(nodeId, node);
        
        if (onStatusChange) {
          onStatusChange(node);
        }
      }

      // Log warnings
      if (assessment.warnings.length > 0) {
        logger.warn(`Node ${nodeId}: ${assessment.warnings.join(', ')}`);
      }
    });
  }, interval);

  logger.info(`Health checker initialized (interval: ${interval}ms)`);
}

/**
 * Calculate network statistics
 * @param {Array} nodes - Array of node objects
 * @returns {Object} - Network statistics
 */
function calculateNetworkStats(nodes) {
  const stats = {
    totalNodes: nodes.length,
    healthyNodes: 0,
    warningNodes: 0,
    downNodes: 0,
    avgCpu: 0,
    avgRam: 0,
    avgLatency: 0,
    totalTraffic: {
      sent: 0,
      received: 0
    }
  };

  let validLatencyCount = 0;

  nodes.forEach(node => {
    // Count by status
    if (node.status === 'healthy') stats.healthyNodes++;
    else if (node.status === 'warning') stats.warningNodes++;
    else if (node.status === 'down') stats.downNodes++;

    // Sum metrics
    stats.avgCpu += node.cpu || 0;
    stats.avgRam += node.ram || 0;
    
    if (node.latency > 0) {
      stats.avgLatency += node.latency;
      validLatencyCount++;
    }

    stats.totalTraffic.sent += node.sent || 0;
    stats.totalTraffic.received += node.received || 0;
  });

  // Calculate averages
  if (nodes.length > 0) {
    stats.avgCpu = Math.round(stats.avgCpu / nodes.length * 100) / 100;
    stats.avgRam = Math.round(stats.avgRam / nodes.length * 100) / 100;
  }

  if (validLatencyCount > 0) {
    stats.avgLatency = Math.round(stats.avgLatency / validLatencyCount * 100) / 100;
  }

  return stats;
}

module.exports = {
  checkNodeHealth,
  initHealthChecker,
  calculateNetworkStats
};
