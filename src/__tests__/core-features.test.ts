import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
  removeDyadTags, 
  hasUnclosedDyadWrite, 
  removeProblemReportTags 
} from "../ipc/handlers/chat_stream_handlers";
import {
  getDyadWriteTags,
  getDyadDeleteTags,
  getDyadRenameTags,
  getDyadAddDependencyTags,
} from "../ipc/utils/dyad_tag_parser";

/**
 * CORE FEATURES PROTECTION SUITE
 * 
 * This test suite protects the most critical Applaa features that users depend on.
 * These tests MUST pass before any code changes are merged.
 * 
 * If any of these tests fail, it indicates a breaking change that could
 * disrupt user workflows and should be fixed immediately.
 */

describe("🛡️ CORE FEATURES PROTECTION", () => {
  
  describe("🏷️ Applaa Tag System", () => {
    it("should support both dyad-write and applaa-write tags", () => {
      const dyadResponse = `<dyad-write path="test.js">console.log('dyad');</dyad-write>`;
      const applaaResponse = `<applaa-write path="test.js">console.log('applaa');</applaa-write>`;
      
      const dyadTags = getDyadWriteTags(dyadResponse);
      const applaaTags = getDyadWriteTags(applaaResponse);
      
      expect(dyadTags).toHaveLength(1);
      expect(applaaTags).toHaveLength(1);
      expect(dyadTags[0].content).toBe("console.log('dyad');");
      expect(applaaTags[0].content).toBe("console.log('applaa');");
    });

    it("should support both dyad-delete and applaa-delete tags", () => {
      const dyadResponse = `<dyad-delete path="old.js"></dyad-delete>`;
      const applaaResponse = `<applaa-delete path="old.js"></applaa-delete>`;
      
      const dyadDeletes = getDyadDeleteTags(dyadResponse);
      const applaaDeletes = getDyadDeleteTags(applaaResponse);
      
      expect(dyadDeletes).toContain("old.js");
      expect(applaaDeletes).toContain("old.js");
    });

    it("should support all Applaa file operation tags", () => {
      const response = `
        <applaa-create-file path="new.js">content</applaa-create-file>
        <applaa-update-file path="existing.js">updated</applaa-update-file>
        <applaa-file-delete path="remove.js"></applaa-file-delete>
        <applaa-file-removal path="cleanup.js"></applaa-file-removal>
      `;
      
      const writeTags = getDyadWriteTags(response);
      const deleteTags = getDyadDeleteTags(response);
      
      expect(writeTags).toHaveLength(2); // create-file and update-file
      expect(deleteTags).toHaveLength(2); // file-delete and file-removal
    });
  });

  describe("🔄 Chat Stream Processing", () => {
    it("should detect unclosed write tags correctly", () => {
      const unclosedDyad = `<dyad-write path="test.js">console.log('test');`;
      const unclosedApplaa = `<applaa-write path="test.js">console.log('test');`;
      const closedDyad = `<dyad-write path="test.js">console.log('test');</dyad-write>`;
      const closedApplaa = `<applaa-write path="test.js">console.log('test');</applaa-write>`;
      
      expect(hasUnclosedDyadWrite(unclosedDyad)).toBe(true);
      expect(hasUnclosedDyadWrite(unclosedApplaa)).toBe(true);
      expect(hasUnclosedDyadWrite(closedDyad)).toBe(false);
      expect(hasUnclosedDyadWrite(closedApplaa)).toBe(false);
    });

    it("should remove both dyad and applaa tags from text", () => {
      const response = `
        Some text before
        <dyad-write path="file1.js">code1</dyad-write>
        Middle text
        <applaa-write path="file2.js">code2</applaa-write>
        Text after
      `;
      
      const cleaned = removeDyadTags(response);
      
      expect(cleaned).not.toContain("<dyad-write");
      expect(cleaned).not.toContain("<applaa-write");
      expect(cleaned).toContain("Some text before");
      expect(cleaned).toContain("Middle text");
      expect(cleaned).toContain("Text after");
    });

    it("should remove both dyad and applaa problem report tags", () => {
      const response = `
        Code here
        <dyad-problem-report summary="2 problems">
          <problem file="test.js" line="1">Error 1</problem>
        </dyad-problem-report>
        More code
        <applaa-problem-report summary="1 problem">
          <problem file="test2.js" line="5">Error 2</problem>
        </applaa-problem-report>
        End
      `;
      
      const cleaned = removeProblemReportTags(response);
      
      expect(cleaned).not.toContain("<dyad-problem-report");
      expect(cleaned).not.toContain("<applaa-problem-report");
      expect(cleaned).toContain("Code here");
      expect(cleaned).toContain("More code");
      expect(cleaned).toContain("End");
    });
  });

  describe("📁 File Operations", () => {
    it("should parse complex file write operations", () => {
      const response = `
        <applaa-write path="src/components/Button.tsx" description="Create a reusable button component">
        import React from 'react';
        
        interface ButtonProps {
          children: React.ReactNode;
          onClick?: () => void;
          variant?: 'primary' | 'secondary';
        }
        
        export const Button: React.FC<ButtonProps> = ({ 
          children, 
          onClick, 
          variant = 'primary' 
        }) => {
          return (
            <button 
              className={\`btn btn-\${variant}\`}
              onClick={onClick}
            >
              {children}
            </button>
          );
        };
        </applaa-write>
      `;
      
      const tags = getDyadWriteTags(response);
      
      expect(tags).toHaveLength(1);
      expect(tags[0].path).toBe("src/components/Button.tsx");
      expect(tags[0].description).toBe("Create a reusable button component");
      expect(tags[0].content).toContain("interface ButtonProps");
      expect(tags[0].content).toContain("export const Button");
    });

    it("should handle multiple file operations in sequence", () => {
      const response = `
        <applaa-write path="types.ts">export interface User { id: string; }</applaa-write>
        <applaa-rename from="old-utils.ts" to="new-utils.ts"></applaa-rename>
        <applaa-delete path="deprecated.ts"></applaa-delete>
        <applaa-add-dependency packages="lodash @types/lodash"></applaa-add-dependency>
      `;
      
      const writeTags = getDyadWriteTags(response);
      const renameTags = getDyadRenameTags(response);
      const deleteTags = getDyadDeleteTags(response);
      const depTags = getDyadAddDependencyTags(response);
      
      expect(writeTags).toHaveLength(1);
      expect(renameTags).toHaveLength(1);
      expect(deleteTags).toHaveLength(1);
      expect(depTags).toContain("lodash");
      expect(depTags).toContain("@types/lodash");
    });
  });

  describe("🔧 Backward Compatibility", () => {
    it("should maintain support for original dyad tags", () => {
      // This ensures we don't break existing functionality
      const legacyResponse = `
        <dyad-write path="legacy.js">console.log('legacy');</dyad-write>
        <dyad-delete path="old.js"></dyad-delete>
        <dyad-rename from="a.js" to="b.js"></dyad-rename>
        <dyad-add-dependency packages="react"></dyad-add-dependency>
      `;
      
      const writeTags = getDyadWriteTags(legacyResponse);
      const deleteTags = getDyadDeleteTags(legacyResponse);
      const renameTags = getDyadRenameTags(legacyResponse);
      const depTags = getDyadAddDependencyTags(legacyResponse);
      
      expect(writeTags).toHaveLength(1);
      expect(deleteTags).toHaveLength(1);
      expect(renameTags).toHaveLength(1);
      expect(depTags).toHaveLength(1);
    });

    it("should handle mixed dyad and applaa tags in same response", () => {
      const mixedResponse = `
        <dyad-write path="old-style.js">legacy code</dyad-write>
        <applaa-write path="new-style.js">modern code</applaa-write>
        <dyad-delete path="remove-old.js"></dyad-delete>
        <applaa-file-delete path="remove-new.js"></applaa-file-delete>
      `;
      
      const writeTags = getDyadWriteTags(mixedResponse);
      const deleteTags = getDyadDeleteTags(mixedResponse);
      
      expect(writeTags).toHaveLength(2);
      expect(deleteTags).toHaveLength(2);
    });
  });

  describe("🚨 Error Handling", () => {
    it("should handle malformed tags gracefully", () => {
      const malformedResponse = `
        <applaa-write path="test.js">unclosed tag
        <applaa-delete></applaa-delete>
        <applaa-write path="">empty path</applaa-write>
        <applaa-write>no attributes</applaa-write>
      `;
      
      // Should not throw errors
      expect(() => getDyadWriteTags(malformedResponse)).not.toThrow();
      expect(() => getDyadDeleteTags(malformedResponse)).not.toThrow();
      expect(() => removeDyadTags(malformedResponse)).not.toThrow();
    });

    it("should handle empty or null inputs", () => {
      expect(getDyadWriteTags("")).toEqual([]);
      expect(getDyadDeleteTags("")).toEqual([]);
      expect(getDyadRenameTags("")).toEqual([]);
      expect(getDyadAddDependencyTags("")).toEqual([]);
      
      expect(removeDyadTags("")).toBe("");
      expect(hasUnclosedDyadWrite("")).toBe(false);
    });
  });

  describe("🎯 Performance", () => {
    it("should handle large responses efficiently", () => {
      // Generate a large response with many tags
      const largeTags = Array.from({ length: 100 }, (_, i) => 
        `<applaa-write path="file${i}.js">console.log(${i});</applaa-write>`
      ).join('\n');
      
      const startTime = performance.now();
      const tags = getDyadWriteTags(largeTags);
      const endTime = performance.now();
      
      expect(tags).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });

    it("should handle deeply nested content", () => {
      const nestedContent = `
        <applaa-write path="complex.tsx">
        const Component = () => {
          return (
            <div>
              <span>{"<nested>"}</span>
              <code>{"<applaa-write>fake tag</applaa-write>"}</code>
            </div>
          );
        };
        </applaa-write>
      `;
      
      const tags = getDyadWriteTags(nestedContent);
      
      expect(tags).toHaveLength(1);
      expect(tags[0].content).toContain('<span>{"<nested>"}</span>');
    });
  });
});

