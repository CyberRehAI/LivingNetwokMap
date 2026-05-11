#!/usr/bin/env python3
"""
LiveNetViz 3D - Universal Launcher
Starts all components of the LiveNetViz 3D system in one command.

This script works cross-platform (Windows, Linux, macOS) and handles:
- Backend server (Node.js)
- Frontend development server (Vite)
- Test agent (optional)

Usage:
    python start.py              # Start all components
    python start.py --no-agent   # Start without test agent
    python start.py --help       # Show help
"""

import os
import sys
import time
import subprocess
import platform
import signal
import argparse
from pathlib import Path


class Colors:
    """ANSI color codes for terminal output"""
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'


class LiveNetVizLauncher:
    """Main launcher class for LiveNetViz 3D"""
    
    def __init__(self, start_agent=True):
        self.processes = []
        self.start_agent = start_agent
        self.root_dir = Path(__file__).parent.absolute()
        self.is_windows = platform.system() == 'Windows'
        
    def print_banner(self):
        """Print startup banner"""
        print(f"{Colors.OKCYAN}")
        print("=" * 60)
        print("  LiveNetViz 3D - Universal Launcher")
        print("=" * 60)
        print(f"{Colors.ENDC}")
        print(f"  Platform: {Colors.OKGREEN}{platform.system()}{Colors.ENDC}")
        print(f"  Root Dir: {Colors.OKBLUE}{self.root_dir}{Colors.ENDC}")
        print("=" * 60)
        print()
    
    def check_prerequisites(self):
        """Check if Node.js and npm are installed"""
        print(f"{Colors.WARNING}Checking prerequisites...{Colors.ENDC}")
        
        # Check Node.js
        try:
            result = subprocess.run(['node', '--version'], 
                                  capture_output=True, text=True, check=True, shell=True)
            node_version = result.stdout.strip()
            print(f"  ✓ Node.js {Colors.OKGREEN}{node_version}{Colors.ENDC}")
        except (subprocess.CalledProcessError, FileNotFoundError):
            print(f"  {Colors.FAIL}✗ Node.js not found!{Colors.ENDC}")
            print(f"    Please install Node.js from https://nodejs.org")
            return False
        
        # Check npm (use .cmd on Windows)
        npm_cmd = 'npm.cmd' if self.is_windows else 'npm'
        try:
            result = subprocess.run([npm_cmd, '--version'], 
                                  capture_output=True, text=True, check=True, shell=True)
            npm_version = result.stdout.strip()
            print(f"  ✓ npm {Colors.OKGREEN}{npm_version}{Colors.ENDC}")
        except (subprocess.CalledProcessError, FileNotFoundError):
            print(f"  {Colors.FAIL}✗ npm not found!{Colors.ENDC}")
            return False
        
        print()
        return True
    
    def check_installations(self):
        """Check if backend and frontend dependencies are installed"""
        print(f"{Colors.WARNING}Checking installations...{Colors.ENDC}")
        
        backend_installed = (self.root_dir / 'backend' / 'node_modules').exists()
        frontend_installed = (self.root_dir / 'frontend' / 'node_modules').exists()
        
        if not backend_installed:
            print(f"  {Colors.WARNING}⚠ Backend dependencies not installed{Colors.ENDC}")
            print(f"    Installing backend dependencies...")
            self.install_backend()
        else:
            print(f"  ✓ Backend dependencies {Colors.OKGREEN}installed{Colors.ENDC}")
        
        if not frontend_installed:
            print(f"  {Colors.WARNING}⚠ Frontend dependencies not installed{Colors.ENDC}")
            print(f"    Installing frontend dependencies...")
            self.install_frontend()
        else:
            print(f"  ✓ Frontend dependencies {Colors.OKGREEN}installed{Colors.ENDC}")
        
        print()
    
    def install_backend(self):
        """Install backend dependencies"""
        backend_dir = self.root_dir / 'backend'
        npm_cmd = 'npm.cmd' if self.is_windows else 'npm'
        try:
            subprocess.run([npm_cmd, 'install'], cwd=backend_dir, check=True, shell=True)
            print(f"  {Colors.OKGREEN}✓ Backend dependencies installed{Colors.ENDC}")
        except subprocess.CalledProcessError:
            print(f"  {Colors.FAIL}✗ Failed to install backend dependencies{Colors.ENDC}")
            sys.exit(1)
    
    def install_frontend(self):
        """Install frontend dependencies"""
        frontend_dir = self.root_dir / 'frontend'
        npm_cmd = 'npm.cmd' if self.is_windows else 'npm'
        try:
            subprocess.run([npm_cmd, 'install'], cwd=frontend_dir, check=True, shell=True)
            print(f"  {Colors.OKGREEN}✓ Frontend dependencies installed{Colors.ENDC}")
        except subprocess.CalledProcessError:
            print(f"  {Colors.FAIL}✗ Failed to install frontend dependencies{Colors.ENDC}")
            sys.exit(1)
    
    def start_backend(self):
        """Start the backend server"""
        print(f"{Colors.OKCYAN}[1/3] Starting Backend Server...{Colors.ENDC}")
        backend_dir = self.root_dir / 'backend'
        npm_cmd = 'npm.cmd' if self.is_windows else 'npm'
        
        if self.is_windows:
            # Windows: Use CREATE_NEW_CONSOLE to open in new window
            process = subprocess.Popen(
                [npm_cmd, 'start'],
                cwd=backend_dir,
                creationflags=subprocess.CREATE_NEW_CONSOLE,
                shell=True
            )
        else:
            # Linux/macOS: Use nohup or screen
            # For simplicity, run in background
            process = subprocess.Popen(
                [npm_cmd, 'start'],
                cwd=backend_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
        
        self.processes.append(('Backend', process))
        print(f"  {Colors.OKGREEN}✓ Backend started (PID: {process.pid}){Colors.ENDC}")
        print(f"  {Colors.OKBLUE}→ http://localhost:3000{Colors.ENDC}")
        print()
        
        # Wait for backend to start
        time.sleep(3)
    
    def start_frontend(self):
        """Start the frontend development server"""
        print(f"{Colors.OKCYAN}[2/3] Starting Frontend Server...{Colors.ENDC}")
        frontend_dir = self.root_dir / 'frontend'
        npm_cmd = 'npm.cmd' if self.is_windows else 'npm'
        
        if self.is_windows:
            # Windows: Use CREATE_NEW_CONSOLE to open in new window
            process = subprocess.Popen(
                [npm_cmd, 'run', 'dev'],
                cwd=frontend_dir,
                creationflags=subprocess.CREATE_NEW_CONSOLE,
                shell=True
            )
        else:
            # Linux/macOS
            process = subprocess.Popen(
                [npm_cmd, 'run', 'dev'],
                cwd=frontend_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
        
        self.processes.append(('Frontend', process))
        print(f"  {Colors.OKGREEN}✓ Frontend started (PID: {process.pid}){Colors.ENDC}")
        print(f"  {Colors.OKBLUE}→ http://localhost:5173{Colors.ENDC}")
        print()
        
        # Wait for frontend to start
        time.sleep(2)
    
    def discover_nodes(self):
        """Run auto-discovery to find and add network nodes"""
        print(f"{Colors.OKCYAN}[3/4] Discovering Network Nodes...{Colors.ENDC}")
        
        # Use PowerShell script to add demo nodes
        demo_script = self.root_dir / 'add-demo-nodes.ps1'
        
        if demo_script.exists():
            try:
                # Run PowerShell script
                result = subprocess.run(
                    ['powershell', '-ExecutionPolicy', 'Bypass', '-File', str(demo_script)],
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                if result.returncode == 0:
                    print(f"  {Colors.OKGREEN}✓ Network nodes discovered and added{Colors.ENDC}")
                else:
                    print(f"  {Colors.WARNING}⚠ Auto-discovery completed with warnings{Colors.ENDC}")
            except subprocess.TimeoutExpired:
                print(f"  {Colors.WARNING}⚠ Auto-discovery timed out{Colors.ENDC}")
            except Exception as e:
                print(f"  {Colors.WARNING}⚠ Auto-discovery error: {e}{Colors.ENDC}")
        else:
            print(f"  {Colors.WARNING}⚠ Demo nodes script not found{Colors.ENDC}")
        
        print()
    
    def start_test_agent(self):
        """Start a test agent"""
        print(f"{Colors.OKCYAN}[4/4] Starting Test Agent...{Colors.ENDC}")
        agent_dir = self.root_dir / 'agent'
        agent_script = agent_dir / 'agent.py'
        
        if not agent_script.exists():
            print(f"  {Colors.WARNING}⚠ Agent script not found, skipping{Colors.ENDC}")
            return
        
        if self.is_windows:
            # Windows: Use CREATE_NEW_CONSOLE
            process = subprocess.Popen(
                [sys.executable, 'agent.py', 
                 '--server', 'http://localhost:3000',
                 '--node-id', 'local-test-agent'],
                cwd=agent_dir,
                creationflags=subprocess.CREATE_NEW_CONSOLE
            )
        else:
            # Linux/macOS
            process = subprocess.Popen(
                [sys.executable, 'agent.py',
                 '--server', 'http://localhost:3000',
                 '--node-id', 'local-test-agent'],
                cwd=agent_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
        
        self.processes.append(('Test Agent', process))
        print(f"  {Colors.OKGREEN}✓ Test agent started (PID: {process.pid}){Colors.ENDC}")
        print()
    
    def print_status(self):
        """Print the running status"""
        print(f"{Colors.OKGREEN}=" * 60)
        print("  All Components Started Successfully!")
        print("=" * 60 + f"{Colors.ENDC}")
        print()
        print(f"{Colors.BOLD}Access Points:{Colors.ENDC}")
        print(f"  • Frontend (UI):  {Colors.OKCYAN}http://localhost:5173{Colors.ENDC}")
        print(f"  • Backend (API):  {Colors.OKCYAN}http://localhost:3000{Colors.ENDC}")
        print()
        print(f"{Colors.BOLD}Running Processes:{Colors.ENDC}")
        for name, process in self.processes:
            status = f"{Colors.OKGREEN}Running{Colors.ENDC}" if process.poll() is None else f"{Colors.FAIL}Stopped{Colors.ENDC}"
            print(f"  • {name:12} (PID: {process.pid:5}) - {status}")
        print()
        print(f"{Colors.WARNING}Press Ctrl+C to stop all components{Colors.ENDC}")
        print()
    
    def wait_for_processes(self):
        """Wait for processes and handle shutdown"""
        try:
            while True:
                time.sleep(1)
                # Check if any process died
                for name, process in self.processes:
                    if process.poll() is not None:
                        print(f"\n{Colors.FAIL}⚠ {name} stopped unexpectedly!{Colors.ENDC}")
        except KeyboardInterrupt:
            print(f"\n\n{Colors.WARNING}Shutting down...{Colors.ENDC}")
            self.shutdown()
    
    def shutdown(self):
        """Gracefully shutdown all processes"""
        print()
        for name, process in self.processes:
            if process.poll() is None:
                print(f"  Stopping {name} (PID: {process.pid})...")
                try:
                    if self.is_windows:
                        # Windows: Use taskkill to kill process tree
                        subprocess.run(['taskkill', '/F', '/T', '/PID', str(process.pid)],
                                     capture_output=True)
                    else:
                        # Linux/macOS: Send SIGTERM
                        process.terminate()
                        process.wait(timeout=5)
                except Exception as e:
                    print(f"    {Colors.WARNING}Warning: {e}{Colors.ENDC}")
        
        print(f"\n{Colors.OKGREEN}All components stopped successfully!{Colors.ENDC}")
        print(f"Thank you for using LiveNetViz 3D! 👋\n")
    
    def run(self):
        """Main run method"""
        self.print_banner()
        
        if not self.check_prerequisites():
            sys.exit(1)
        
        self.check_installations()
        
        try:
            self.start_backend()
            self.start_frontend()
            self.discover_nodes()
            
            if self.start_agent:
                self.start_test_agent()
            
            self.print_status()
            self.wait_for_processes()
            
        except Exception as e:
            print(f"\n{Colors.FAIL}Error: {e}{Colors.ENDC}")
            self.shutdown()
            sys.exit(1)


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='LiveNetViz 3D Universal Launcher',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python start.py              # Start all components
  python start.py --no-agent   # Start without test agent
        """
    )
    
    parser.add_argument(
        '--no-agent',
        action='store_true',
        help='Do not start the test agent'
    )
    
    args = parser.parse_args()
    
    launcher = LiveNetVizLauncher(start_agent=not args.no_agent)
    launcher.run()


if __name__ == '__main__':
    main()
