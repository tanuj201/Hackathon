"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Headphones, Play, Pause, Download, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { downloadBlob } from "@/lib/utils";
import type { AIModel, AudioTranscriptLine, StoredFile } from "@/types";

interface AudioOverviewProps {
  file: StoredFile | null;
  model: AIModel;
}

export function AudioOverview({ file, model }: AudioOverviewProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [transcript, setTranscript] = useState<AudioTranscriptLine[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const generate = async () => {
    if (!file) return;
    setIsGenerating(true);
    toast({ title: "Generating podcast...", description: "Creating transcript and audio" });

    try {
      const res = await fetch("/api/studio/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.id, model }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setTranscript(data.transcript);

      const binary = atob(data.audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: data.mimeType });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      toast({ title: "Audio overview ready", description: "Podcast generated successfully" });
    } catch (err) {
      toast({
        title: "Generation failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    fetch(audioUrl)
      .then((r) => r.blob())
      .then((blob) => downloadBlob(blob, `${file?.name || "overview"}-podcast.mp3`));
  };

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p className="text-sm">Select a document to generate an audio overview</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-4 gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Headphones className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Audio Overview</h3>
        </div>
        <Button onClick={generate} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Generating...
            </>
          ) : (
            "Generate Audio Overview"
          )}
        </Button>
      </div>

      {audioUrl && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
          />
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={togglePlay}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <div className="flex-1 space-y-1">
              <p className="text-xs text-muted-foreground">Playback speed: {playbackRate}x</p>
              <Slider
                value={[playbackRate]}
                min={0.5}
                max={2}
                step={0.25}
                onValueChange={([v]) => setPlaybackRate(v)}
              />
            </div>
            <Button variant="outline" size="icon" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {transcript.length > 0 && (
        <ScrollArea className="flex-1 rounded-lg border">
          <div className="p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase">Transcript</p>
            {transcript.map((line, i) => (
              <div key={i} className="space-y-0.5">
                <p className="text-xs font-semibold text-primary">{line.speaker}</p>
                <p className="text-sm leading-relaxed">{line.text}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
