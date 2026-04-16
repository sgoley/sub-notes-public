import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SubscriptionsList } from "@/components/SubscriptionsList";
import { SummariesList } from "@/components/SummariesList";
import { ProcessVideoDialog } from "@/components/ProcessVideoDialog";
import { ChannelFilterPills } from "@/components/ChannelFilterPills";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, FileText, Bell } from "lucide-react";

export const Dashboard = () => {
  const navigate = useNavigate();
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Sub Notes</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")} title="Settings">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-6xl">
        <Tabs defaultValue="summaries" className="w-full">
          <div className="mb-6">
            <TabsList className="grid w-full sm:w-auto grid-cols-2">
              <TabsTrigger value="summaries" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Summaries</span>
              </TabsTrigger>
              <TabsTrigger value="subscriptions" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Subscriptions</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="summaries" className="mt-0">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="w-full sm:flex-1 min-w-0">
                  <ChannelFilterPills
                    selectedChannel={selectedChannel}
                    onSelectChannel={setSelectedChannel}
                  />
                </div>
                <ProcessVideoDialog onSuccess={handleSuccess} />
              </div>
              <SummariesList
                channelFilter={selectedChannel}
                onSuccess={handleSuccess}
                refreshTrigger={refreshTrigger}
              />
            </div>
          </TabsContent>

          <TabsContent value="subscriptions" className="mt-0">
            <SubscriptionsList
              onSuccess={handleSuccess}
              refreshTrigger={refreshTrigger}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};
