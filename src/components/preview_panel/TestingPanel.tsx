import React from "react";
import { useAtomValue } from "jotai";
import { selectedAppIdAtom, appUrlAtom } from "@/atoms/appAtoms";
import { AppTestingPanel } from "@/components/AppTestingPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TestTube, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function TestingPanel() {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const appUrlObj = useAtomValue(appUrlAtom);
  
  // Extract the actual URL string from the object
  const appUrl = appUrlObj?.appUrl || null;

  // Show message if no app is selected
  if (!selectedAppId) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              App Testing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Select an app to start testing. The testing panel will appear when your app is running.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show message if app doesn't have a URL (not running)
  if (!appUrl) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              App Testing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Start your app preview first to enable testing. Switch to the "Preview" tab and start your app, then come back here to run tests.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show the actual testing panel when app is running
  return (
    <div className="h-full p-4 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <AppTestingPanel 
          appId={selectedAppId} 
          appUrl={appUrl} 
          appName={`App ${selectedAppId}`} 
        />
      </div>
    </div>
  );
}
