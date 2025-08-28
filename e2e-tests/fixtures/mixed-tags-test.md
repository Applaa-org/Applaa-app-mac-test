Testing backward compatibility with mixed tags.

<dyad-write path="src/legacy/dyad-component.tsx" description="Legacy component with Dyad tags">
import React from 'react';

export const LegacyComponent = () => {
  return (
    <div className="legacy-component">
      <p>Legacy Dyad component</p>
    </div>
  );
};
</dyad-write>

<applaa-write path="src/components/new-applaa-component.tsx" description="New component with Applaa tags">
import React from 'react';

export const NewApplaaComponent = () => {
  return (
    <div className="applaa-component">
      <h2>New Applaa Component</h2>
      <p>This uses the new Applaa branding.</p>
    </div>
  );
};
</applaa-write>

Both tag types should work correctly.

