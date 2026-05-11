

#include <napi.h>
#include <string>
#include <vector>
#include <thread>
#include <mutex>
#include <chrono>
#include <sstream>
#include <cstring>

#ifdef _WIN32
    #include <winsock2.h>
    #include <ws2tcpip.h>
    #include <iphlpapi.h>
    #include <icmpapi.h>
    #pragma comment(lib, "ws2_32.lib")
    #pragma comment(lib, "iphlpapi.lib")
#else
    #include <sys/socket.h>
    #include <netinet/in.h>
    #include <arpa/inet.h>
    #include <netdb.h>
    #include <unistd.h>
    #include <sys/types.h>
    #include <sys/ioctl.h>
    #include <net/if.h>
    #include <netinet/ip_icmp.h>
#endif

struct HostInfo {
    std::string ip;
    std::string hostname;
    std::string mac;
    int latency;
    bool active;
};

class NetworkScanner {
private:
    std::vector<HostInfo> results;
    std::mutex resultsMutex;
    int timeout;

    unsigned short calculateChecksum(unsigned short *buf, int len) {
        unsigned long sum = 0;
        while (len > 1) {
            sum += *buf++;
            len -= 2;
        }
        if (len == 1) {
            sum += *(unsigned char*)buf;
        }
        sum = (sum >> 16) + (sum & 0xFFFF);
        sum += (sum >> 16);
        return (unsigned short)(~sum);
    }

    // Ping a single host
    bool pingHost(const std::string& ip, int& latency) {
        #ifdef _WIN32
            HANDLE hIcmpFile = IcmpCreateFile();
            if (hIcmpFile == INVALID_HANDLE_VALUE) {
                return false;
            }

            unsigned long ipaddr = inet_addr(ip.c_str());
            char sendData[32] = "LiveNetViz3D";
            char replyBuffer[sizeof(ICMP_ECHO_REPLY) + 32];
            
            auto start = std::chrono::high_resolution_clock::now();
            
            DWORD dwRetVal = IcmpSendEcho(hIcmpFile, ipaddr, sendData, sizeof(sendData),
                                         NULL, replyBuffer, sizeof(replyBuffer), timeout);
            
            auto end = std::chrono::high_resolution_clock::now();
            
            IcmpCloseHandle(hIcmpFile);

            if (dwRetVal != 0) {
                PICMP_ECHO_REPLY pEchoReply = (PICMP_ECHO_REPLY)replyBuffer;
                latency = std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count();
                return pEchoReply->Status == 0;
            }
            return false;
        #else
            // Linux/Unix ICMP ping
            int sock = socket(AF_INET, SOCK_RAW, IPPROTO_ICMP);
            if (sock < 0) {
                // Fallback to TCP connect if no raw socket permission
                return tcpProbe(ip, 80, latency);
            }

            struct sockaddr_in addr;
            memset(&addr, 0, sizeof(addr));
            addr.sin_family = AF_INET;
            addr.sin_addr.s_addr = inet_addr(ip.c_str());

            // Build ICMP packet
            char packet[64];
            memset(packet, 0, sizeof(packet));
            
            struct icmp* icmp_hdr = (struct icmp*)packet;
            icmp_hdr->icmp_type = ICMP_ECHO;
            icmp_hdr->icmp_code = 0;
            icmp_hdr->icmp_id = getpid();
            icmp_hdr->icmp_seq = 1;
            icmp_hdr->icmp_cksum = calculateChecksum((unsigned short*)packet, sizeof(packet));

            auto start = std::chrono::high_resolution_clock::now();
            
            int sent = sendto(sock, packet, sizeof(packet), 0, 
                            (struct sockaddr*)&addr, sizeof(addr));
            
            if (sent > 0) {
                // Set timeout
                struct timeval tv;
                tv.tv_sec = 0;
                tv.tv_usec = timeout * 1000;
                setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));

                char recvbuf[256];
                int received = recv(sock, recvbuf, sizeof(recvbuf), 0);
                
                auto end = std::chrono::high_resolution_clock::now();
                
                close(sock);
                
