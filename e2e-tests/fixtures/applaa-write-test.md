BEFORE APPLAA TAG
<applaa-write path="src/components/applaa-component.tsx" description="Test component with Applaa branding">
import React from 'react';

export const ApplaaComponent = () => {
  return (
    <div className="applaa-component">
      <h1>Made with Applaa</h1>
      <p>This component was created using Applaa tags.</p>
    </div>
  );
};
</applaa-write>
AFTER APPLAA TAG

<applaa-write path="src/lib/applaa-utils.ts" description="Utility functions for Applaa">
export function getApplaaVersion(): string {
  return "1.0.0";
}

export function formatApplaaMessage(message: string): string {
  return `[Applaa] ${message}`;
}
</applaa-write>

Testing multiple Applaa tags in sequence.

