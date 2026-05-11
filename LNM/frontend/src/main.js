/**
 * LiveNetViz 3D - Main Entry Point
 * Initializes the 3D scene, WebSocket connection, and UI controls
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { NodeRenderer } from './3d/NodeRenderer.js';
import { LinesRenderer } from './3d/LinesRenderer.js';
import { SocketClient } from './realtime/socket.js';
import { UI } from './ui/UI.js';

class LiveNetViz3D {
    constructor() {
        // Three.js basics
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;

        // Custom renderers
        this.nodeRenderer = null;
        this.linesRenderer = null;

        // WebSocket
        this.socket = null;

        // UI
        this.ui = null;

        // State
        this.nodes = new Map();
        this.connections = [];
        this.autoRotate = false;
        this.selectedNode = null;

        // Settings
        this.showLabels = true;
        this.showConnections = true;
        this.showTraffic = true;
        this.layout = 'sphere';

        this.init();
    }

    init() {
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupControls();
        this.setupLighting();
        this.setupRenderers();
        this.setupSocket();
        this.setupUI();
        this.setupEventListeners();
        this.animate();

        console.log('LiveNetViz 3D initialized');
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0e27);
        this.scene.fog = new THREE.Fog(0x0a0e27, 50, 200);
    }

    setupCamera() {
        const container = document.getElementById('canvas-container');
        const aspect = container.clientWidth / container.clientHeight;
        
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.camera.position.set(0, 30, 50);
        this.camera.lookAt(0, 0, 0);
    }

    setupRenderer() {
        const canvas = document.getElementById('scene');
        
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true
        });

        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight - 70);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 150;
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = 0.5;
    }

    setupLighting() {
        // Ambient light
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambient);

        // Directional light (main)
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(50, 50, 50);
        dirLight.castShadow = true;
        dirLight.shadow.camera.near = 0.1;
        dirLight.shadow.camera.far = 200;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        this.scene.add(dirLight);

        // Point lights for accent
        const light1 = new THREE.PointLight(0x00d9ff, 1, 100);
        light1.position.set(30, 20, 30);
        this.scene.add(light1);

        const light2 = new THREE.PointLight(0x7b2cbf, 1, 100);
        light2.position.set(-30, 20, -30);
        this.scene.add(light2);

        // Hemisphere light
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
        this.scene.add(hemiLight);
    }

    setupRenderers() {
        this.nodeRenderer = new NodeRenderer(this.scene, this.camera, this.renderer.domElement);
        this.linesRenderer = new LinesRenderer(this.scene);

        // Listen for node selection
        this.nodeRenderer.on('nodeClick', (node) => {
            this.onNodeClick(node);
        });
    }

    setupSocket() {
        this.socket = new SocketClient();

        // Handle initial state
        this.socket.on('initial-state', (data) => {
            console.log('Received initial state:', data);
            this.loadInitialState(data);
        });

        // Handle node updates
        this.socket.on('node-added', (node) => {
            console.log('Node added:', node.nodeId);
            this.addNode(node);
            this.ui.showNotification(`New node: ${node.hostname || node.nodeId}`, 'success');
        });

        this.socket.on('node-updated', (node) => {
            this.updateNode(node);
        });

        this.socket.on('node-removed', (nodeId) => {
            console.log('Node removed:', nodeId);
            this.removeNode(nodeId);
            this.ui.showNotification(`Node removed: ${nodeId}`, 'warning');
        });

        this.socket.on('node-status-changed', (node) => {
            console.log('Status changed:', node.nodeId, node.status);
            this.updateNode(node);
            this.ui.showNotification(
                `${node.hostname || node.nodeId}: ${node.status}`,
                node.status === 'down' ? 'error' : 'warning'
            );
        });

        // Handle topology updates
        this.socket.on('connection-added', (connection) => {
            this.addConnection(connection);
        });

        this.socket.on('topology-discovered', (connections) => {
            connections.forEach(conn => this.addConnection(conn));
            this.ui.showNotification(`Discovered ${connections.length} connections`, 'success');
        });

        // Connection status
        this.socket.on('connect', () => {
            this.ui.setConnectionStatus(true);
        });

        this.socket.on('disconnect', () => {
            this.ui.setConnectionStatus(false);
        });
    }

    setupUI() {
        this.ui = new UI();

        // Control button listeners
        this.ui.on('autoRotate', (enabled) => {
            this.autoRotate = enabled;
            this.controls.autoRotate = enabled;
        });

        this.ui.on('resetView', () => {
            this.resetCamera();
        });

        this.ui.on('scanNetwork', () => {
            this.scanNetwork();
        });

        this.ui.on('autoDiscover', () => {
            this.autoDiscoverTopology();
        });

        this.ui.on('showLabels', (enabled) => {
            this.showLabels = enabled;
            this.nodeRenderer.setShowLabels(enabled);
        });

        this.ui.on('showConnections', (enabled) => {
            this.showConnections = enabled;
            this.linesRenderer.setVisible(enabled);
        });

        this.ui.on('showTraffic', (enabled) => {
            this.showTraffic = enabled;
            this.linesRenderer.setAnimateTraffic(enabled);
        });

        this.ui.on('layoutChange', (layout) => {
            this.layout = layout;
            this.applyLayout(layout);
        });
    }

    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => {
            this.onResize();
        });

        // Keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.key === 'r' || e.key === 'R') {
                this.resetCamera();
            } else if (e.key === 'Escape') {
                this.ui.closeDetails();
            }
        });
    }

    loadInitialState(data) {
        // Clear existing
        this.nodes.clear();
        this.connections = [];
        this.nodeRenderer.clear();
        this.linesRenderer.clear();

        // Add nodes
        data.nodes.forEach(node => {
            this.addNode(node, false);
        });

        // Add connections
        data.connections.forEach(conn => {
            this.addConnection(conn, false);
        });

        // Apply initial layout
        this.applyLayout(this.layout);

        // Update UI stats
        this.updateStats();
    }

    addNode(nodeData, applyLayout = true) {
        this.nodes.set(nodeData.nodeId, nodeData);
        
        // Calculate position based on layout
        const position = this.calculateNodePosition(nodeData, this.nodes.size - 1);
        
        this.nodeRenderer.addNode(nodeData, position);

        if (applyLayout) {
            this.updateStats();
        }
    }

    updateNode(nodeData) {
        if (!this.nodes.has(nodeData.nodeId)) {
            this.addNode(nodeData);
            return;
        }

        this.nodes.set(nodeData.nodeId, nodeData);
        this.nodeRenderer.updateNode(nodeData);

        // Update details if this node is selected
        if (this.selectedNode && this.selectedNode.nodeId === nodeData.nodeId) {
            this.ui.showNodeDetails(nodeData);
        }

        this.updateStats();
    }

    removeNode(nodeId) {
        this.nodes.delete(nodeId);
        this.nodeRenderer.removeNode(nodeId);

        // Remove associated connections
        this.connections = this.connections.filter(
            conn => conn.source !== nodeId && conn.target !== nodeId
        );
        this.linesRenderer.updateConnections(this.connections, this.nodeRenderer.getNodePositions());

        if (this.selectedNode && this.selectedNode.nodeId === nodeId) {
            this.ui.closeDetails();
            this.selectedNode = null;
        }

        this.updateStats();
    }

    addConnection(connection, update = true) {
        this.connections.push(connection);
        
        if (update) {
            this.linesRenderer.updateConnections(
                this.connections,
                this.nodeRenderer.getNodePositions()
            );
        }
    }

    calculateNodePosition(nodeData, index) {
        const count = this.nodes.size;
        const radius = 20;

        switch (this.layout) {
            case 'sphere':
                return this.sphereLayout(index, count, radius);
            case 'grid':
                return this.gridLayout(index, radius);
            case 'ring':
                return this.ringLayout(index, count, radius);
            case 'random':
                return this.randomLayout(radius);
            default:
                return new THREE.Vector3(0, 0, 0);
        }
    }

    sphereLayout(index, count, radius) {
        const phi = Math.acos(-1 + (2 * index) / count);
        const theta = Math.sqrt(count * Math.PI) * phi;

        return new THREE.Vector3(
            radius * Math.cos(theta) * Math.sin(phi),
            radius * Math.sin(theta) * Math.sin(phi),
            radius * Math.cos(phi)
        );
    }

    gridLayout(index, spacing) {
        const gridSize = Math.ceil(Math.sqrt(this.nodes.size));
        const x = (index % gridSize) * spacing - (gridSize * spacing) / 2;
        const z = Math.floor(index / gridSize) * spacing - (gridSize * spacing) / 2;
        return new THREE.Vector3(x, 0, z);
    }

    ringLayout(index, count, radius) {
        const angle = (index / count) * Math.PI * 2;
        return new THREE.Vector3(
            radius * Math.cos(angle),
            0,
            radius * Math.sin(angle)
        );
    }

    randomLayout(radius) {
        return new THREE.Vector3(
            (Math.random() - 0.5) * radius * 2,
            (Math.random() - 0.5) * radius * 2,
            (Math.random() - 0.5) * radius * 2
        );
    }

    applyLayout(layout) {
        let index = 0;
        this.nodes.forEach((nodeData, nodeId) => {
            const position = this.calculateNodePosition(nodeData, index);
            this.nodeRenderer.moveNode(nodeId, position);
            index++;
        });

        // Update connections
        this.linesRenderer.updateConnections(
            this.connections,
            this.nodeRenderer.getNodePositions()
        );
    }

    onNodeClick(node) {
        this.selectedNode = node;
        this.ui.showNodeDetails(node);
    }

    resetCamera() {
        this.camera.position.set(0, 30, 50);
        this.camera.lookAt(0, 0, 0);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    async scanNetwork() {
        const subnet = prompt('Enter subnet to scan (e.g., 192.168.1.0/24):', '192.168.1.0/24');
        if (!subnet) return;

        this.ui.showLoading(true);

        try {
            const response = await fetch('http://localhost:3000/api/scanner/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subnet, timeout: 1000 })
            });

            const data = await response.json();
            
            if (data.success) {
                this.ui.showNotification(
                    `Scan complete: Found ${data.scan.activeHosts} devices`,
                    'success'
                );
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Scan error:', error);
            this.ui.showNotification(`Scan failed: ${error.message}`, 'error');
        } finally {
            this.ui.showLoading(false);
        }
    }

    async autoDiscoverTopology() {
        try {
            const response = await fetch('http://localhost:3000/api/topology/auto-discover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();
            
            if (data.success) {
                this.ui.showNotification(
                    `Discovered ${data.count} connections`,
                    'success'
                );
            }
        } catch (error) {
            console.error('Auto-discover error:', error);
            this.ui.showNotification('Auto-discover failed', 'error');
        }
    }

    updateStats() {
        let healthy = 0, warning = 0, down = 0;

        this.nodes.forEach(node => {
            if (node.status === 'healthy') healthy++;
            else if (node.status === 'warning') warning++;
            else if (node.status === 'down') down++;
        });

        this.ui.updateStats({
            total: this.nodes.size,
            healthy,
            warning,
            down
        });
    }

    onResize() {
        const container = document.getElementById('canvas-container');
        const width = container.clientWidth;
        const height = container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Update controls
        this.controls.update();

        // Update renderers
        this.nodeRenderer.update();
        this.linesRenderer.update();

        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize app when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    new LiveNetViz3D();
});
