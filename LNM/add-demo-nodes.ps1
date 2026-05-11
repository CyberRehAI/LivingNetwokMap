# Add Demo Nodes to LiveNetViz 3D
# This script populates the system with sample network nodes

$baseUrl = "http://localhost:3000/api"

# Define demo nodes
$nodes = @(
    @{
        nodeId = "localhost"
        name = "Localhost"
        ip = "127.0.0.1"
        type = "server"
        status = "healthy"
        cpu = 10
        memory = 35
        network = 500
    },
    @{
        nodeId = "gateway"
        name = "Network Gateway"
        ip = "192.168.1.1"
        type = "router"
        status = "healthy"
        cpu = 15
        memory = 45
        network = 1200
    },
    @{
        nodeId = "server-01"
        name = "Web Server"
        ip = "192.168.1.10"
        type = "server"
        status = "healthy"
        cpu = 65
        memory = 78
        network = 5600
    },
    @{
        nodeId = "server-02"
        name = "Database Server"
        ip = "192.168.1.11"
        type = "database"
        status = "warning"
        cpu = 82
        memory = 91
        network = 3200
    },
    @{
        nodeId = "workstation-01"
        name = "Workstation 1"
        ip = "192.168.1.100"
        type = "workstation"
        status = "healthy"
        cpu = 25
        memory = 42
        network = 800
    },
    @{
        nodeId = "workstation-02"
        name = "Workstation 2"
        ip = "192.168.1.101"
        type = "workstation"
        status = "healthy"
        cpu = 18
        memory = 35
        network = 450
    },
    @{
        nodeId = "iot-device-01"
        name = "Smart Camera"
        ip = "192.168.1.150"
        type = "iot"
        status = "healthy"
        cpu = 5
        memory = 15
        network = 200
    },
    @{
        nodeId = "nas-01"
        name = "Storage NAS"
        ip = "192.168.1.20"
        type = "storage"
        status = "healthy"
        cpu = 30
        memory = 55
        network = 8000
    }
)

# Add each node
Write-Host ""
Write-Host "Adding demo nodes..." -ForegroundColor Cyan
foreach ($node in $nodes) {
    try {
        $body = $node | ConvertTo-Json
        $result = Invoke-RestMethod -Uri "$baseUrl/nodes" -Method Post -Body $body -ContentType "application/json"
        Write-Host "  + Added: $($node.name)" -ForegroundColor Green
    }
    catch {
        Write-Host "  - Failed to add: $($node.name)" -ForegroundColor Yellow
    }
}

# Add connections
Write-Host ""
Write-Host "Adding network connections..." -ForegroundColor Cyan
$connections = @(
    @{ source = "gateway"; target = "localhost"; bandwidth = 1000 },
    @{ source = "gateway"; target = "server-01"; bandwidth = 1000 },
    @{ source = "gateway"; target = "server-02"; bandwidth = 1000 },
    @{ source = "gateway"; target = "workstation-01"; bandwidth = 100 },
    @{ source = "gateway"; target = "workstation-02"; bandwidth = 100 },
    @{ source = "gateway"; target = "iot-device-01"; bandwidth = 100 },
    @{ source = "gateway"; target = "nas-01"; bandwidth = 1000 },
    @{ source = "server-01"; target = "server-02"; bandwidth = 1000 },
    @{ source = "server-01"; target = "nas-01"; bandwidth = 1000 }
)

foreach ($conn in $connections) {
    try {
        $body = $conn | ConvertTo-Json
        $result = Invoke-RestMethod -Uri "$baseUrl/topology/connection" -Method Post -Body $body -ContentType "application/json"
        Write-Host "  + Connected: $($conn.source) -> $($conn.target)" -ForegroundColor Green
    }
    catch {
        Write-Host "  - Failed connection: $($conn.source) -> $($conn.target)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Demo nodes added successfully!" -ForegroundColor Green
Write-Host "Open http://localhost:5173 to view the 3D network visualization" -ForegroundColor Cyan
Write-Host ""
