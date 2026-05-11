/**
 * WebSocket Client - Manages real-time connection to backend
 */

import { io } from 'socket.io-client';

export class SocketClient {
    constructor() {
        this.socket = null;
        this.eventCallbacks = new Map();
        this.connected = false;
        
        this.connect();
    }

    connect() {
        const serverUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
        
        console.log('Connecting to:', serverUrl);

        this.socket = io(serverUrl, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 10,
            transports: ['websocket', 'polling']
        });

        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.socket.on('connect', () => {
            console.log('WebSocket connected');
            this.connected = true;
            this.emit('connect');
        });

        this.socket.on('disconnect', (reason) => {
            console.log('WebSocket disconnected:', reason);
            this.connected = false;
            this.emit('disconnect', reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.emit('connect_error', error);
        });

        // Forward all backend events
        this.socket.onAny((event, ...args) => {
            console.log('Socket event:', event, args);
            this.emit(event, ...args);
        });
    }

    // Send event to server
    send(event, data) {
        if (this.socket && this.connected) {
            this.socket.emit(event, data);
        } else {
            console.warn('Socket not connected, cannot send:', event);
        }
    }

    // Request nodes from server
    requestNodes() {
        this.send('request-nodes');
    }

    // Request topology from server
    requestTopology() {
        this.send('request-topology');
    }

    // Event system
    on(event, callback) {
        if (!this.eventCallbacks.has(event)) {
            this.eventCallbacks.set(event, []);
        }
        this.eventCallbacks.get(event).push(callback);
    }

    emit(event, ...args) {
        if (this.eventCallbacks.has(event)) {
            this.eventCallbacks.get(event).forEach(callback => {
                callback(...args);
            });
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}
