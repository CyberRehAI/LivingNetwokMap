/**
 * Scanner API Routes
 * Handles network scanning using C++ addon
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Try to load C++ addon (gracefully fail if not compiled)
let scanner;
try {
  scanner = require('../build/Release/scanner');
  logger.info('C++ scanner module loaded successfully');
} catch (err) {
  logger.warn('C++ scanner module not available. Run "npm run build-cpp" to compile.');
  scanner = null;
}

/**
 * POST /api/scanner/scan
 * Scan a network subnet for active devices
 */
router.post('/scan', async (req, res) => {
  try {
    const { subnet, timeout } = req.body;
    
    // Validation
    if (!subnet) {
      return res.status(400).json({
        success: false,
        error: 'subnet is required (e.g., 192.168.1.0/24)'
      });
    }
    
    // Check if scanner is available
    if (!scanner) {
      // Fallback to simple JavaScript implementation
      return fallbackScan(req, res, subnet, timeout);
    }
    
    logger.info(`Starting network scan: ${subnet}`);
    
    // Call C++ scanner
    const results = await scanner.scanSubnet(subnet, timeout || 1000);
    
    // Add discovered devices to nodes map
    const io = req.app.get('io');
    const newNodes = [];
    
    results.activeHosts.forEach(host => {
      const nodeId = `discovered-${host.ip.replace(/\./g, '-')}`;
      
      if (!global.nodesMap.has(nodeId)) {
        const nodeData = {
          nodeId,
          hostname: host.hostname || nodeId,
          ip: host.ip,
          mac: host.mac || 'unknown',
          cpu: 0,
          ram: 0,
          disk: 0,
          latency: host.latency || 0,
          status: 'healthy',
          sent: 0,
          received: 0,
          lastUpdate: Date.now(),
          discovered: true,
          scanTime: Date.now()
        };
        
        global.nodesMap.set(nodeId, nodeData);
        newNodes.push(nodeData);
        
        io.emit('node-added', nodeData);
      }
    });
    
    logger.info(`Scan complete: Found ${results.activeHosts.length} devices, ${newNodes.length} new`);
    
    res.json({
      success: true,
      scan: {
        subnet,
        totalScanned: results.totalScanned,
        activeHosts: results.activeHosts.length,
        newNodes: newNodes.length,
        duration: results.duration
      },
      devices: results.activeHosts,
      timestamp: Date.now()
    });
    
  } catch (error) {
    logger.error('Error scanning network:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scan network',
      message: error.message
    });
  }
});

/**
 * Fallback JavaScript scanner (when C++ module not available)
 */
async function fallbackScan(req, res, subnet, timeout) {
  logger.info('Using fallback JavaScript scanner');
  
  const { exec } = require('child_process');
  const os = require('os');
  
  // Parse subnet
  const [baseIp, cidr] = subnet.split('/');
  const octets = baseIp.split('.');
  
  if (octets.length !== 4 || !cidr) {
    return res.status(400).json({
      success: false,
      error: 'Invalid subnet format. Use format: 192.168.1.0/24'
    });
  }
  
  // Simple /24 scan only for fallback
  if (cidr !== '24') {
    return res.status(400).json({
      success: false,
      error: 'Fallback scanner only supports /24 subnets'
    });
  }
  
  const baseOctets = octets.slice(0, 3).join('.');
  const activeHosts = [];
  const promises = [];
  
  // Ping sweep
  for (let i = 1; i < 255; i++) {
    const ip = `${baseOctets}.${i}`;
    
    const promise = new Promise((resolve) => {
      const pingCmd = os.platform() === 'win32' 
        ? `ping -n 1 -w 500 ${ip}`
        : `ping -c 1 -W 1 ${ip}`;
      
      exec(pingCmd, (error, stdout) => {
        if (!error || stdout.includes('TTL') || stdout.includes('ttl')) {
          activeHosts.push({
            ip,
            hostname: ip,
            latency: 0,
            mac: 'unknown'
          });
        }
        resolve();
      });
    });
    
    promises.push(promise);
  }
  
  await Promise.all(promises);
  
  logger.info(`Fallback scan complete: Found ${activeHosts.length} devices`);
  
  res.json({
    success: true,
    scan: {
      subnet,
      totalScanned: 254,
      activeHosts: activeHosts.length,
      method: 'fallback',
      note: 'Using fallback scanner. Install C++ module for better performance.'
    },
    devices: activeHosts,
    timestamp: Date.now()
  });
}

/**
 * GET /api/scanner/status
 * Get scanner module status
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    available: scanner !== null,
    type: scanner ? 'cpp' : 'fallback',
    capabilities: scanner ? scanner.getCapabilities() : {
      maxConcurrent: 50,
      protocols: ['icmp', 'tcp']
    }
  });
});

module.exports = router;
