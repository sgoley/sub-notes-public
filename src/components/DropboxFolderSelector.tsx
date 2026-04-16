import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FolderIcon, Plus, Loader2, Home } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DropboxFolderSelectorProps {
  currentFolderPath?: string;
  currentFolderName?: string;
  onFolderSelected: (folderPath: string, folderName: string) => void;
}

interface Folder {
  id: string;
  name: string;
  path: string;
}

export function DropboxFolderSelector({
  currentFolderPath,
  currentFolderName,
  onFolderSelected,
}: DropboxFolderSelectorProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>(currentFolderPath || "");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("YouTube Summaries");

  useEffect(() => {
    if (open) {
      fetchFolders();
    }
  }, [open]);

  const fetchFolders = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/dropbox-oauth?action=list_folders`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch folders");
      }

      const data = await response.json();
      setFolders(data.folders || []);
    } catch (error) {
      console.error("Error fetching folders:", error);
      toast({
        title: "Error",
        description: "Failed to load Dropbox folders.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a folder name.",
        variant: "destructive",
      });
      return;
    }

    setCreatingFolder(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/dropbox-oauth?action=create_folder`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ folderName: newFolderName }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create folder");
      }

      const data = await response.json();
      
      toast({
        title: "Folder created!",
        description: `Created "${data.folder_name}" in Dropbox.`,
      });

      // Update parent component
      onFolderSelected(data.folder_path, data.folder_name);
      setOpen(false);
    } catch (error) {
      console.error("Error creating folder:", error);
      toast({
        title: "Error",
        description: "Failed to create folder.",
        variant: "destructive",
      });
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleSelectFolder = async () => {
    const selectedFolder = selectedFolderPath === "" 
      ? { id: "", name: "App Root", path: "" }
      : folders.find((f) => f.id === selectedFolderPath);
    
    if (!selectedFolder && selectedFolderPath !== "") return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const folderPath = selectedFolderPath;
      const folderName = selectedFolder?.name || "App Root";

      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/dropbox-oauth?action=update_folder`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            folderPath,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update folder");
      }

      const responseData = await response.json();

      toast({
        title: "Folder updated!",
        description: `Summaries will now sync to "${responseData.folder_name}".`,
      });

      onFolderSelected(responseData.folder_path, responseData.folder_name);
      setOpen(false);
    } catch (error) {
      console.error("Error updating folder:", error);
      toast({
        title: "Error",
        description: "Failed to update folder selection.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <FolderIcon className="h-4 w-4 mr-2" />
          {currentFolderName ? "Change Folder" : "Select Folder"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Select Dropbox Folder</DialogTitle>
          <DialogDescription>
            Choose where to save your YouTube summaries in Dropbox App Folder.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Existing folders */}
          <div className="space-y-2">
            <Label>Select folder</Label>
            <Select
              value={selectedFolderPath}
              onValueChange={setSelectedFolderPath}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a folder..." />
              </SelectTrigger>
              <SelectContent>
                {/* App Root option */}
                <SelectItem value="">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    App Root (default)
                  </div>
                </SelectItem>
                
                {loading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="ml-2 text-sm">Loading folders...</span>
                  </div>
                ) : folders.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No folders found. Use App Root or create one below.
                  </div>
                ) : (
                  folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      <div className="flex items-center gap-2">
                        <FolderIcon className="h-4 w-4" />
                        {folder.name}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Files are saved in your Dropbox App Folder (/Apps/sub-notes/)
            </p>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          {/* Create new folder */}
          <div className="space-y-2">
            <Label>Create new folder</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Folder name..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                disabled={creatingFolder}
              />
              <Button
                onClick={handleCreateFolder}
                disabled={creatingFolder || !newFolderName.trim()}
                size="icon"
              >
                {creatingFolder ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSelectFolder}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Selection"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
