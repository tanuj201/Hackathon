"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
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
  const [mode, setMode] = useState<"server-tts" | "browser-tts" | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [lineIndex, setLineIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      window.speechSynthesis?.cancel();
    };
  }, [audioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const stopBrowserSpeech = useCallback(() => {
    window.speechSynthesis?.cancel();
    utterRef.current = null;
    setIsPlaying(false);
  }, []);

  const playBrowserSpeech = useCallback(
    (startAt = 0) => {
      if (!transcript.length || typeof window === "undefined" || !window.speechSynthesis) {
        toast({
          title: "Speech not available",
          description: "This browser does not support speech synthesis. Add OPENAI_API_KEY for MP3 audio.",
          variant: "destructive",
        });
        return;
      }

      window.speechSynthesis.cancel();
      setLineIndex(startAt);
      setIsPlaying(true);

      const speakFrom = (index: number) => {
        if (index >= transcript.length) {
          setIsPlaying(false);
          setLineIndex(0);
          return;
        }

        const line = transcript[index];
        const utter = new SpeechSynthesisUtterance(
          `${line.speaker}. ${line.text}`
        );
        utter.rate = playbackRate;
        utter.pitch = line.speaker === "Host A" ? 0.9 : 1.15;

        const voices = window.speechSynthesis.getVoices();
        if (voices.length) {
          const male =
            voices.find((v) => /male|david|daniel|alex|google us english/i.test(v.name)) ||
            voices[0];
          const female =
            voices.find((v) => /female|samantha|karen|zira|google uk english female/i.test(v.name)) ||
            voices[Math.min(1, voices.length - 1)];
          utter.voice = line.speaker === "Host A" ? male : female;
        }

        utter.onend = () => speakFrom(index + 1);
        utter.onerror = () => {
          setIsPlaying(false);
        };

        utterRef.current = utter;
        setLineIndex(index);
        window.speechSynthesis.speak(utter);
      };

      // Chrome sometimes needs voices loaded first
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => speakFrom(startAt);
      } else {
        speakFrom(startAt);
      }
    },
    [transcript, playbackRate]
  );

  const generate = async () => {
    if (!file) return;
    setIsGenerating(true);
    stopBrowserSpeech();
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    toast({ title: "Generating podcast...", description: "Creating transcript and audio" });

    try {
      const res = await fetch("/api/studio/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.id, model }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setTranscript(data.transcript ?? []);
      setMode(data.mode ?? (data.audio ? "server-tts" : "browser-tts"));

      if (data.audio) {
        const binary = atob(data.audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: data.mimeType || "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      } else {
        setAudioUrl(null);
      }

      toast({
        title: "Audio overview ready",
        description: data.warning || "Podcast generated successfully",
      });
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
    if (mode === "server-tts" && audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
      return;
    }

    // Browser TTS mode
    if (isPlaying) {
      stopBrowserSpeech();
    } else {
      playBrowserSpeech(0);
    }
  };

  const handleDownload = () => {
    if (!audioUrl) {
      toast({
        title: "MP3 download unavailable",
        description:
          "Add OPENAI_API_KEY or ELEVENLABS_API_KEY in Vercel to enable MP3 downloads. Browser speech cannot be exported.",
      });
      return;
    }
    fetch(audioUrl)
      .then((r) => r.blob())
      .then((blob) => downloadBlob(blob, `${file?.name || "overview"}-podcast.mp3`));
  };

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground p-4">
        <p className="text-sm">Select a document to generate an audio overview</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Headphones className="h-5 w-5 text-primary shrink-0" />
          <h3 className="font-semibold truncate">Audio Overview</h3>
        </div>
        <Button onClick={generate} disabled={isGenerating} className="shrink-0">
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

      <div className="flex flex-1 min-h-0 flex-col gap-3 px-4 pb-4 overflow-hidden">
        {(audioUrl || transcript.length > 0) && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3 shrink-0">
            {audioUrl && (
              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                onPause={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
              />
            )}
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={togglePlay}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <div className="flex-1 space-y-1 min-w-0">
                <p className="text-xs text-muted-foreground">
                  Playback speed: {playbackRate}x
                  {mode === "browser-tts" && " · Browser speech"}
                </p>
                <Slider
                  value={[playbackRate]}
                  min={0.5}
                  max={2}
                  step={0.25}
                  onValueChange={([v]) => {
                    setPlaybackRate(v);
                    if (mode === "browser-tts" && isPlaying) {
                      // Restart at current line with new rate
                      stopBrowserSpeech();
                      setTimeout(() => playBrowserSpeech(lineIndex), 50);
                    }
                  }}
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleDownload}
                disabled={!audioUrl}
                title={audioUrl ? "Download MP3" : "MP3 requires TTS API key"}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {transcript.length > 0 ? (
          <div className="flex-1 min-h-0 overflow-auto rounded-lg border">
            <div className="p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase sticky top-0 bg-background py-1">
                Transcript
              </p>
              {transcript.map((line, i) => (
                <div
                  key={i}
                  className={`space-y-0.5 rounded-md px-2 py-1 ${
                    mode === "browser-tts" && isPlaying && i === lineIndex
                      ? "bg-primary/10"
                      : ""
                  }`}
                >
                  <p className="text-xs font-semibold text-primary">{line.speaker}</p>
                  <p className="text-sm leading-relaxed">{line.text}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <p className="text-sm text-center px-4">
              Generate a two-host podcast overview of this document
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
