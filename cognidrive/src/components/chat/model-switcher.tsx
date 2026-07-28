"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AI_MODELS, type AIModel } from "@/types";
import { Bot } from "lucide-react";

interface ModelSwitcherProps {
  model: AIModel;
  onModelChange: (model: AIModel) => void;
}

export function ModelSwitcher({ model, onModelChange }: ModelSwitcherProps) {
  return (
    <div className="flex items-center gap-2">
      <Bot className="h-4 w-4 text-muted-foreground" />
      <Select value={model} onValueChange={(v) => onModelChange(v as AIModel)}>
        <SelectTrigger className="w-[200px] h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {AI_MODELS.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              <span className="font-medium">{m.label}</span>
              <span className="text-muted-foreground ml-1">· {m.provider}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
