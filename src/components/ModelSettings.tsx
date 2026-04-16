import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Sparkles, AlertTriangle } from "lucide-react";
import { GEMINI_MODEL_OPTIONS, DEFAULT_MODEL, type GeminiModel } from "@/types/models";

export const ModelSettings = () => {
  const [preferredModel, setPreferredModel] = useState<GeminiModel>(DEFAULT_MODEL);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPreferredModel();
  }, []);

  const fetchPreferredModel = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("preferred_model")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data?.preferred_model) {
        setPreferredModel(data.preferred_model as GeminiModel);
      }
    } catch (error) {
      console.error("Error fetching preferred model:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleModelChange = async (model: GeminiModel) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ preferred_model: model })
        .eq("id", user.id);

      if (error) throw error;

      setPreferredModel(model);

      const modelOption = GEMINI_MODEL_OPTIONS.find(opt => opt.value === model);

      toast({
        title: "Model updated",
        description: `All new summaries will use ${modelOption?.label || model}`,
      });
    } catch (error) {
      console.error("Error updating preferred model:", error);
      toast({
        title: "Error",
        description: "Failed to update preferred model",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return null;
  }

  const selectedModel = GEMINI_MODEL_OPTIONS.find(opt => opt.value === preferredModel);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          AI Model Selection
        </CardTitle>
        <CardDescription>
          Choose which AI model to use for generating summaries
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="model-select">Default Model</Label>
          <Select value={preferredModel} onValueChange={handleModelChange}>
            <SelectTrigger id="model-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GEMINI_MODEL_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex flex-col py-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{option.label}</span>
                      {option.isDeprecated && (
                        <Badge variant="destructive" className="text-xs">
                          Deprecated
                        </Badge>
                      )}
                      {option.value === DEFAULT_MODEL && !option.isDeprecated && (
                        <Badge variant="secondary" className="text-xs">
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                    <span className="text-xs text-muted-foreground mt-1">
                      ${option.inputCostPer1M.toFixed(2)}/1M input • ${option.outputCostPer1M.toFixed(2)}/1M output tokens
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedModel?.isDeprecated && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Model Deprecated
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  This model will be discontinued on {selectedModel.deprecationDate}.
                  Please switch to Gemini 2.5 Flash or another supported model.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
          <p className="mb-2 font-medium text-foreground">Model Comparison:</p>
          <ul className="space-y-1 text-xs">
            <li>• <strong>Flash Lite</strong>: Cheapest option, good for simple content</li>
            <li>• <strong>Flash</strong>: Best balance of speed, quality, and cost</li>
            <li>• <strong>Pro</strong>: Highest quality, best for complex or technical content</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
