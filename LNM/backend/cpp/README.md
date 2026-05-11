# C++ Network Scanner Module

This module provides high-performance network scanning capabilities using native C++ code.

## Features

- **Multi-threaded scanning** - Scan up to 50 hosts concurrently
- **ICMP ping** - Primary detection method
- **TCP fallback** - For environments without ICMP permissions
- **Hostname resolution** - Automatic DNS lookup
- **Cross-platform** - Windows, Linux, macOS

## Building

### Prerequisites

**Windows:**
- Visual Studio 2019 or later with C++ tools
- Python 3.x
- Node.js 16+

**Linux:**
```bash
sudo apt-get install build-essential python3
```

**macOS:**
```bash
xcode-select --install
```

### Compile

```bash
cd backend
npm install
npm run build-cpp
```

This will compile the C++ addon using node-gyp.

## Usage

```javascript
const scanner = require('./build/Release/scanner');

// Scan subnet
const results = await scanner.scanSubnet('192.168.1.0/24', 1000);

console.log(results.activeHosts);
// [
//   { ip: '192.168.1.1', hostname: 'router.local', latency: 2 },
//   { ip: '192.168.1.100', hostname: 'server', latency: 5 }
// ]

// Get capabilities
const caps = scanner.getCapabilities();
console.log(caps);
// { maxConcurrent: 50, protocols: ['icmp', 'tcp'], platform: 'windows' }
```

## API

### `scanSubnet(subnet, timeout)`

- **subnet** (string): Subnet in CIDR notation (e.g., "192.168.1.0/24")
- **timeout** (number): Ping timeout in milliseconds (default: 1000)
- **Returns**: Object with `activeHosts`, `totalScanned`, `duration`

### `getCapabilities()`

- **Returns**: Object with scanner capabilities

## Notes

### Permissions

**Linux:** ICMP requires root or CAP_NET_RAW capability. Run with:
```bash
sudo node server.js
# OR
sudo setcap cap_net_raw+ep $(which node)
```

**Windows:** Administrator privileges required for ICMP.

**Fallback:** If ICMP fails, scanner automatically falls back to TCP probes.

## Performance

- /24 subnet (254 hosts): ~5-10 seconds
- Concurrent threads: 50
- Timeout per host: Configurable (default 1s)

## Troubleshooting

### Build fails on Windows
- Install Visual Studio C++ Build Tools
- Run in "x64 Native Tools Command Prompt"

### Build fails on Linux
```bash
sudo apt-get install build-essential python3-dev
```

### "Permission denied" on Linux
```bash
sudo setcap cap_net_raw+ep /usr/bin/node
```
