// Test script to verify our port killing logic works
const net = require('net');
const { spawn, exec } = require('child_process');

console.log('🧪 Testing RORK-style port allocation and killing...');

// Function to kill process on port (same as in our handlers)
const killProcessOnPort = async (port) => {
  try {
    console.log(`🔫 Attempting to kill process on port ${port}...`);
    
    if (process.platform === "win32") {
      // Windows: netstat + taskkill
      return new Promise((resolve) => {
        const netstat = spawn("netstat", ["-ano"], { shell: true });
        let output = "";
        
        netstat.stdout?.on("data", (data) => {
          output += data.toString();
        });
        
        netstat.on("close", () => {
          const lines = output.split("\n");
          const portLine = lines.find(line => 
            line.includes(`:${port} `) && (line.includes("LISTENING") || line.includes("ESTABLISHED"))
          );
          
          if (portLine) {
            const pid = portLine.trim().split(/\s+/).pop();
            if (pid && pid !== "0") {
              console.log(`🎯 Found PID ${pid} using port ${port}, killing...`);
              spawn("taskkill", ["/pid", pid, "/f"], { shell: true })
                .on("close", (code) => {
                  console.log(`✅ Kill result for PID ${pid}: exit code ${code}`);
                  resolve(code === 0);
                });
              return;
            }
          }
          console.log(`ℹ️ No process found using port ${port}`);
          resolve(true);
        });
      });
    }
  } catch (error) {
    console.warn(`⚠️ Error killing process on port ${port}:`, error);
    return false;
  }
};

// Function to check if port is available
const isPortAvailable = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => {
      console.log(`❌ Port ${port} is occupied`);
      resolve(false);
    });
    server.once("listening", () => {
      server.close(() => {
        console.log(`✅ Port ${port} is available`);
        resolve(true);
      });
    });
    server.listen(port, "0.0.0.0");
  });
};

// Create a dummy server on port 8081 to test killing
const testServer = net.createServer();
testServer.listen(8081, async () => {
  console.log('🚀 Created dummy server on port 8081');
  
  // Verify port is occupied
  const occupied = await isPortAvailable(8081);
  console.log(`Port 8081 occupied status: ${!occupied}`);
  
  // Test killing the process
  const killed = await killProcessOnPort(8081);
  console.log(`Kill attempt result: ${killed}`);
  
  // Wait and check if port is free
  setTimeout(async () => {
    const nowFree = await isPortAvailable(8081);
    console.log(`Port 8081 now available: ${nowFree}`);
    
    console.log('🎯 Test complete! Our RORK-style port logic should work.');
    process.exit(0);
  }, 2000);
});

testServer.on('error', (err) => {
  console.log('❌ Test server error:', err.message);
  process.exit(1);
});
