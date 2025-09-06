import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { IpcClient } from "@/ipc/ipc_client";
import { showSuccess } from "@/lib/toast";
import {
  Smartphone,
  TabletSmartphone,
  Loader2,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface FlutterControlsProps {
  appId: number;
}

type FlutterStatus = "idle" | "syncing" | "opening";

export function FlutterControls({ appId }: FlutterControlsProps) {
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [iosStatus, setIosStatus] = useState<FlutterStatus>("idle");
  const [androidStatus, setAndroidStatus] = useState<FlutterStatus>("idle");

  // Check if Flutter mobile app is installed
  const { data: isFlutterMobile, isLoading } = useQuery({
    queryKey: ["is-flutter-mobile", appId],
    queryFn: () => IpcClient.getInstance().isFlutterMobile({ appId }),
    enabled: appId !== undefined && appId !== null,
  });

  const showErrorDialog = (title: string, error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    setErrorDetails({ title, message: errorMessage });
    setErrorDialogOpen(true);
  };

  // Sync and open iOS mutation
  const syncAndOpenIosMutation = useMutation({
    mutationFn: async () => {
      setIosStatus("syncing");
      // First sync
      await IpcClient.getInstance().syncFlutterMobile({ appId });
      setIosStatus("opening");
      // Then open iOS
      await IpcClient.getInstance().openFlutterIos({ appId });
    },
    onSuccess: () => {
      setIosStatus("idle");
      showSuccess("Opened Flutter iOS project directory");
    },
    onError: (error) => {
      setIosStatus("idle");
      showErrorDialog("Failed to open Flutter iOS project", error);
    },
  });

  // Sync and open Android mutation
  const syncAndOpenAndroidMutation = useMutation({
    mutationFn: async () => {
      setAndroidStatus("syncing");
      // First sync
      await IpcClient.getInstance().syncFlutterMobile({ appId });
      setAndroidStatus("opening");
      // Then open Android
      await IpcClient.getInstance().openFlutterAndroid({ appId });
    },
    onSuccess: () => {
      setAndroidStatus("idle");
      showSuccess("Opened Flutter Android project directory");
    },
    onError: (error) => {
      setAndroidStatus("idle");
      showErrorDialog("Failed to open Flutter Android project", error);
    },
  });

  const getIosButtonText = () => {
    if (iosStatus === "syncing") return "Preparing...";
    if (iosStatus === "opening") return "Opening...";
    return "Open iOS Project";
  };

  const getAndroidButtonText = () => {
    if (androidStatus === "syncing") return "Preparing...";
    if (androidStatus === "opening") return "Opening...";
    return "Open Android Project";
  };

  const iosButtonText = getIosButtonText();
  const androidButtonText = getAndroidButtonText();

  // Don't render if Flutter mobile app is not installed
  if (isLoading || !isFlutterMobile) {
    return null;
  }

  return (
    <>
      <Card className="mt-1" data-testid="flutter-controls">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Mobile Development
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                IpcClient.getInstance().openExternalUrl(
                  "https://docs.flutter.dev/cookbook/plugins/webview",
                );
              }}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1"
            >
              Need help?
              <ExternalLink className="h-3 w-3" />
            </Button>
          </CardTitle>
          <CardDescription>
            Open your Flutter mobile project directories. The webview URL is set to localhost - update main.dart when you deploy your web app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => syncAndOpenIosMutation.mutate()}
              disabled={iosStatus !== "idle" || androidStatus !== "idle"}
              className="flex items-center gap-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 hover:border-cyan-300"
              variant="outline"
            >
              {iosStatus === "idle" ? (
                <Smartphone className="h-4 w-4" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium">{iosButtonText}</span>
                <span className="text-xs text-cyan-600">Xcode</span>
              </div>
            </Button>

            <Button
              onClick={() => syncAndOpenAndroidMutation.mutate()}
              disabled={iosStatus !== "idle" || androidStatus !== "idle"}
              className="flex items-center gap-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 hover:border-cyan-300"
              variant="outline"
            >
              {androidStatus === "idle" ? (
                <TabletSmartphone className="h-4 w-4" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium">{androidButtonText}</span>
                <span className="text-xs text-cyan-600">Android Studio</span>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Dialog */}
      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{errorDetails?.title}</DialogTitle>
            <DialogDescription className="whitespace-pre-wrap">
              {errorDetails?.message}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
