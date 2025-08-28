import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  Monitor, 
  Smartphone, 
  Globe, 
  Zap,
  Code,
  Palette,
  ArrowRight
} from "lucide-react";

export type AppType = 'web' | 'mobile';

interface AppTypeSelectorProps {
  onAppTypeSelected: (appType: AppType) => void;
  onCancel?: () => void;
}

export function AppTypeSelector({ onAppTypeSelected, onCancel }: AppTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState<AppType>('web');

  const handleContinue = () => {
    onAppTypeSelected(selectedType);
  };

  return (
    <div className="flex items-center justify-center min-h-[500px] p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <Code className="h-6 w-6" />
            What type of app do you want to build?
          </CardTitle>
          <p className="text-muted-foreground">
            Choose your platform to get the best development experience and optimized templates.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup 
            value={selectedType} 
            onValueChange={(value) => setSelectedType(value as AppType)}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {/* Web App Option */}
            <div className="relative">
              <RadioGroupItem 
                value="web" 
                id="web" 
                className="peer sr-only" 
              />
              <Label 
                htmlFor="web" 
                className="flex flex-col items-start p-6 border-2 rounded-lg cursor-pointer transition-all hover:border-orange-300 peer-checked:border-orange-500 peer-checked:bg-orange-50/50 space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Monitor className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Web Application</h3>
                    <p className="text-sm text-muted-foreground">Desktop & browser-based</p>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-orange-500" />
                    <span>React.js or Next.js</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-orange-500" />
                    <span>Vite + TypeScript</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-orange-500" />
                    <span>Tailwind + Shadcn UI</span>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Perfect for dashboards, websites, admin panels, and desktop web applications.
                </p>
              </Label>
            </div>

            {/* Mobile App Option */}
            <div className="relative">
              <RadioGroupItem 
                value="mobile" 
                id="mobile" 
                className="peer sr-only" 
              />
              <Label 
                htmlFor="mobile" 
                className="flex flex-col items-start p-6 border-2 rounded-lg cursor-pointer transition-all hover:border-green-300 peer-checked:border-green-500 peer-checked:bg-green-50/50 space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Smartphone className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Mobile Application</h3>
                    <p className="text-sm text-muted-foreground">iOS & Android native</p>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-green-500" />
                    <span>Expo SDK 53 + React Native</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-green-500" />
                    <span>TypeScript + Expo Router</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-green-500" />
                    <span>Gluestack UI + NativeWind</span>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Cross-platform mobile apps with native performance and modern UI components.
                </p>
              </Label>
            </div>
          </RadioGroup>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <div className="flex-1" />
            <Button 
              onClick={handleContinue}
              className="flex items-center gap-2"
            >
              Continue with {selectedType === 'web' ? 'Web' : 'Mobile'} App
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Template Preview */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">
              {selectedType === 'web' ? '🌐 Web App Templates:' : '📱 Mobile App Templates:'}
            </h4>
            <div className="text-sm text-muted-foreground">
              {selectedType === 'web' ? (
                <>
                  <strong>React.js Template:</strong> Modern SPA with Vite, Tailwind, and Shadcn UI components<br/>
                  <strong>Next.js Template:</strong> Full-stack with SSR, API routes, and optimized performance
                </>
              ) : (
                <>
                  <strong>Expo Mobile Template:</strong> Cross-platform app with Expo SDK 53, Gluestack UI, bottom navigation, and native device features
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
