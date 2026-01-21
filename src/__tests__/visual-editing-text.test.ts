import { describe, it, expect } from 'vitest';
import { updateTextContentInAST } from '../ipc/utils/ast_style_updater';

describe('Visual Editing - Text Content Updates', () => {
  describe('updateTextContentInAST', () => {
    it('should update simple text content in a paragraph', () => {
      const code = `
import React from 'react';

export function App() {
  return (
    <div>
      <p>Hello World</p>
    </div>
  );
}
      `.trim();

      const result = updateTextContentInAST(code, 'App.tsx', 5, 0, 'Track and manage your home maintenance');

      expect(result).toContain('Track and manage your home maintenance');
      expect(result).toContain('<p>');
      expect(result).toContain('</p>');
    });

    it('should update text content with multiple words', () => {
      const code = `
export function Header() {
  return (
    <h1>Welcome</h1>
  );
}
      `.trim();

      const result = updateTextContentInAST(code, 'Header.tsx', 3, 0, 'Household Repairs Dashboard');

      expect(result).toContain('Household Repairs Dashboard');
      expect(result).not.toContain('Welcome');
    });

    it('should preserve JSX structure when updating text', () => {
      const code = `
export function Button() {
  return (
    <button className="btn">
      Click Me
    </button>
  );
}
      `.trim();

      const result = updateTextContentInAST(code, 'Button.tsx', 3, 0, 'Save Changes');

      expect(result).toContain('Save Changes');
      expect(result).toContain('className="btn"');
      expect(result).toContain('<button');
      expect(result).toContain('</button>');
    });

    it('should handle text with special characters', () => {
      const code = `
export function Message() {
  return <p>Hello</p>;
}
      `.trim();

      const result = updateTextContentInAST(code, 'Message.tsx', 2, 0, 'Price: $99.99 & More!');

      expect(result).toContain('Price: $99.99 & More!');
    });

    it('should handle empty text content', () => {
      const code = `
export function Empty() {
  return <div>Some text</div>;
}
      `.trim();

      const result = updateTextContentInAST(code, 'Empty.tsx', 2, 0, '');

      expect(result).toContain('<div>');
      expect(result).toContain('</div>');
      // Empty text should still create a valid JSX structure
    });

    it('should handle text with quotes and apostrophes', () => {
      const code = `
export function Quote() {
  return <span>Old text</span>;
}
      `.trim();

      const result = updateTextContentInAST(code, 'Quote.tsx', 2, 0, "Don't forget to \"save\" your work");

      expect(result).toContain("Don't forget to \"save\" your work");
    });

    it('should preserve nested elements when updating text', () => {
      const code = `
export function Complex() {
  return (
    <div>
      Original text
      <span>Nested</span>
    </div>
  );
}
      `.trim();

      const result = updateTextContentInAST(code, 'Complex.tsx', 3, 0, 'New text');

      expect(result).toContain('New text');
      expect(result).toContain('<span>Nested</span>');
      expect(result).toContain('<div>');
    });

    it('should handle long sentences correctly', () => {
      const code = `
export function LongText() {
  return <p>Short</p>;
}
      `.trim();

      const longText = 'This is a very long sentence that should be preserved completely without any truncation or character loss when saved to the source file.';
      const result = updateTextContentInAST(code, 'LongText.tsx', 2, 0, longText);

      expect(result).toContain(longText);
      expect(result.length).toBeGreaterThan(longText.length); // Should include JSX structure
    });

    it('should handle text with newlines and whitespace', () => {
      const code = `
export function Multiline() {
  return <p>Single line</p>;
}
      `.trim();

      const multilineText = 'Line 1\nLine 2\nLine 3';
      const result = updateTextContentInAST(code, 'Multiline.tsx', 2, 0, multilineText);

      expect(result).toContain(multilineText);
    });

    it('should handle text content in button elements', () => {
      const code = `
export function ActionButton() {
  return <button>Submit</button>;
}
      `.trim();

      const result = updateTextContentInAST(code, 'ActionButton.tsx', 2, 0, 'Save and Continue');

      expect(result).toContain('Save and Continue');
      expect(result).toContain('<button>');
    });

    it('should handle text in heading elements', () => {
      const code = `
export function Title() {
  return <h2>Old Title</h2>;
}
      `.trim();

      const result = updateTextContentInAST(code, 'Title.tsx', 2, 0, 'Household Repairs');

      expect(result).toContain('Household Repairs');
      expect(result).toContain('<h2>');
    });

    it('should not corrupt the file structure', () => {
      const code = `
import React from 'react';

export function App() {
  const count = 0;
  return (
    <div className="container">
      <h1>Title</h1>
      <p>Description</p>
    </div>
  );
}
      `.trim();

      // Update the paragraph text (line 8 in the code)
      const result = updateTextContentInAST(code, 'App.tsx', 8, 0, 'New Description');

      // Should preserve imports
      expect(result).toContain('import React');
      // Should preserve variables
      expect(result).toContain('const count = 0');
      // Should preserve className
      expect(result).toContain('className="container"');
      // Should update the text in the paragraph
      expect(result).toContain('New Description');
      // Should preserve the h1 element unchanged
      expect(result).toContain('<h1>Title</h1>');
      // The paragraph should have the new text
      expect(result).toContain('<p>');
      expect(result).toContain('New Description');
    });
  });
});
