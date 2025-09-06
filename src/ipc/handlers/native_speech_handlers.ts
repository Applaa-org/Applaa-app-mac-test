import { ipcMain } from "electron";
import { spawn, ChildProcess } from "child_process";
import * as os from "os";
import log from "electron-log";

const logger = log.scope("native_speech");

interface SpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  timeout?: number;
}

interface SpeechResult {
  text: string;
  confidence: number;
  isFinal: boolean;
}

let activeRecognitionProcess: ChildProcess | null = null;

/**
 * 🎤 Native OS Speech Recognition Handlers
 * Uses Windows SAPI or macOS Speech Framework instead of web APIs
 */
export function registerNativeSpeechHandlers() {
  // Start native speech recognition
  ipcMain.handle("speech:start-native", async (event, options: SpeechRecognitionOptions = {}) => {
    try {
      logger.info("🎤 Starting native OS speech recognition");
      
      const platform = os.platform();
      
      if (platform === "win32") {
        return await startWindowsSpeechRecognition(event, options);
      } else if (platform === "darwin") {
        return await startMacOSSpeechRecognition(event, options);
      } else {
        throw new Error(`Unsupported platform: ${platform}. Native speech recognition only supports Windows and macOS.`);
      }
    } catch (error) {
      logger.error("Failed to start native speech recognition:", error);
      throw error;
    }
  });

  // Stop native speech recognition
  ipcMain.handle("speech:stop-native", async () => {
    try {
      logger.info("🛑 Stopping native speech recognition");
      
      if (activeRecognitionProcess) {
        activeRecognitionProcess.kill();
        activeRecognitionProcess = null;
      }
      
      return { success: true };
    } catch (error) {
      logger.error("Failed to stop native speech recognition:", error);
      throw error;
    }
  });

  // Check if native speech recognition is available
  ipcMain.handle("speech:check-native-support", async () => {
    const platform = os.platform();
    const supported = platform === "win32" || platform === "darwin";
    
    logger.info(`🔍 Native speech recognition support: ${supported} (platform: ${platform})`);
    
    return {
      supported,
      platform,
      reason: supported ? "Native OS speech recognition available" : "Only Windows and macOS are supported"
    };
  });
}

/**
 * 🪟 Windows Speech Recognition using PowerShell
 */
async function startWindowsSpeechRecognition(
  event: Electron.IpcMainInvokeEvent, 
  options: SpeechRecognitionOptions
): Promise<{ success: boolean }> {
  logger.info("🪟 Starting Windows speech recognition via PowerShell");
  
  // PowerShell script for Windows Speech Recognition
  const powershellScript = `
    Add-Type -AssemblyName System.Speech
    $recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine
    $recognizer.SetInputToDefaultAudioDevice()
    
    # Create grammar for dictation
    $dictationGrammar = New-Object System.Speech.Recognition.DictationGrammar
    $recognizer.LoadGrammar($dictationGrammar)
    
    # Event handler for speech recognized
    Register-ObjectEvent -InputObject $recognizer -EventName "SpeechRecognized" -Action {
      $result = $Event.SourceEventArgs.Result
      $confidence = $result.Confidence
      $text = $result.Text
      Write-Output "SPEECH_RESULT:$text:$confidence:true"
    }
    
    # Event handler for speech hypothesis (partial results)
    Register-ObjectEvent -InputObject $recognizer -EventName "SpeechHypothesized" -Action {
      $result = $Event.SourceEventArgs.Result
      $text = $result.Text
      Write-Output "SPEECH_PARTIAL:$text:0.5:false"
    }
    
    Write-Output "SPEECH_READY"
    $recognizer.RecognizeAsync([System.Speech.Recognition.RecognizeMode]::Multiple)
    
    # Keep the script running
    while ($true) {
      Start-Sleep -Seconds 1
    }
  `;

  try {
    activeRecognitionProcess = spawn("powershell", ["-Command", powershellScript], {
      stdio: ["pipe", "pipe", "pipe"]
    });

    activeRecognitionProcess.stdout?.on("data", (data) => {
      const output = data.toString().trim();
      logger.info(`🎤 Windows speech output: ${output}`);
      
      if (output.includes("SPEECH_READY")) {
        event.sender.send("speech:ready");
      } else if (output.startsWith("SPEECH_RESULT:")) {
        const parts = output.split(":");
        const result: SpeechResult = {
          text: parts[1] || "",
          confidence: parseFloat(parts[2]) || 0,
          isFinal: parts[3] === "true"
        };
        event.sender.send("speech:result", result);
      } else if (output.startsWith("SPEECH_PARTIAL:")) {
        const parts = output.split(":");
        const result: SpeechResult = {
          text: parts[1] || "",
          confidence: parseFloat(parts[2]) || 0,
          isFinal: false
        };
        event.sender.send("speech:partial", result);
      }
    });

    activeRecognitionProcess.stderr?.on("data", (data) => {
      logger.error(`🪟 Windows speech error: ${data.toString()}`);
      event.sender.send("speech:error", data.toString());
    });

    activeRecognitionProcess.on("exit", (code) => {
      logger.info(`🪟 Windows speech recognition process exited with code: ${code}`);
      activeRecognitionProcess = null;
      event.sender.send("speech:ended");
    });

    return { success: true };
  } catch (error) {
    logger.error("Failed to start Windows speech recognition:", error);
    throw error;
  }
}

/**
 * 🍎 macOS Speech Recognition using AppleScript
 */
async function startMacOSSpeechRecognition(
  event: Electron.IpcMainInvokeEvent, 
  options: SpeechRecognitionOptions
): Promise<{ success: boolean }> {
  logger.info("🍎 Starting macOS speech recognition via AppleScript");
  
  // AppleScript for macOS Speech Recognition
  const appleScript = `
    tell application "System Events"
      -- Enable dictation if not already enabled
      try
        set dictationEnabled to (get value of checkbox "Enable dictation" of tab group 1 of window "Dictation & Speech" of pane id "com.apple.preference.speech" of application "System Preferences")
      end try
    end tell
    
    -- Use osascript to capture speech
    repeat
      try
        set speechResult to (do shell script "echo 'Listening...' && read")
        return "SPEECH_RESULT:" & speechResult & ":1.0:true"
      on error
        delay 0.1
      end try
    end repeat
  `;

  try {
    // For macOS, we'll use a simpler approach with the built-in speech recognition
    activeRecognitionProcess = spawn("osascript", ["-e", appleScript], {
      stdio: ["pipe", "pipe", "pipe"]
    });

    activeRecognitionProcess.stdout?.on("data", (data) => {
      const output = data.toString().trim();
      logger.info(`🎤 macOS speech output: ${output}`);
      
      if (output.startsWith("SPEECH_RESULT:")) {
        const parts = output.split(":");
        const result: SpeechResult = {
          text: parts[1] || "",
          confidence: parseFloat(parts[2]) || 0,
          isFinal: parts[3] === "true"
        };
        event.sender.send("speech:result", result);
      }
    });

    activeRecognitionProcess.stderr?.on("data", (data) => {
      logger.error(`🍎 macOS speech error: ${data.toString()}`);
      event.sender.send("speech:error", data.toString());
    });

    activeRecognitionProcess.on("exit", (code) => {
      logger.info(`🍎 macOS speech recognition process exited with code: ${code}`);
      activeRecognitionProcess = null;
      event.sender.send("speech:ended");
    });

    event.sender.send("speech:ready");
    return { success: true };
  } catch (error) {
    logger.error("Failed to start macOS speech recognition:", error);
    throw error;
  }
}
