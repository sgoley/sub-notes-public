import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, FolderOpen, BarChart2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getSettings, updateSettings } from "@/lib/api";
import { pb } from "@/lib/pocketbase";
import { format, startOfMonth, endOfMonth, subMonths, addMonths, isSameMonth } from "date-fns";

interface TokenUsageRecord {
  id: string;
  content_title: string;
  author: string | null;
  created_at: string;
  token_usage: {
    model: string;
    summary_prompt_tokens: number;
    summary_output_tokens: number;
    highlights_prompt_tokens: number;
    highlights_output_tokens: number;
    total_tokens: number;
    generated_at: string;
  };
}

const VAULT_PATH = import.meta.env.VITE_OBSIDIAN_VAULT_PATH || "";

const Settings = () => {
  const navigate = useNavigate();
  const [autoSave, setAutoSave] = useState(false);
  const [subfolder, setSubfolder] = useState("sub-notes");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [usageRecords, setUsageRecords] = useState<TokenUsageRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [availableMonths, setAvailableMonths] = useState<Date[]>([]);

  useEffect(() => {
    getSettings()
      .then((s) => {
        setAutoSave(Boolean(s.obsidian_auto_save));
        if (s.obsidian_subfolder) setSubfolder(s.obsidian_subfolder as string);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    pb.collection("content_summaries")
      .getFullList({ fields: "id,content_title,author,created_at,metadata" })
      .then((records) => {
        const withUsage: TokenUsageRecord[] = records
          .filter((r) => r.metadata?.token_usage)
          .map((r) => ({
            id: r.id,
            content_title: r.content_title,
            author: r.author,
            created_at: r.created_at,
            token_usage: r.metadata.token_usage,
          }));

        setUsageRecords(withUsage);

        // Build list of months that have data
        const months = Array.from(
          new Set(
            withUsage.map((r) =>
              format(new Date(r.token_usage.generated_at), "yyyy-MM")
            )
          )
        )
          .sort()
          .reverse()
          .map((s) => new Date(s + "-01"));

        setAvailableMonths(months);
        if (months.length > 0) setSelectedMonth(months[0]);
      })
      .catch(console.error);
  }, []);

  const monthRecords = usageRecords.filter((r) =>
    isSameMonth(new Date(r.token_usage.generated_at), selectedMonth)
  );

  const monthTotals = monthRecords.reduce(
    (acc, r) => ({
      prompt: acc.prompt + r.token_usage.summary_prompt_tokens + r.token_usage.highlights_prompt_tokens,
      output: acc.output + r.token_usage.summary_output_tokens + r.token_usage.highlights_output_tokens,
      total: acc.total + r.token_usage.total_tokens,
    }),
    { prompt: 0, output: 0, total: 0 }
  );

  const allTimeTotals = usageRecords.reduce(
    (acc, r) => acc + r.token_usage.total_tokens,
    0
  );

  const canGoPrev = availableMonths.some((m) => m < startOfMonth(selectedMonth));
  const canGoNext = availableMonths.some((m) => m > startOfMonth(selectedMonth));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({ obsidian_auto_save: autoSave, obsidian_subfolder: subfolder });
      toast({ title: "Settings saved" });
    } catch (err) {
      toast({ title: "Failed to save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Settings</h1>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Obsidian Sync
            </CardTitle>
            <CardDescription>
              Automatically save summaries to your Obsidian vault
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-save">Auto-save to Obsidian</Label>
                  <Switch
                    id="auto-save"
                    checked={autoSave}
                    onCheckedChange={setAutoSave}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subfolder">Subfolder name</Label>
                  <Input
                    id="subfolder"
                    value={subfolder}
                    onChange={(e) => setSubfolder(e.target.value)}
                    placeholder="sub-notes"
                  />
                  <p className="text-xs text-muted-foreground">
                    Files saved at: vault/{subfolder}/[author]/[title].md
                  </p>
                </div>

                {VAULT_PATH && (
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-xs font-medium text-muted-foreground">Vault path (set in .env)</p>
                    <p className="text-sm font-mono mt-1 break-all">{VAULT_PATH}</p>
                  </div>
                )}

                {!VAULT_PATH && (
                  <div className="rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-3">
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      Set <code className="font-mono">OBSIDIAN_VAULT_PATH</code> in your <code className="font-mono">.env</code> file and restart Docker to enable vault sync.
                    </p>
                  </div>
                )}

                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save Settings"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5" />
              Token Usage
            </CardTitle>
            <CardDescription>
              Gemini API token consumption for locally-generated summaries
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usageRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No usage data yet. Token tracking applies to summaries generated after the PocketBase migration.
              </p>
            ) : (
              <div className="space-y-4">
                {/* Month navigator */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost" size="icon"
                    disabled={!canGoPrev}
                    onClick={() => setSelectedMonth((m) => subMonths(m, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">{format(selectedMonth, "MMMM yyyy")}</span>
                  <Button
                    variant="ghost" size="icon"
                    disabled={!canGoNext}
                    onClick={() => setSelectedMonth((m) => addMonths(m, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Month totals */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Prompt tokens", value: monthTotals.prompt.toLocaleString() },
                    { label: "Output tokens", value: monthTotals.output.toLocaleString() },
                    { label: "Total tokens", value: monthTotals.total.toLocaleString() },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg border bg-muted/40 p-3 text-center">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-lg font-semibold">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Per-summary table */}
                {monthRecords.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No summaries this month.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Summary</TableHead>
                        <TableHead className="text-right">Prompt</TableHead>
                        <TableHead className="text-right">Output</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthRecords
                        .sort((a, b) => new Date(b.token_usage.generated_at).getTime() - new Date(a.token_usage.generated_at).getTime())
                        .map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="max-w-[240px]">
                              <p className="truncate text-sm font-medium">{r.content_title}</p>
                              {r.author && <p className="text-xs text-muted-foreground">{r.author}</p>}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {(r.token_usage.summary_prompt_tokens + r.token_usage.highlights_prompt_tokens).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {(r.token_usage.summary_output_tokens + r.token_usage.highlights_output_tokens).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium">
                              {r.token_usage.total_tokens.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}

                <p className="text-xs text-muted-foreground text-right">
                  All-time total: {allTimeTotals.toLocaleString()} tokens
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Sub Notes — personal AI content summarizer</p>
            <p>Running locally via Docker. No cloud accounts required.</p>
            <p>
              PocketBase admin UI:{" "}
              <a
                href="http://localhost:7070/_/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                localhost:7070/_/
              </a>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Settings;
