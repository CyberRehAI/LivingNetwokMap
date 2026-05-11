/**
 * LiveNetViz 3D - Auto-Discovery Module
 * 
 * Automatically discovers and adds network nodes when the system starts.
 * Uses the C++ scanner to find active hosts and creates agent connections.
 */

const axios = require('axios');
const os = require('os');
const logger = require('./utils/logger');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

/**
 * Get local network range to scan
 */
function getLocalNetworkRange() {
    const interfaces = os.networkInterfaces();
    const ranges = [];

    for (const [name, addresses] of Object.entries(interfaces)) {
        for (const addr of addresses) {
            if (addr.family === 'IPv4' && !addr.internal) {
                // Get network base (e.g., 192.168.1.0/24)
                const ip = addr.address;
                const parts = ip.split('.');
                const networkBase = `${parts[0]}.${parts[1]}.${parts[2]}`;
                ranges.push(networkBase);
            }
        }
    }

    return ranges;
}

/**
 * Scan network and discover active nodes
 */
async function discoverNodes() {
    try {
        logger.info('[Auto-Discovery] Starting network scan...');
        
        const ranges = getLocalNetworkRange();
        if (ranges.length === 0) {
            logger.warn('[Auto-Discovery] No network interfaces found');
            return;
        }

        logger.info(`[Auto-Discovery] Scanning networks: ${ranges.join(', ')}`);

        // Add localhost first
        await addNode({
            nodeId: 'localhost',
            name: 'Localhost',
            ip: '127.0.0.1',
            type: 'server',
            status: 'healthy'
        });

        // Add current host
        const hostname = os.hostname();
        const localIPs = [];
        const interfaces = os.networkInterfaces();
        
        for (const [name, addresses] of Object.entries(interfaces)) {
            for (const addr of addresses) {
                if (addr.family === 'IPv4' && !addr.internal) {
                    localIPs.push(addr.address);
                }
            }
        }

        if (localIPs.length > 0) {
            await addNode({
                nodeId: hostname,
                name: hostname,
                ip: localIPs[0],
                type: 'server',
                status: 'healthy',
                cpu: 0,
                memory: 0,
                network: 0
            });
        }

        // Scan each network range
        for (const networkBase of ranges) {
            // Scan a few common IPs (1, 10, 50, 100, 254)
            const ipsToScan = [1, 10, 50, 100, 254];
            
            for (const lastOctet of ipsToScan) {
                const ip = `${networkBase}.${lastOctet}`;
                
                // Skip if it's the current host
                if (localIPs.includes(ip)) continue;
                
                try {
                    // Try to connect (quick timeout)
                    const response = await axios.get(`http://${ip}:3000/health`, {
                        timeout: 1000
                    }).catch(() => null);

                    if (response && response.status === 200) {
                        await addNode({
                            nodeId: `node-${ip.replace(/\./g, '-')}`,
                            name: `Node ${lastOctet}`,
                            ip: ip,
                            type: 'agent',
                            status: 'healthy'
                        });
                        logger.info(`[Auto-Discovery] Found node at ${ip}`);
                    }
                } catch (error) {
                    // Silently ignore unreachable IPs
                }
            }
        }

        // Add some default demo nodes for visualization
        await addDemoNodes();

        logger.info('[Auto-Discovery] Network scan completed');
        
    } catch (error) {
        logger.error('[Auto-Discovery] Error during discovery:', error.message);
    }
}

/**
 * Add a node to the backend
 */
async function addNode(nodeData) {
    try {
        await axios.post(`${BACKEND_URL}/api/nodes`, nodeData, {
            timeout: 5000
        });
        logger.info(`[Auto-Discovery] Added node: ${nodeData.name} (${nodeData.ip})`);
    } catch (error) {
        // Silently ignore if node already exists
        if (!error.response || error.response.status !== 409) {
            logger.error(`[Auto-Discovery] Failed to add node ${nodeData.name}:`, error.message);
        }
    }
}

/**
 * Add demo nodes for immediate visualization
 */
async function addDemoNodes() {
    const demoNodes = [
        {
            nodeId: 'gateway',
            name: 'Network Gateway',
            ip: '192.168.1.1',
            type: 'router',
            status: 'healthy',
            cpu: 15,
            memory: 45,
            network: 1200
        },
        {
            nodeId: 'server-01',
            name: 'Web Server',
            ip: '192.168.1.10',
            type: 'server',
            status: 'healthy',
            cpu: 65,
            memory: 78,
            network: 5600
        },
        {
            nodeId: 'server-02',
            name: 'Database Server',
            ip: '192.168.1.11',
            type: 'database',
            status: 'warning',
            cpu: 82,
            memory: 91,
            network: 3200
        },
        {
            nodeId: 'workstation-01',
            name: 'Workstation 1',
            ip: '192.168.1.100',
            type: 'workstation',
            status: 'healthy',
            cpu: 25,
            memory: 42,
            network: 800
        },
        {
            nodeId: 'workstation-02',
            name: 'Workstation 2',
            ip: '192.168.1.101',
            type: 'workstation',
            status: 'healthy',
            cpu: 18,
            memory: 35,
            network: 450
        }
    ];

    for (const node of demoNodes) {
        await addNode(node);
    }

    // Add connections between nodes
    await addConnections();
}

/**
 * Add network connections/topology
 */
async function addConnections() {
    const connections = [
        { source: 'gateway', target: 'localhost', bandwidth: 1000 },
        { source: 'gateway', target: 'server-01', bandwidth: 1000 },
        { source: 'gateway', target: 'server-02', bandwidth: 1000 },
        { source: 'gateway', target: 'workstation-01', bandwidth: 100 },
        { source: 'gateway', target: 'workstation-02', bandwidth: 100 },
        { source: 'server-01', target: 'server-02', bandwidth: 1000 }
    ];

    for (const conn of connections) {
        try {
            await axios.post(`${BACKEND_URL}/api/topology`, conn, {
                timeout: 5000
            });
        } catch (error) {
            // Ignore errors
        }
    }
}

/**
 * Wait for backend to be ready
 */
async function waitForBackend(maxAttempts = 30, delay = 1000) {
    logger.info('[Auto-Discovery] Waiting for backend to be ready...');
    
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await axios.get(`${BACKEND_URL}/health`, {
                timeout: 2000
            });
            
            if (response.status === 200) {
                logger.info('[Auto-Discovery] Backend is ready!');
                return true;
            }
        } catch (error) {
            // Backend not ready yet
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    logger.error('[Auto-Discovery] Backend did not become ready in time');
    return false;
}

/**
 * Main auto-discovery function
 */
async function runAutoDiscovery() {
    const isReady = await waitForBackend();
    
    if (!isReady) {
        logger.error('[Auto-Discovery] Cannot run - backend not available');
        process.exit(1);
    }

    // Wait a bit more for backend to fully initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await discoverNodes();
    
    logger.info('[Auto-Discovery] Auto-discovery completed successfully');
    process.exit(0);
}

// Run if executed directly
if (require.main === module) {
    runAutoDiscovery().catch(error => {
        logger.error('[Auto-Discovery] Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { discoverNodes, waitForBackend };
