/**
 * UI Controller - Manages all UI interactions and updates
 */

export class UI {
    constructor() {
        this.eventCallbacks = new Map();
        this.setupElements();
        this.setupEventListeners();
    }

    setupElements() {
        // Stats
        this.nodeCountEl = document.getElementById('nodeCount');
        this.healthyCountEl = document.getElementById('healthyCount');
        this.warningCountEl = document.getElementById('warningCount');
        this.downCountEl = document.getElementById('downCount');

        // Controls
        this.autoRotateBtn = document.getElementById('autoRotateBtn');
        this.resetViewBtn = document.getElementById('resetViewBtn');
        this.scanNetworkBtn = document.getElementById('scanNetworkBtn');
        this.autoDiscoverBtn = document.getElementById('autoDiscoverBtn');
        this.showLabelsCheckbox = document.getElementById('showLabels');
        this.showConnectionsCheckbox = document.getElementById('showConnections');
        this.showTrafficCheckbox = document.getElementById('showTraffic');
        this.layoutSelect = document.getElementById('layoutSelect');

        // Panels
        this.detailsPanel = document.getElementById('detailsPanel');
        this.detailsContent = document.getElementById('detailsContent');
        this.closeDetailsBtn = document.getElementById('closeDetailsBtn');

        // Status
        this.connectionStatus = document.getElementById('connectionStatus');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.notifications = document.getElementById('notifications');
    }

    setupEventListeners() {
        // Auto rotate toggle
        this.autoRotateBtn.addEventListener('click', () => {
            const enabled = this.autoRotateBtn.dataset.enabled === 'true';
            this.autoRotateBtn.dataset.enabled = !enabled;
            this.autoRotateBtn.textContent = `Auto Rotate: ${!enabled ? 'ON' : 'OFF'}`;
            this.emit('autoRotate', !enabled);
        });

        // Reset view
        this.resetViewBtn.addEventListener('click', () => {
            this.emit('resetView');
        });

        // Scan network
        this.scanNetworkBtn.addEventListener('click', () => {
            this.emit('scanNetwork');
        });

        // Auto discover
        this.autoDiscoverBtn.addEventListener('click', () => {
            this.emit('autoDiscover');
        });

        // View options
        this.showLabelsCheckbox.addEventListener('change', (e) => {
            this.emit('showLabels', e.target.checked);
        });

        this.showConnectionsCheckbox.addEventListener('change', (e) => {
            this.emit('showConnections', e.target.checked);
        });

        this.showTrafficCheckbox.addEventListener('change', (e) => {
            this.emit('showTraffic', e.target.checked);
        });

        // Layout change
        this.layoutSelect.addEventListener('change', (e) => {
            this.emit('layoutChange', e.target.value);
        });

        // Close details
        this.closeDetailsBtn.addEventListener('click', () => {
            this.closeDetails();
        });
    }

    updateStats({ total, healthy, warning, down }) {
        this.nodeCountEl.textContent = total;
        this.healthyCountEl.textContent = healthy;
        this.warningCountEl.textContent = warning;
        this.downCountEl.textContent = down;
    }

    showNodeDetails(node) {
        const html = `
            <div class="detail-item">
                <div class="detail-label">Node ID</div>
                <div class="detail-value">${node.nodeId}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Hostname</div>
                <div class="detail-value">${node.hostname || 'N/A'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">IP Address</div>
                <div class="detail-value">${node.ip}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Status</div>
                <div class="detail-value">
                    <span class="status-badge ${node.status}">${node.status.toUpperCase()}</span>
                </div>
            </div>
            <div class="detail-item">
                <div class="detail-label">CPU Usage</div>
                <div class="detail-value">${node.cpu?.toFixed(1) || 0}%</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">RAM Usage</div>
                <div class="detail-value">${node.ram?.toFixed(1) || 0}%</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Disk Usage</div>
                <div class="detail-value">${node.disk?.toFixed(1) || 0}%</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Latency</div>
                <div class="detail-value">${node.latency >= 0 ? node.latency + ' ms' : 'N/A'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Traffic Sent</div>
                <div class="detail-value">${this.formatBytes(node.sent || 0)}/s</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Traffic Received</div>
                <div class="detail-value">${this.formatBytes(node.received || 0)}/s</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">OS</div>
                <div class="detail-value">${node.os || 'Unknown'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Last Update</div>
                <div class="detail-value">${this.formatTime(node.lastUpdate)}</div>
            </div>
        `;

        this.detailsContent.innerHTML = html;
        this.detailsPanel.classList.add('active');
    }

    closeDetails() {
        this.detailsPanel.classList.remove('active');
    }

    setConnectionStatus(connected) {
        const indicator = this.connectionStatus.querySelector('.status-indicator');
        const text = this.connectionStatus.querySelector('.status-text');

        if (connected) {
            indicator.classList.add('connected');
            text.textContent = 'Connected';
        } else {
            indicator.classList.remove('connected');
            text.textContent = 'Disconnected';
        }
    }

    showLoading(show) {
        if (show) {
            this.loadingOverlay.classList.add('active');
        } else {
            this.loadingOverlay.classList.remove('active');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        this.notifications.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    formatTime(timestamp) {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) {
            return Math.floor(diff / 1000) + 's ago';
        } else if (diff < 3600000) {
            return Math.floor(diff / 60000) + 'm ago';
        } else {
            return date.toLocaleTimeString();
        }
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
