/**
 * Stress Test for LiveNetViz 3D Backend
 * Tests performance with high node count and connection load
 */

const http = require('http');

class StressTest {
    constructor(baseUrl = 'http://localhost:3000') {
        this.baseUrl = baseUrl;
        this.results = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            avgResponseTime: 0,
            minResponseTime: Infinity,
            maxResponseTime: 0,
            responseTimes: []
        };
    }

    async makeRequest(path, method = 'GET', data = null) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.baseUrl);
            const startTime = Date.now();

            const options = {
                hostname: url.hostname,
                port: url.port,
                path: url.pathname,
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            const req = http.request(options, (res) => {
                let body = '';

                res.on('data', (chunk) => {
                    body += chunk;
                });

                res.on('end', () => {
                    const responseTime = Date.now() - startTime;
                    resolve({ statusCode: res.statusCode, body, responseTime });
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            if (data) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    async testNodeCreation(count) {
        console.log(`\nTest 1: Creating ${count} nodes...`);
        const startTime = Date.now();

        for (let i = 0; i < count; i++) {
            const nodeData = {
                nodeId: `stress-test-${i}`,
                hostname: `node-${i}`,
                ip: `192.168.${Math.floor(i / 254)}.${i % 254 + 1}`,
                cpu: Math.random() * 100,
                ram: Math.random() * 100,
                disk: Math.random() * 100,
                latency: Math.random() * 50,
                status: 'healthy',
                sent: Math.floor(Math.random() * 10000),
                received: Math.floor(Math.random() * 10000)
            };

            try {
                const result = await this.makeRequest('/api/update', 'POST', nodeData);
                this.results.totalRequests++;
                this.results.responseTimes.push(result.responseTime);

                if (result.statusCode === 200) {
                    this.results.successfulRequests++;
                } else {
                    this.results.failedRequests++;
                }

                this.results.minResponseTime = Math.min(this.results.minResponseTime, result.responseTime);
                this.results.maxResponseTime = Math.max(this.results.maxResponseTime, result.responseTime);

                if ((i + 1) % 50 === 0) {
                    process.stdout.write(`\rCreated ${i + 1}/${count} nodes...`);
                }
            } catch (error) {
                this.results.failedRequests++;
                console.error(`\nError creating node ${i}:`, error.message);
            }
        }

        const duration = Date.now() - startTime;
        console.log(`\n✓ Created ${count} nodes in ${duration}ms`);
        console.log(`  Average: ${(duration / count).toFixed(2)}ms per node`);
    }

    async testConcurrentUpdates(count, concurrent = 50) {
        console.log(`\nTest 2: ${count} concurrent updates (${concurrent} at a time)...`);
        const startTime = Date.now();

        const makeUpdate = async (i) => {
            const nodeData = {
                nodeId: `stress-test-${i % 200}`,
                hostname: `node-${i % 200}`,
                ip: `192.168.1.${(i % 200) + 1}`,
                cpu: Math.random() * 100,
                ram: Math.random() * 100,
                disk: Math.random() * 100,
                latency: Math.random() * 50,
                status: Math.random() > 0.8 ? 'warning' : 'healthy',
                sent: Math.floor(Math.random() * 10000),
                received: Math.floor(Math.random() * 10000)
            };

            try {
                const result = await this.makeRequest('/api/update', 'POST', nodeData);
                this.results.totalRequests++;
                this.results.responseTimes.push(result.responseTime);

                if (result.statusCode === 200) {
                    this.results.successfulRequests++;
                } else {
                    this.results.failedRequests++;
                }
            } catch (error) {
                this.results.failedRequests++;
            }
        };

        // Run in batches
        for (let i = 0; i < count; i += concurrent) {
            const batch = [];
            for (let j = 0; j < concurrent && i + j < count; j++) {
                batch.push(makeUpdate(i + j));
            }
            await Promise.all(batch);
            process.stdout.write(`\rProcessed ${Math.min(i + concurrent, count)}/${count} updates...`);
        }

        const duration = Date.now() - startTime;
        console.log(`\n✓ Completed ${count} updates in ${duration}ms`);
        console.log(`  Throughput: ${(count / (duration / 1000)).toFixed(2)} req/s`);
    }

    async testNodeRetrieval() {
        console.log(`\nTest 3: Retrieving all nodes...`);
        const startTime = Date.now();

        try {
            const result = await this.makeRequest('/api/nodes', 'GET');
            const duration = Date.now() - startTime;

            const data = JSON.parse(result.body);
            console.log(`✓ Retrieved ${data.count} nodes in ${duration}ms`);
        } catch (error) {
            console.error('Error retrieving nodes:', error.message);
        }
    }

    async testStats() {
        console.log(`\nTest 4: Getting statistics...`);
        const startTime = Date.now();

        try {
            const result = await this.makeRequest('/api/nodes/stats', 'GET');
            const duration = Date.now() - startTime;

            const data = JSON.parse(result.body);
            console.log(`✓ Retrieved stats in ${duration}ms`);
            console.log(`  Stats:`, data.stats);
        } catch (error) {
            console.error('Error retrieving stats:', error.message);
        }
    }

    printResults() {
        console.log('\n' + '='.repeat(60));
        console.log('  STRESS TEST RESULTS');
        console.log('='.repeat(60));
        console.log(`  Total Requests:      ${this.results.totalRequests}`);
        console.log(`  Successful:          ${this.results.successfulRequests}`);
        console.log(`  Failed:              ${this.results.failedRequests}`);
        console.log(`  Success Rate:        ${((this.results.successfulRequests / this.results.totalRequests) * 100).toFixed(2)}%`);
        console.log('');
        
        if (this.results.responseTimes.length > 0) {
            const avg = this.results.responseTimes.reduce((a, b) => a + b, 0) / this.results.responseTimes.length;
            const sorted = this.results.responseTimes.sort((a, b) => a - b);
            const p50 = sorted[Math.floor(sorted.length * 0.5)];
            const p95 = sorted[Math.floor(sorted.length * 0.95)];
            const p99 = sorted[Math.floor(sorted.length * 0.99)];

            console.log(`  Response Times:`);
            console.log(`    Min:    ${this.results.minResponseTime}ms`);
            console.log(`    Avg:    ${avg.toFixed(2)}ms`);
            console.log(`    P50:    ${p50}ms`);
            console.log(`    P95:    ${p95}ms`);
            console.log(`    P99:    ${p99}ms`);
            console.log(`    Max:    ${this.results.maxResponseTime}ms`);
        }
        console.log('='.repeat(60));
    }
}

async function main() {
    const args = process.argv.slice(2);
    const serverUrl = args[0] || 'http://localhost:3000';

    console.log('='.repeat(60));
    console.log('  LiveNetViz 3D - Backend Stress Test');
    console.log('='.repeat(60));
    console.log(`  Server: ${serverUrl}`);
    console.log('='.repeat(60));

    const tester = new StressTest(serverUrl);

    try {
        // Test 1: Create 200 nodes
        await tester.testNodeCreation(200);

        // Test 2: 1000 concurrent updates
        await tester.testConcurrentUpdates(1000, 50);

        // Test 3: Retrieve all nodes
        await tester.testNodeRetrieval();

        // Test 4: Get statistics
        await tester.testStats();

        // Print final results
        tester.printResults();

    } catch (error) {
        console.error('\nTest failed:', error);
    }
}

if (require.main === module) {
    main();
}

module.exports = StressTest;