                if (received > 0) {
                    latency = std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count();
                    return true;
                }
            }
            
            close(sock);
            return false;
        #endif
    }

    // TCP connection probe (fallback)
    bool tcpProbe(const std::string& ip, int port, int& latency) {
        int sock = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
        if (sock < 0) return false;

        // Set non-blocking
        #ifdef _WIN32
            u_long mode = 1;
            ioctlsocket(sock, FIONBIO, &mode);
        #else
            int flags = fcntl(sock, F_GETFL, 0);
            fcntl(sock, F_SETFL, flags | O_NONBLOCK);
        #endif

        struct sockaddr_in addr;
        memset(&addr, 0, sizeof(addr));
        addr.sin_family = AF_INET;
        addr.sin_port = htons(port);
        addr.sin_addr.s_addr = inet_addr(ip.c_str());

        auto start = std::chrono::high_resolution_clock::now();
        
        connect(sock, (struct sockaddr*)&addr, sizeof(addr));

        fd_set fdset;
        FD_ZERO(&fdset);
        FD_SET(sock, &fdset);

        struct timeval tv;
        tv.tv_sec = 0;
        tv.tv_usec = timeout * 1000;

        int result = select(sock + 1, NULL, &fdset, NULL, &tv);
        
        auto end = std::chrono::high_resolution_clock::now();
        
        #ifdef _WIN32
            closesocket(sock);
        #else
            close(sock);
        #endif

        if (result > 0) {
            latency = std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count();
            return true;
        }
        return false;
    }

    // Resolve hostname
    std::string resolveHostname(const std::string& ip) {
        struct sockaddr_in sa;
        char host[NI_MAXHOST];
        
        memset(&sa, 0, sizeof(sa));
        sa.sin_family = AF_INET;
        sa.sin_addr.s_addr = inet_addr(ip.c_str());
        
        int result = getnameinfo((struct sockaddr*)&sa, sizeof(sa),
                                host, sizeof(host), NULL, 0, 0);
        
        return (result == 0) ? std::string(host) : ip;
    }

    // Scan a single IP
    void scanHost(const std::string& ip) {
        int latency = 0;
        bool active = pingHost(ip, latency);

        if (active) {
            HostInfo info;
            info.ip = ip;
            info.hostname = resolveHostname(ip);
            info.mac = "unknown"; // MAC resolution requires more platform-specific code
            info.latency = latency;
            info.active = true;

            std::lock_guard<std::mutex> lock(resultsMutex);
            results.push_back(info);
        }
    }

public:
    NetworkScanner(int timeoutMs = 1000) : timeout(timeoutMs) {
        #ifdef _WIN32
            WSADATA wsaData;
            WSAStartup(MAKEWORD(2, 2), &wsaData);
        #endif
    }

    ~NetworkScanner() {
        #ifdef _WIN32
            WSACleanup();
        #endif
    }

    // Scan entire subnet
    std::vector<HostInfo> scanSubnet(const std::string& subnet) {
        results.clear();

        // Parse subnet (simple /24 implementation)
        size_t slashPos = subnet.find('/');
        std::string baseIp = subnet.substr(0, slashPos);
        
        // Extract base octets
        std::string baseOctets = baseIp.substr(0, baseIp.rfind('.'));

        std::vector<std::thread> threads;
        const int MAX_THREADS = 50;
        int threadCount = 0;

        // Scan all IPs in /24 subnet
        for (int i = 1; i < 255; i++) {
            std::string ip = baseOctets + "." + std::to_string(i);
            
            threads.push_back(std::thread(&NetworkScanner::scanHost, this, ip));
            threadCount++;

            // Limit concurrent threads
            if (threadCount >= MAX_THREADS) {
                for (auto& t : threads) {
                    if (t.joinable()) t.join();
                }
                threads.clear();
                threadCount = 0;
            }
        }

        // Wait for remaining threads
        for (auto& t : threads) {
            if (t.joinable()) t.join();
        }

        return results;
    }
};

// N-API wrapper function
Napi::Value ScanSubnet(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    // Validate arguments
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected for subnet").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string subnet = info[0].As<Napi::String>();
    int timeout = 1000;

    if (info.Length() >= 2 && info[1].IsNumber()) {
        timeout = info[1].As<Napi::Number>().Int32Value();
    }

    // Create scanner and scan
    auto start = std::chrono::high_resolution_clock::now();
    
    NetworkScanner scanner(timeout);
    std::vector<HostInfo> hosts = scanner.scanSubnet(subnet);
    
    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count();

    // Build result object
    Napi::Object result = Napi::Object::New(env);
    Napi::Array activeHosts = Napi::Array::New(env, hosts.size());

    for (size_t i = 0; i < hosts.size(); i++) {
        Napi::Object host = Napi::Object::New(env);
        host.Set("ip", Napi::String::New(env, hosts[i].ip));
        host.Set("hostname", Napi::String::New(env, hosts[i].hostname));
        host.Set("mac", Napi::String::New(env, hosts[i].mac));
        host.Set("latency", Napi::Number::New(env, hosts[i].latency));
        activeHosts[i] = host;
    }

    result.Set("activeHosts", activeHosts);
    result.Set("totalScanned", Napi::Number::New(env, 254));
    result.Set("duration", Napi::Number::New(env, duration));

    return result;
}

// Get scanner capabilities
Napi::Value GetCapabilities(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    Napi::Object caps = Napi::Object::New(env);

    caps.Set("maxConcurrent", Napi::Number::New(env, 50));
    
    Napi::Array protocols = Napi::Array::New(env, 2);
    protocols[(uint32_t)0] = Napi::String::New(env, "icmp");
    protocols[(uint32_t)1] = Napi::String::New(env, "tcp");
    caps.Set("protocols", protocols);

    caps.Set("platform", Napi::String::New(env, 
        #ifdef _WIN32
            "windows"
        #elif __linux__
            "linux"
        #elif __APPLE__
            "macos"
        #else
            "unknown"
        #endif
    ));

    return caps;
}

// Initialize addon
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("scanSubnet", Napi::Function::New(env, ScanSubnet));
    exports.Set("getCapabilities", Napi::Function::New(env, GetCapabilities));
    return exports;
}

NODE_API_MODULE(scanner, Init)
