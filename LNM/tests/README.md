# LiveNetViz 3D - Testing Suite

This directory contains testing utilities for LiveNetViz 3D.

## Test Files

### 1. fake-agent.py
Simulates multiple network agents for testing the system under load.

**Features:**
- Generates realistic metrics (CPU, RAM, latency, traffic)
- Simulates random failures and recoveries
- Multi-threaded for concurrent agents
- Configurable count and update interval

**Usage:**
```bash
# Default: 50 agents, 2s interval
python fake-agent.py

# Custom configuration
python fake-agent.py --count 100 --server http://192.168.1.100:3000 --interval 5

# Stress test with 200 agents
python fake-agent.py --count 200
```

**Arguments:**
- `--count` - Number of fake agents (default: 50)
- `--server` - Backend server URL (default: http://localhost:3000)
- `--interval` - Update interval in seconds (default: 2)

---

### 2. stress-test.js
Tests backend performance with high load.

**Tests:**
1. **Node Creation** - Creates 200 nodes sequentially
2. **Concurrent Updates** - 1000 updates with 50 concurrent requests
3. **Node Retrieval** - Fetches all nodes
4. **Statistics** - Retrieves aggregated stats

**Usage:**
```bash
node stress-test.js

# Custom server
node stress-test.js http://192.168.1.100:3000
```

**Metrics Reported:**
- Total requests
- Success/failure rate
- Response times (min, avg, p50, p95, p99, max)
- Throughput (requests/second)

---

## Testing Scenarios

### Scenario 1: Basic Functionality Test
```bash
# Terminal 1: Start backend
cd backend
npm start

# Terminal 2: Start 10 fake agents
cd tests
python fake-agent.py --count 10

# Terminal 3: Start frontend
cd frontend
npm run dev
```

### Scenario 2: Load Test
```bash
# Start 200 fake agents
python fake-agent.py --count 200 --interval 1

# Run stress test
node stress-test.js
```

### Scenario 3: Failure Recovery Test
```bash
# Start agents (some will randomly fail)
python fake-agent.py --count 50

# Watch the frontend - nodes should turn red when agents stop
# They should recover and turn green when agents resume
```

### Scenario 4: Network Scanner Test
```bash
# Start backend
cd backend
npm start

# In frontend, click "Scan Network"
# Enter subnet: 192.168.1.0/24

# Scanner will discover devices on your network
```

---

## Performance Benchmarks

### Expected Performance

| Metric | Target | Notes |
|--------|--------|-------|
| Nodes | 200+ | Real-time updates |
| Update Rate | 100/s | Backend throughput |
| Frontend FPS | 60 | Smooth 3D rendering |
| WebSocket Latency | <50ms | Real-time updates |
| Response Time (avg) | <100ms | API requests |

### Frontend Performance Test

Open browser console and run:
```javascript
// Check FPS
let lastTime = performance.now();
let frames = 0;
function checkFPS() {
    frames++;
    const now = performance.now();
    if (now >= lastTime + 1000) {
        console.log('FPS:', frames);
        frames = 0;
        lastTime = now;
    }
    requestAnimationFrame(checkFPS);
}
checkFPS();
```

---

## Troubleshooting

### Fake Agents Not Connecting
- Check backend is running: `curl http://localhost:3000/health`
- Verify firewall allows connections
- Check backend logs for errors

### High Response Times
- Reduce concurrent agents
- Check CPU/RAM usage on backend server
- Enable Redis for better performance

### Frontend Performance Issues
- Reduce number of nodes: `--count 50`
- Disable traffic animation
- Use simpler layout (Grid instead of Sphere)

---

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - uses: actions/setup-python@v2
      
      - name: Install dependencies
        run: |
          cd backend && npm install
          cd ../tests && pip install requests
      
      - name: Start backend
        run: cd backend && npm start &
        
      - name: Run stress test
        run: cd tests && node stress-test.js
```

---

## Load Testing Best Practices

1. **Start Small** - Begin with 10-20 agents
2. **Monitor Resources** - Watch CPU, RAM, network
3. **Increase Gradually** - Add agents incrementally
4. **Test Failures** - Ensure system handles agent failures
5. **Check WebSocket** - Verify real-time updates work
6. **Test Cleanup** - Ensure removed nodes are cleaned up

---

## Automated Testing

### Continuous Load Test
```bash
# Run agents continuously for 1 hour
timeout 3600 python fake-agent.py --count 100

# Run stress test every 5 minutes
watch -n 300 "node stress-test.js"
```
