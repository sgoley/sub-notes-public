import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Hook to automatically save summaries to Obsidian vault when they complete
 * Only works in Electron environment
 */
export const useObsidianSync = () => {
  useEffect(() => {
    const isElectron = typeof window !== "undefined" && "electronAPI" in window;
    if (!isElectron) return;

    // Subscribe to video_summaries changes
    const channel = supabase
      .channel("obsidian-sync")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "content_summaries",
          filter: "status=eq.completed",
        },
        async (payload) => {
          try {
            // Get user's profile with Obsidian settings
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: integrationSettings } = await supabase
              .from("integration_settings")
              .select("enabled, config")
              .eq("user_id", user.id)
              .eq("integration_type", "obsidian")
              .single();

            const obsidianEnabled = integrationSettings?.enabled || false;
            const vaultPath = integrationSettings?.config?.vault_path || null;
            const autoSave = integrationSettings?.config?.auto_save ?? true;

            // Check if Obsidian sync is enabled
            if (!obsidianEnabled || !autoSave) {
              return;
            }

            if (!vaultPath) {
              console.warn("Obsidian enabled but no vault path set");
              return;
            }

            // Get the summary content
            const summary = payload.new;
            if (!summary.summary_markdown) {
              console.warn("Summary completed but no detailed markdown available");
              return;
            }

            // Create filename from video title
            const filename = createFileName(summary.content_title) + ".md";
            const filePath = `${vaultPath}/${filename}`;

            // Save to Obsidian vault via Electron API
            if (window.electronAPI) {
              const result = await window.electronAPI.saveToObsidian(
                filePath,
                summary.summary_markdown
              );

              if (result.success) {
                toast({
                  title: "Saved to Obsidian",
                  description: `${filename} added to your vault`,
                });
              } else {
                console.error("Failed to save to Obsidian:", result.error);
                toast({
                  title: "Obsidian sync failed",
                  description: result.error || "Could not save to vault",
                  variant: "destructive",
                });
              }
            }
          } catch (error) {
            console.error("Error in Obsidian sync:", error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
};

function createFileName(rawTitle: string): string {
  const clean = rawTitle
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return clean || "sub-notes-summary";
}
