/**
 * Lines Renderer - Manages connection lines between nodes
 * Creates animated lines showing network connections and traffic flow
 */

import * as THREE from 'three';

export class LinesRenderer {
    constructor(scene) {
        this.scene = scene;
        this.lines = [];
        this.particles = [];
        this.visible = true;
        this.animateTraffic = true;
    }

    updateConnections(connections, nodePositions) {
        // Clear existing lines
        this.clear();

        // Create new lines
        connections.forEach(connection => {
            const sourcePos = nodePositions.get(connection.source);
            const targetPos = nodePositions.get(connection.target);

            if (sourcePos && targetPos) {
                this.createConnection(connection, sourcePos, targetPos);
            }
        });
    }

    createConnection(connection, sourcePos, targetPos) {
        // Create line
        const points = [sourcePos, targetPos];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        
        const material = new THREE.LineBasicMaterial({
            color: 0x00d9ff,
            opacity: 0.3,
            transparent: true,
            linewidth: 2
        });

        const line = new THREE.Line(geometry, material);
        line.userData.connectionId = connection.id;
        
        if (this.visible) {
            this.scene.add(line);
        }

        this.lines.push(line);

        // Create traffic particles
        if (this.animateTraffic && connection.bandwidth > 0) {
            this.createTrafficParticles(connection, sourcePos, targetPos);
        }
    }

    createTrafficParticles(connection, sourcePos, targetPos) {
        const particleCount = Math.min(Math.floor(connection.bandwidth / 100), 10);

        for (let i = 0; i < particleCount; i++) {
            const geometry = new THREE.SphereGeometry(0.1, 8, 8);
            const material = new THREE.MeshBasicMaterial({
                color: 0x00ff88,
                transparent: true,
                opacity: 0.8
            });

            const particle = new THREE.Mesh(geometry, material);
            
            particle.userData = {
                source: sourcePos.clone(),
                target: targetPos.clone(),
                progress: i / particleCount,
                speed: 0.01 + Math.random() * 0.01,
                connectionId: connection.id
            };

            this.updateParticlePosition(particle);
            
            if (this.visible && this.animateTraffic) {
                this.scene.add(particle);
            }

            this.particles.push(particle);
        }
    }

    updateParticlePosition(particle) {
        const { source, target, progress } = particle.userData;
        particle.position.lerpVectors(source, target, progress);
    }

    update() {
        if (!this.animateTraffic) return;

        this.particles.forEach(particle => {
            particle.userData.progress += particle.userData.speed;

            if (particle.userData.progress >= 1) {
                particle.userData.progress = 0;
            }

            this.updateParticlePosition(particle);

            // Fade in/out effect
            const progress = particle.userData.progress;
            if (progress < 0.1) {
                particle.material.opacity = progress * 8;
            } else if (progress > 0.9) {
                particle.material.opacity = (1 - progress) * 8;
            } else {
                particle.material.opacity = 0.8;
            }
        });
    }

    setVisible(visible) {
        this.visible = visible;

        this.lines.forEach(line => {
            if (visible) {
                this.scene.add(line);
            } else {
                this.scene.remove(line);
            }
        });

        this.particles.forEach(particle => {
            if (visible && this.animateTraffic) {
                this.scene.add(particle);
            } else {
                this.scene.remove(particle);
            }
        });
    }

    setAnimateTraffic(animate) {
        this.animateTraffic = animate;

        this.particles.forEach(particle => {
            if (animate && this.visible) {
                this.scene.add(particle);
            } else {
                this.scene.remove(particle);
            }
        });
    }

    clear() {
        // Remove lines
        this.lines.forEach(line => {
            this.scene.remove(line);
            line.geometry.dispose();
            line.material.dispose();
        });
        this.lines = [];

        // Remove particles
        this.particles.forEach(particle => {
            this.scene.remove(particle);
            particle.geometry.dispose();
            particle.material.dispose();
        });
        this.particles = [];
    }

    highlightConnection(connectionId) {
        const line = this.lines.find(l => l.userData.connectionId === connectionId);
        if (line) {
            line.material.color.setHex(0xffaa00);
            line.material.opacity = 0.8;
        }
    }

    unhighlightConnection(connectionId) {
        const line = this.lines.find(l => l.userData.connectionId === connectionId);
        if (line) {
            line.material.color.setHex(0x00d9ff);
            line.material.opacity = 0.3;
        }
    }
}
