import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AddBookmarkDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdd: (bookmark: { name: string; url: string; icon: string }) => void;
}

export function AddBookmarkDialog({ open, onOpenChange, onAdd }: AddBookmarkDialogProps) {
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [icon, setIcon] = useState('🔖');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!name || !url) return;

        onAdd({ name, url, icon });

        // Reset form
        setName('');
        setUrl('');
        setIcon('🔖');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Bookmark</DialogTitle>
                    <DialogDescription>
                        Add a new website to your bookmarks for quick access.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g., My Favorite Site"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="url">URL</Label>
                            <Input
                                id="url"
                                type="url"
                                placeholder="https://example.com"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="icon">Icon (Emoji)</Label>
                            <Input
                                id="icon"
                                placeholder="🔖"
                                value={icon}
                                onChange={(e) => setIcon(e.target.value)}
                                maxLength={2}
                            />
                            <p className="text-xs text-muted-foreground">
                                Choose an emoji to represent this bookmark
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">Add Bookmark</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
