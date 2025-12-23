import { AutomationChat } from '@/components/automation/AutomationChat';

export default function AutomationPage() {
  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 overflow-hidden p-4">
        <div className="h-full max-w-4xl mx-auto">
          <AutomationChat />
        </div>
      </div>
    </div>
  );
}