/**
 * INTEGRATION TESTS
 * 
 * These tests verify that different parts of the system work together correctly.
 */
describe("🔗 INTEGRATION TESTS", () => {
  
  describe("End-to-End Tag Processing", () => {
    it("should process a complete AI response correctly", () => {
      const aiResponse = `
I'll help you create a todo app. Let me start by creating the necessary files:

<applaa-write path="src/types/Todo.ts" description="Define the Todo interface">
export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}
</applaa-write>

<applaa-write path="src/components/TodoItem.tsx" description="Individual todo item component">
import React from 'react';
import { Todo } from '../types/Todo';

interface Props {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export const TodoItem: React.FC<Props> = ({ todo, onToggle, onDelete }) => {
  return (
    <div className="todo-item">
      <input 
        type="checkbox" 
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
      />
      <span className={todo.completed ? 'completed' : ''}>{todo.text}</span>
      <button onClick={() => onDelete(todo.id)}>Delete</button>
    </div>
  );
};
</applaa-write>

<applaa-add-dependency packages="uuid @types/uuid"></applaa-add-dependency>

I've created a basic todo app structure for you!
      `;
      
      const writeTags = getDyadWriteTags(aiResponse);
      const depTags = getDyadAddDependencyTags(aiResponse);
      const cleanedResponse = removeDyadTags(aiResponse);
      
      // Verify tags were extracted correctly
      expect(writeTags).toHaveLength(2);
      expect(writeTags[0].path).toBe("src/types/Todo.ts");
      expect(writeTags[1].path).toBe("src/components/TodoItem.tsx");
      expect(depTags).toContain("uuid");
      expect(depTags).toContain("@types/uuid");
      
      // Verify cleaned response doesn't contain tags but keeps text
      expect(cleanedResponse).not.toContain("<applaa-write");
      expect(cleanedResponse).not.toContain("<applaa-add-dependency");
      expect(cleanedResponse).toContain("I'll help you create a todo app");
      expect(cleanedResponse).toContain("I've created a basic todo app structure");
    });
  });
});

