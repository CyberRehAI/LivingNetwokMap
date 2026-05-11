# LiveNetViz 3D - Node Agent

## Overview

The Node Agent is a lightweight, cross-platform monitoring agent that collects system metrics and reports them to the LiveNetViz 3D backend.

## Features

- **System Monitoring**: CPU, RAM, Disk usage
- **Network Traffic**: Real-time bandwidth monitoring
- **Latency Measurement**: Ping-like latency to backend
- **Auto-discovery**: Automatic IP and hostname detection
- **Resilient**: Retry logic with exponential backoff
- **Cross-platform**: Works on Windows, Linux, macOS

## Installation

```bash
pip install -r requirements.txt
```

## Usage

### Basic Usage
```bash
python agent.py --server http://192.168.1.100:3000
```

### With Custom Node ID
```bash
python agent.py --server http://192.168.1.100:3000 --node-id server-01
```

### With Custom Interval
```bash
python agent.py --server http://192.168.1.100:3000 --interval 5
```

### Using Configuration File
```bash
python agent.py --config config.json
```

## Configuration

Edit `config.json`:

```json
{
  "server_url": "http://localhost:3000",
  "update_interval": 2,
  "node_id": "my-custom-id",
  "retry_attempts": 3,
  "log_level": "INFO"
}
```

## Metrics Collected

| Metric | Description |
|--------|-------------|
| CPU | Percentage usage |
| RAM | Percentage usage |
| Disk | Percentage usage |
| Latency | Round-trip time to server (ms) |
| Sent | Network bytes sent per second |
| Received | Network bytes received per second |
| Status | healthy, warning, or down |

## Status Determination

- **Healthy (Green)**: All metrics normal, latency < 200ms
- **Warning (Yellow)**: CPU > 80% OR RAM > 85% OR latency > 200ms
- **Down (Red)**: Cannot reach backend server

## Logging

Logs are written to both console and `agent.log` file.

Enable verbose logging:
```bash
python agent.py --server http://localhost:3000 --verbose
```

## Deployment

### Linux/macOS (systemd service)
```bash
sudo cp agent.service /etc/systemd/system/
sudo systemctl enable agent
sudo systemctl start agent
```

### Windows (Task Scheduler)
Create a scheduled task to run the agent on startup.

### Docker
```bash
docker build -t livenetviz-agent .
docker run -d --name agent livenetviz-agent
```

## Troubleshooting

### Cannot connect to backend
- Verify backend is running
- Check firewall rules
- Verify server URL is correct

### High CPU usage
- Increase update interval: `--interval 5`
- Check for other resource-intensive processes

## License

MIT License
