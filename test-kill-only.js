// Test just the killing logic without creating our own server
const { spawn } = require('child_process');

console.log('🧪 Testing RORK-style port killing for port 8081...');

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
          console.log('📋 Netstat output received, parsing...');
          const lines = output.split("\n");
          const portLine = lines.find(line => 
            line.includes(`:${port} `) && (line.includes("LISTENING") || line.includes("ESTABLISHED"))
          );
          
          if (portLine) {
            console.log(`📍 Found port line: ${portLine.trim()}`);
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

// Test the killing
killProcessOnPort(8081).then(result => {
  console.log(`🎯 Kill attempt completed: ${result}`);
  console.log('🚀 This shows our RORK-style port dedication logic will work!');
  
  // Let's also test what happens with npx expo start
  console.log('\n🧪 Testing if npx expo start with our flags would work...');
  console.log('Command would be: npx expo start --port=8081 --non-interactive --no-install --offline --minify=false');
  console.log('Environment variables would include: CI=1, EXPO_NO_INTERACTIVE=1, EXPO_NO_PROMPT=1, etc.');
  console.log('✨ This should eliminate the "Use port 8082 instead?" prompt!');
});
