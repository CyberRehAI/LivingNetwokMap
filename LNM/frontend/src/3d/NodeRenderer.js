/**
 * Node Renderer - Manages 3D node visualization
 * Creates and updates node spheres with color coding and labels
 */

import * as THREE from 'three';

export class NodeRenderer {
    constructor(scene, camera, domElement) {
        this.scene = scene;
        this.camera = camera;
        this.domElement = domElement;

        this.nodes = new Map(); // nodeId -> { mesh, label, data, position }
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.hoveredNode = null;
        this.showLabels = true;

        this.eventCallbacks = new Map();

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.domElement.addEventListener('click', (e) => this.onClick(e));
        this.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
    }

    addNode(nodeData, position) {
        if (this.nodes.has(nodeData.nodeId)) {
            this.updateNode(nodeData);
            return;
        }

        // Create sphere geometry
        const geometry = new THREE.SphereGeometry(0.5, 32, 32);
        const material = new THREE.MeshPhongMaterial({
            color: this.getStatusColor(nodeData.status),
            emissive: this.getStatusColor(nodeData.status),
            emissiveIntensity: 0.3,
            shininess: 100
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.nodeId = nodeData.nodeId;
        mesh.userData.nodeData = nodeData;

        this.scene.add(mesh);

        // Create label
        const label = this.createLabel(nodeData.hostname || nodeData.nodeId);
        label.position.copy(position);
        label.position.y += 1.5;
        this.scene.add(label);

        // Create glow effect
        const glowGeometry = new THREE.SphereGeometry(0.7, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: this.getStatusColor(nodeData.status),
            transparent: true,
            opacity: 0.2,
            side: THREE.BackSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.copy(position);
        this.scene.add(glow);

        this.nodes.set(nodeData.nodeId, {
            mesh,
            label,
            glow,
            data: nodeData,
            position: position.clone()
        });
    }

    updateNode(nodeData) {
        const node = this.nodes.get(nodeData.nodeId);
        if (!node) return;

        node.data = nodeData;

        // Update color based on status
        const color = this.getStatusColor(nodeData.status);
        node.mesh.material.color.setHex(color);
        node.mesh.material.emissive.setHex(color);
        node.glow.material.color.setHex(color);

        // Update label
        this.updateLabel(node.label, nodeData.hostname || nodeData.nodeId);

        // Pulse animation for status changes
        if (nodeData.status === 'down') {
            this.animatePulse(node.mesh, color);
        }
    }

    removeNode(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return;

        this.scene.remove(node.mesh);
        this.scene.remove(node.label);
        this.scene.remove(node.glow);

        node.mesh.geometry.dispose();
        node.mesh.material.dispose();
        node.glow.geometry.dispose();
        node.glow.material.dispose();

        this.nodes.delete(nodeId);
    }

    moveNode(nodeId, newPosition, animate = true) {
        const node = this.nodes.get(nodeId);
        if (!node) return;

        if (animate) {
            // Smooth animation
            const duration = 1000;
            const startPos = node.position.clone();
            const startTime = Date.now();

            const animatePosition = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Easing function
                const eased = this.easeInOutCubic(progress);

                node.position.lerpVectors(startPos, newPosition, eased);
                node.mesh.position.copy(node.position);
                node.label.position.copy(node.position);
                node.label.position.y += 1.5;
                node.glow.position.copy(node.position);

                if (progress < 1) {
                    requestAnimationFrame(animatePosition);
                }
            };

            animatePosition();
        } else {
            node.position.copy(newPosition);
            node.mesh.position.copy(newPosition);
            node.label.position.copy(newPosition);
            node.label.position.y += 1.5;
            node.glow.position.copy(newPosition);
        }
    }

    createLabel(text) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;

        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.font = 'Bold 24px Arial';
        context.fillStyle = '#00d9ff';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true,
            depthTest: false
        });

        const sprite = new THREE.Sprite(material);
        sprite.scale.set(4, 1, 1);
        sprite.visible = this.showLabels;

        return sprite;
    }

    updateLabel(label, text) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;

        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.font = 'Bold 24px Arial';
        context.fillStyle = '#00d9ff';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        label.material.map.needsUpdate = true;
        label.material.map.dispose();
        label.material.map = new THREE.CanvasTexture(canvas);
    }

    getStatusColor(status) {
        switch (status) {
            case 'healthy':
                return 0x00ff88;
            case 'warning':
                return 0xffaa00;
            case 'down':
                return 0xff3366;
            default:
                return 0x00d9ff;
        }
    }

    animatePulse(mesh, color) {
        const startScale = 1;
        const endScale = 1.3;
        const duration = 500;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            if (progress < 0.5) {
                const scale = startScale + (endScale - startScale) * (progress * 2);
                mesh.scale.setScalar(scale);
            } else {
                const scale = endScale - (endScale - startScale) * ((progress - 0.5) * 2);
                mesh.scale.setScalar(scale);
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                mesh.scale.setScalar(1);
            }
        };

        animate();
    }

    onClick(event) {
        this.updateMousePosition(event);

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(
            Array.from(this.nodes.values()).map(n => n.mesh)
        );

        if (intersects.length > 0) {
            const nodeData = intersects[0].object.userData.nodeData;
            this.emit('nodeClick', nodeData);
        }
    }

    onMouseMove(event) {
        this.updateMousePosition(event);

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(
            Array.from(this.nodes.values()).map(n => n.mesh)
        );

        if (intersects.length > 0) {
            const mesh = intersects[0].object;
            
            if (this.hoveredNode !== mesh) {
                // Reset previous
                if (this.hoveredNode) {
                    this.hoveredNode.scale.setScalar(1);
                }

                // Highlight new
                mesh.scale.setScalar(1.2);
                this.hoveredNode = mesh;
                this.domElement.style.cursor = 'pointer';
            }
        } else {
            if (this.hoveredNode) {
                this.hoveredNode.scale.setScalar(1);
                this.hoveredNode = null;
                this.domElement.style.cursor = 'default';
            }
        }
    }

    updateMousePosition(event) {
        const rect = this.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    setShowLabels(show) {
        this.showLabels = show;
        this.nodes.forEach(node => {
            node.label.visible = show;
        });
    }

    getNodePositions() {
        const positions = new Map();
        this.nodes.forEach((node, nodeId) => {
            positions.set(nodeId, node.position.clone());
        });
        return positions;
    }

    clear() {
        this.nodes.forEach((node, nodeId) => {
            this.removeNode(nodeId);
        });
    }

    update() {
        // Animate labels to face camera
        this.nodes.forEach(node => {
            node.label.lookAt(this.camera.position);
        });
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    // Event system
    on(event, callback) {
        if (!this.eventCallbacks.has(event)) {
            this.eventCallbacks.set(event, []);
        }
        this.eventCallbacks.get(event).push(callback);
    }

    emit(event, data) {
        if (this.eventCallbacks.has(event)) {
            this.eventCallbacks.get(event).forEach(callback => callback(data));
        }
    }
}
