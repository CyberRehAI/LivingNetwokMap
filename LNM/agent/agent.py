#!/usr/bin/env python3
"""
LiveNetViz 3D - Node Agent
A lightweight cross-platform agent that monitors system metrics and reports to the backend.

Features:
- CPU, RAM, Network usage monitoring
- Latency measurement
- Auto-discovery of network interfaces
- Resilient connection with retry logic
- Configurable reporting intervals
"""

import os
import sys
import time
import json
import uuid
import socket
import platform
import argparse
import logging
from datetime import datetime
from typing import Dict, Optional

try:
    import psutil
    import requests
except ImportError:
    print("ERROR: Required dependencies not installed.")
    print("Please run: pip install psutil requests")
    sys.exit(1)


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('agent.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('LiveNetViz-Agent')


class NetworkAgent:
    """
    Main agent class that collects system metrics and reports to backend.
    """
    
    def __init__(self, server_url: str, node_id: Optional[str] = None, 
                 update_interval: int = 2):
        """
        Initialize the network agent.
        
        Args:
            server_url: Backend server URL (e.g., http://localhost:3000)
            node_id: Unique identifier for this node (auto-generated if None)
            update_interval: How often to send updates in seconds
        """
        self.server_url = server_url.rstrip('/')
        self.update_interval = update_interval
        self.node_id = node_id or self._generate_node_id()
        self.ip_address = self._get_primary_ip()
        self.hostname = socket.gethostname()
        self.os_info = f"{platform.system()} {platform.release()}"
        
        # For calculating network traffic deltas
        self.last_net_io = None
        self.last_check_time = time.time()
        
        logger.info(f"Agent initialized: {self.node_id} ({self.ip_address})")
        logger.info(f"Reporting to: {self.server_url}")
    
    def _generate_node_id(self) -> str:
        """Generate a unique node ID based on hostname and MAC address."""
        hostname = socket.gethostname()
        mac = ':'.join(['{:02x}'.format((uuid.getnode() >> elements) & 0xff)
                       for elements in range(0, 2*6, 2)][::-1])
        return f"{hostname}-{mac[:8]}"
    
    def _get_primary_ip(self) -> str:
        """Get the primary IP address of this machine."""
        try:
            # Create a socket to determine the primary network interface
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            # Fallback to localhost if unable to determine
            return "127.0.0.1"
    
    def _get_cpu_usage(self) -> float:
        """Get current CPU usage percentage."""
        return psutil.cpu_percent(interval=0.5)
    
    def _get_memory_usage(self) -> float:
        """Get current RAM usage percentage."""
        return psutil.virtual_memory().percent
    
    def _get_disk_usage(self) -> float:
        """Get current disk usage percentage."""
        try:
            return psutil.disk_usage('/').percent
        except:
            return 0.0
    
    def _get_network_traffic(self) -> Dict[str, int]:
        """
        Get network traffic statistics (bytes sent/received since last check).
        Returns delta values for real-time traffic monitoring.
        """
        current_net_io = psutil.net_io_counters()
        current_time = time.time()
        
        if self.last_net_io is None:
            self.last_net_io = current_net_io
            self.last_check_time = current_time
            return {"sent": 0, "received": 0}
        
        # Calculate deltas
        time_delta = current_time - self.last_check_time
        sent_delta = current_net_io.bytes_sent - self.last_net_io.bytes_sent
        recv_delta = current_net_io.bytes_recv - self.last_net_io.bytes_recv
        
        # Calculate rate (bytes per second)
        sent_rate = int(sent_delta / time_delta) if time_delta > 0 else 0
        recv_rate = int(recv_delta / time_delta) if time_delta > 0 else 0
        
        self.last_net_io = current_net_io
        self.last_check_time = current_time
        
        return {
            "sent": sent_rate,
            "received": recv_rate,
            "sent_total": current_net_io.bytes_sent,
            "received_total": current_net_io.bytes_recv
        }
    
    def _measure_latency(self) -> float:
        """
        Measure latency to the backend server.
        Returns latency in milliseconds.
        """
        try:
            start = time.time()
            response = requests.get(f"{self.server_url}/health", timeout=2)
            latency = (time.time() - start) * 1000  # Convert to ms
            return round(latency, 2)
        except Exception as e:
            logger.warning(f"Failed to measure latency: {e}")
            return -1  # Indicates measurement failure
    
    def _determine_status(self, cpu: float, ram: float, latency: float) -> str:
        """
        Determine node status based on metrics.
        
        Returns:
            "healthy", "warning", or "down"
        """
        if latency == -1:
            return "down"
        
        if cpu > 80 or ram > 85 or latency > 200:
            return "warning"
        
        return "healthy"
    
    def collect_metrics(self) -> Dict:
        """
        Collect all system metrics and prepare payload for backend.
        
        Returns:
            Dictionary containing all metrics
        """
        cpu = self._get_cpu_usage()
        ram = self._get_memory_usage()
        disk = self._get_disk_usage()
        network = self._get_network_traffic()
        latency = self._measure_latency()
        status = self._determine_status(cpu, ram, latency)
        
        payload = {
            "nodeId": self.node_id,
            "hostname": self.hostname,
            "ip": self.ip_address,
            "os": self.os_info,
            "cpu": round(cpu, 2),
            "ram": round(ram, 2),
            "disk": round(disk, 2),
            "latency": latency,
            "status": status,
            "sent": network["sent"],
            "received": network["received"],
            "sent_total": network.get("sent_total", 0),
            "received_total": network.get("received_total", 0),
            "timestamp": datetime.now().isoformat(),
            "uptime": int(time.time() - psutil.boot_time())
        }
        
        return payload
    
    def send_update(self, payload: Dict, retries: int = 3) -> bool:
        """
        Send metrics to the backend server with retry logic.
        
        Args:
            payload: Metrics dictionary
            retries: Number of retry attempts
            
        Returns:
            True if successful, False otherwise
        """
        for attempt in range(retries):
            try:
                response = requests.post(
                    f"{self.server_url}/api/update",
                    json=payload,
                    timeout=5,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    logger.debug(f"Update sent successfully: {self.node_id}")
                    return True
                else:
                    logger.warning(f"Server returned status {response.status_code}")
                    
            except requests.exceptions.ConnectionError:
                logger.error(f"Connection failed (attempt {attempt + 1}/{retries})")
            except requests.exceptions.Timeout:
                logger.error(f"Request timeout (attempt {attempt + 1}/{retries})")
            except Exception as e:
                logger.error(f"Unexpected error: {e}")
            
            if attempt < retries - 1:
                time.sleep(2 ** attempt)  # Exponential backoff
        
        return False
    
    def run(self):
        """
        Main agent loop - continuously collect and send metrics.
        """
        logger.info(f"Starting agent loop (interval: {self.update_interval}s)")
        
        consecutive_failures = 0
        max_failures = 5
        
        while True:
            try:
                # Collect metrics
                payload = self.collect_metrics()
                
                # Log current status
                logger.info(
                    f"Status: {payload['status']} | "
                    f"CPU: {payload['cpu']}% | "
                    f"RAM: {payload['ram']}% | "
                    f"Latency: {payload['latency']}ms | "
                    f"Traffic: ↑{payload['sent']/1024:.1f}KB/s ↓{payload['received']/1024:.1f}KB/s"
                )
                
                # Send to backend
                if self.send_update(payload):
                    consecutive_failures = 0
                else:
                    consecutive_failures += 1
                    logger.warning(f"Failed to send update ({consecutive_failures}/{max_failures})")
                
                # Check if too many failures
                if consecutive_failures >= max_failures:
                    logger.error("Too many consecutive failures. Check backend connectivity.")
                    consecutive_failures = 0  # Reset to continue trying
                
                # Wait for next update
                time.sleep(self.update_interval)
                
            except KeyboardInterrupt:
                logger.info("Agent stopped by user")
                break
            except Exception as e:
                logger.error(f"Unexpected error in main loop: {e}", exc_info=True)
                time.sleep(self.update_interval)


def load_config(config_path: str) -> Dict:
    """Load configuration from JSON file."""
    try:
        with open(config_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        logger.warning(f"Config file not found: {config_path}")
        return {}
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in config file: {e}")
        return {}


def main():
    """Main entry point for the agent."""
    parser = argparse.ArgumentParser(
        description='LiveNetViz 3D - Network Node Agent'
    )
    parser.add_argument(
        '--server',
        type=str,
        help='Backend server URL (e.g., http://localhost:3000)'
    )
    parser.add_argument(
        '--node-id',
        type=str,
        help='Unique node identifier (auto-generated if not provided)'
    )
    parser.add_argument(
        '--interval',
        type=int,
        default=2,
        help='Update interval in seconds (default: 2)'
    )
    parser.add_argument(
        '--config',
        type=str,
        default='config.json',
        help='Path to configuration file'
    )
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Enable verbose logging'
    )
    
    args = parser.parse_args()
    
    # Set logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Load config file
    config = load_config(args.config)
    
    # Command-line args override config file
    server_url = args.server or config.get('server_url', 'http://localhost:3000')
    node_id = args.node_id or config.get('node_id')
    interval = args.interval or config.get('update_interval', 2)
    
    # Validate server URL
    if not server_url:
        logger.error("Server URL is required. Use --server or config.json")
        sys.exit(1)
    
    # Create and run agent
    agent = NetworkAgent(
        server_url=server_url,
        node_id=node_id,
        update_interval=interval
    )
    
    try:
        agent.run()
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
