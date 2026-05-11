#!/usr/bin/env python3
"""
Fake Agent - Simulates multiple network agents for testing
Generates realistic metrics for stress testing LiveNetViz 3D
"""

import requests
import time
import random
import argparse
import threading
from datetime import datetime


class FakeAgent:
    """Simulates a single network node agent"""
    
    def __init__(self, node_id, server_url, ip_base="192.168.1"):
        self.node_id = node_id
        self.server_url = server_url.rstrip('/')
        self.ip = f"{ip_base}.{random.randint(10, 250)}"
        self.hostname = f"test-node-{node_id:03d}"
        
        # Simulate varying metrics
        self.base_cpu = random.uniform(10, 50)
        self.base_ram = random.uniform(20, 60)
        self.base_disk = random.uniform(30, 70)
        self.base_latency = random.uniform(1, 20)
        
        # Simulate occasional failures
        self.failure_probability = 0.05  # 5% chance of going down
        self.is_down = False
        self.down_duration = 0
        
    def generate_metrics(self):
        """Generate realistic metrics with variation"""
        
        # Randomly fail
        if random.random() < self.failure_probability and not self.is_down:
            self.is_down = True
            self.down_duration = random.randint(5, 20)  # Down for 5-20 updates
            print(f"[{self.node_id}] Going DOWN for {self.down_duration} updates")
        
        # Recover from failure
        if self.is_down:
            self.down_duration -= 1
            if self.down_duration <= 0:
                self.is_down = False
                print(f"[{self.node_id}] RECOVERED")
            return None  # Don't send updates while down
        
        # Add random variation
        cpu = max(0, min(100, self.base_cpu + random.uniform(-10, 10)))
        ram = max(0, min(100, self.base_ram + random.uniform(-10, 10)))
        disk = max(0, min(100, self.base_disk + random.uniform(-5, 5)))
        latency = max(1, self.base_latency + random.uniform(-5, 5))
        
        # Generate traffic (fluctuating)
        sent = random.randint(1000, 50000)
        received = random.randint(1000, 50000)
        
        # Determine status
        if cpu > 80 or ram > 85 or latency > 200:
            status = "warning"
        else:
            status = "healthy"
        
        return {
            "nodeId": self.node_id,
            "hostname": self.hostname,
            "ip": self.ip,
            "os": random.choice(["Linux Ubuntu 22.04", "Windows Server 2022", "macOS 13"]),
            "cpu": round(cpu, 2),
            "ram": round(ram, 2),
            "disk": round(disk, 2),
            "latency": round(latency, 2),
            "status": status,
            "sent": sent,
            "received": received,
            "timestamp": datetime.now().isoformat(),
            "uptime": random.randint(3600, 86400 * 30)
        }
    
    def send_update(self):
        """Send metrics to backend"""
        metrics = self.generate_metrics()
        
        if metrics is None:
            return False  # Node is down
        
        try:
            response = requests.post(
                f"{self.server_url}/api/update",
                json=metrics,
                timeout=5
            )
            return response.status_code == 200
        except Exception as e:
            print(f"[{self.node_id}] Error sending update: {e}")
            return False


class FakeAgentSimulator:
    """Manages multiple fake agents"""
    
    def __init__(self, count, server_url, interval=2):
        self.agents = []
        self.server_url = server_url
        self.interval = interval
        self.running = False
        
        # Create agents
        for i in range(count):
            agent = FakeAgent(f"fake-{i:03d}", server_url)
            self.agents.append(agent)
        
        print(f"Created {count} fake agents")
    
    def run_agent(self, agent):
        """Run a single agent in a thread"""
        while self.running:
            agent.send_update()
            time.sleep(self.interval + random.uniform(-0.5, 0.5))
    
    def start(self):
        """Start all agents"""
        self.running = True
        
        threads = []
        for agent in self.agents:
            thread = threading.Thread(target=self.run_agent, args=(agent,))
            thread.daemon = True
            thread.start()
            threads.append(thread)
        
        print(f"Started {len(self.agents)} agents (interval: {self.interval}s)")
        print("Press Ctrl+C to stop...")
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nStopping agents...")
            self.running = False
            time.sleep(2)
            print("Stopped")


def main():
    parser = argparse.ArgumentParser(
        description='Fake Agent Simulator for LiveNetViz 3D'
    )
    parser.add_argument(
        '--count',
        type=int,
        default=50,
        help='Number of fake agents to create (default: 50)'
    )
    parser.add_argument(
        '--server',
        type=str,
        default='http://localhost:3000',
        help='Backend server URL (default: http://localhost:3000)'
    )
    parser.add_argument(
        '--interval',
        type=int,
        default=2,
        help='Update interval in seconds (default: 2)'
    )
    
    args = parser.parse_args()
    
    print("="*60)
    print("  LiveNetViz 3D - Fake Agent Simulator")
    print("="*60)
    print(f"  Server:   {args.server}")
    print(f"  Agents:   {args.count}")
    print(f"  Interval: {args.interval}s")
    print("="*60)
    print()
    
    simulator = FakeAgentSimulator(
        count=args.count,
        server_url=args.server,
        interval=args.interval
    )
    
    simulator.start()


if __name__ == '__main__':
    main()
