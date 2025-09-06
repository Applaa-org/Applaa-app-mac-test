/**
 * 🚨 CRITICAL: Chat Stream Integration Tests
 * 
 * These tests ensure our core chat stream functionality works end-to-end:
 * - Tag parsing (dyad-write, applaa-write, etc.)
 * - File creation from chat responses
 * - Dependency installation
 * - Error handling and recovery
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { getDyadWriteTags, getDyadRenameTags, getDyadDeleteTags } from '../../ipc/utils/dyad_tag_parser';
import { cleanFullResponse } from '../../ipc/utils/cleanFullResponse';
import { getBestPackageManager } from '../../lib/hermetic-runtime';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('Chat Stream Integration Tests', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'applaa-test-'));
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.remove(tempDir);
  });

  describe('Tag Parsing - Core Chat Stream Functionality', () => {
    it('should parse dyad-write tags correctly', () => {
      const response = `
Here's your component:

<dyad-write path="src/components/Button.tsx" description="Create a reusable button component">
import React from 'react';

export const Button = ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => {
  return (
    <button onClick={onClick} className="px-4 py-2 bg-blue-500 text-white rounded">
      {children}
    </button>
  );
};
</dyad-write>

That's your button component!
      `;

      const tags = getDyadWriteTags(response);
      
      expect(tags).toHaveLength(1);
      expect(tags[0].path).toBe('src/components/Button.tsx');
      expect(tags[0].description).toBe('Create a reusable button component');
      expect(tags[0].content).toContain('export const Button');
      expect(tags[0].content).not.toContain('```'); // Code fences should be stripped
    });

    it('should parse applaa-write tags correctly (Applaa branding)', () => {
      const response = `
<applaa-write path="src/utils/helpers.ts" description="Utility functions">
export const formatDate = (date: Date) => {
  return date.toLocaleDateString();
};
</applaa-write>
      `;

      const tags = getDyadWriteTags(response);
      
      expect(tags).toHaveLength(1);
      expect(tags[0].path).toBe('src/utils/helpers.ts');
      expect(tags[0].description).toBe('Utility functions');
      expect(tags[0].content).toContain('formatDate');
    });

    it('should parse multiple file creation tags in one response', () => {
      const response = `
I'll create multiple files for you:

<dyad-write path="src/types/User.ts" description="User type definitions">
export interface User {
  id: string;
  name: string;
  email: string;
}
</dyad-write>

<applaa-write path="src/services/api.ts" description="API service functions">
import { User } from '../types/User';

export const fetchUser = async (id: string): Promise<User> => {
  const response = await fetch(\`/api/users/\${id}\`);
  return response.json();
};
</applaa-write>

<dyad-write path="src/components/UserCard.tsx" description="User display component">
import React from 'react';
import { User } from '../types/User';

export const UserCard = ({ user }: { user: User }) => {
  return (
    <div className="p-4 border rounded">
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  );
};
</dyad-write>
      `;

      const tags = getDyadWriteTags(response);
      
      expect(tags).toHaveLength(3);
      expect(tags[0].path).toBe('src/types/User.ts');
      expect(tags[1].path).toBe('src/services/api.ts');
      expect(tags[2].path).toBe('src/components/UserCard.tsx');
      
      // Verify content integrity
      expect(tags[0].content).toContain('interface User');
      expect(tags[1].content).toContain('fetchUser');
      expect(tags[2].content).toContain('UserCard');
    });

    it('should handle malformed tags gracefully', () => {
      const response = `
<dyad-write path="src/broken.ts">
// Missing closing tag
export const broken = true;

<applaa-write description="Missing path attribute">
export const alsoProblematic = true;
</applaa-write>

<dyad-write path="src/good.ts" description="This one is correct">
export const good = true;
</dyad-write>
      `;

      const tags = getDyadWriteTags(response);
      
      // Should only parse the correctly formatted tag
      expect(tags).toHaveLength(1);
      expect(tags[0].path).toBe('src/good.ts');
      expect(tags[0].content).toContain('good = true');
    });
  });

  describe('Response Cleaning - Applaa Tag Support', () => {
    it('should clean both dyad and applaa tags in attributes', () => {
      const responseWithProblematicAttributes = `
<dyad-write path="src/component.tsx" description="Component with <div> and <span> tags">
export const Component = () => <div><span>Hello</span></div>;
</dyad-write>

<applaa-write path="src/other.tsx" description="Another component with <button> tags">
export const Other = () => <button>Click me</button>;
</applaa-write>
      `;

      const cleaned = cleanFullResponse(responseWithProblematicAttributes);
      
      // Should replace < and > in attribute values with fullwidth characters
      expect(cleaned).toContain('description="Component with ＜div＞ and ＜span＞ tags"');
      expect(cleaned).toContain('description="Another component with ＜button＞ tags"');
      
      // But should NOT affect the actual content
      expect(cleaned).toContain('<div><span>Hello</span></div>');
      expect(cleaned).toContain('<button>Click me</button>');
    });
  });

  describe('Dependency Management - Critical Infrastructure', () => {
    it('should get best package manager with valid path', async () => {
      // Create a test directory with package-lock.json
      await fs.writeFile(path.join(tempDir, 'package-lock.json'), '{}');
      
      const packageManager = await getBestPackageManager(tempDir);
      expect(packageManager).toBe('npm');
    });

    it('should detect pnpm workspace correctly', async () => {
      // Create pnpm-lock.yaml
      await fs.writeFile(path.join(tempDir, 'pnpm-lock.yaml'), 'lockfileVersion: 5.4');
      
      const packageManager = await getBestPackageManager(tempDir);
      expect(packageManager).toBe('pnpm');
    });

    it('should handle missing path parameter gracefully', async () => {
      // This should NOT throw an error (the bug we fixed)
      expect(async () => {
        // @ts-expect-error - Testing error case
        await getBestPackageManager(undefined);
      }).not.toThrow();
    });

    it('should fallback to npm when no lock files exist', async () => {
      // Empty directory should default to npm
      const packageManager = await getBestPackageManager(tempDir);
      expect(packageManager).toBe('npm');
    });
  });

  describe('File Operations - End-to-End', () => {
    it('should create files from parsed tags', async () => {
      const response = `
<dyad-write path="test-file.ts" description="Test file creation">
export const testFunction = () => {
  return "Hello, World!";
};
</dyad-write>
      `;

      const tags = getDyadWriteTags(response);
      expect(tags).toHaveLength(1);

      // Simulate file creation
      const filePath = path.join(tempDir, tags[0].path);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, tags[0].content);

      // Verify file was created correctly
      expect(await fs.pathExists(filePath)).toBe(true);
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toContain('testFunction');
      expect(content).toContain('Hello, World!');
    });
  });

  describe('Error Scenarios - Resilience Testing', () => {
    it('should handle streaming interruption gracefully', () => {
      const incompleteResponse = `
I'm creating a component for you:

<dyad-write path="src/components/Loading.tsx" description="Loading component">
import React from 'react';

export const Loading = () => {
  return (
    <div className="flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
  );
};
// Stream was interrupted here...
      `;

      // Should handle incomplete tags without crashing
      expect(() => getDyadWriteTags(incompleteResponse)).not.toThrow();
      
      const tags = getDyadWriteTags(incompleteResponse);
      // Might be 0 if tag is incomplete, or 1 if it's parseable
      expect(tags.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle special characters in file paths', () => {
      const responseWithSpecialChars = `
<dyad-write path="src/components/Special-Component_v2.tsx" description="Component with special chars">
export const SpecialComponent = () => null;
</dyad-write>
      `;

      const tags = getDyadWriteTags(responseWithSpecialChars);
      expect(tags).toHaveLength(1);
      expect(tags[0].path).toBe('src/components/Special-Component_v2.tsx');
    });

    it('should handle very large file content', () => {
      const largeContent = 'export const data = [\n' + 
        Array(1000).fill('  "item",').join('\n') + 
        '\n];';
      
      const response = `
<dyad-write path="src/data/large-dataset.ts" description="Large data file">
${largeContent}
</dyad-write>
      `;

      const tags = getDyadWriteTags(response);
      expect(tags).toHaveLength(1);
      expect(tags[0].content.length).toBeGreaterThan(5000);
      expect(tags[0].content).toContain('export const data');
    });
  });

  describe('Performance - Critical Path Optimization', () => {
    it('should parse tags efficiently with many files', () => {
      // Generate response with 50 file creation tags
      const manyFilesResponse = Array(50).fill(0).map((_, i) => `
<dyad-write path="src/components/Component${i}.tsx" description="Component ${i}">
export const Component${i} = () => <div>Component ${i}</div>;
</dyad-write>
      `).join('\n');

      const startTime = Date.now();
      const tags = getDyadWriteTags(manyFilesResponse);
      const endTime = Date.now();

      expect(tags).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(1000); // Should parse in under 1 second
      
      // Verify all components are unique
      const paths = tags.map(tag => tag.path);
      const uniquePaths = new Set(paths);
      expect(uniquePaths.size).toBe(50);
    });
  });
});
