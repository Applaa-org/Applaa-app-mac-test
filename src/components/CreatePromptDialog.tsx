import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import type { PromptItem } from "../lib/schemas";

const PROMPT_CATEGORIES = [
  "General",
  "UI/UX Design",
  "Web Development",
  "Mobile Development",
  "Mobile Responsive",
  "Viral Features",
  "Modern Web Standards",
  "Performance",
  "Accessibility",
];

interface CreateOrEditPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (prompt: {
    title: string;
    description?: string;
    content: string;
    category?: string;
  }) => Promise<void>;
  editingPrompt?: PromptItem | null;
}

export function CreateOrEditPromptDialog({
  open,
  onOpenChange,
  onSave,
  editingPrompt,
}: CreateOrEditPromptDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("General");
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    if (editingPrompt) {
      setTitle(editingPrompt.title);
      setDescription(editingPrompt.description || "");
      setContent(editingPrompt.content);
      setCategory(editingPrompt.category || "General");
    } else {
      setTitle("");
      setDescription("");
      setContent("");
      setCategory("General");
    }
  }, [editingPrompt, open]);

  useEffect(() => {
    adjustTextareaHeight();
  }, [content]);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        content: content.trim(),
        category: category,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving prompt:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {editingPrompt ? "Edit Prompt" : "Create New Prompt"}
          </DialogTitle>
          <DialogDescription>
            {editingPrompt
              ? "Update your prompt template."
              : "Create a new prompt template for reuse."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter prompt title..."
              className="w-full"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter prompt description..."
              className="w-full"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {PROMPT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              ref={textareaRef}
              id="content"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                adjustTextareaHeight();
              }}
              placeholder="Enter your prompt content..."
              className="min-h-[200px] resize-none overflow-hidden"
              rows={8}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title.trim() || !content.trim() || isSaving}
          >
            {isSaving ? "Saving..." : editingPrompt ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}