"use client";

import { useState, useRef } from "react";
import { Mic, Upload, FileAudio, Check, Loader2, Play, Square, Copy } from "lucide-react";

export default function Home() {
  const [status, setStatus] = useState<"idle" | "recording" | "uploading" | "processing" | "completed">("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleCopy = () => {
    if (transcript) {
      navigator.clipboard.writeText(transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };


  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setFileName(`recording-${new Date().toISOString()}.webm`);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setStatus("recording");
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please allow permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && status === "recording") {
      mediaRecorderRef.current.stop();
      setStatus("idle");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioBlob(file);
      setFileName(file.name);
    }
  };

  const handleSubmit = async () => {
    if (!audioBlob) return;

    setStatus("processing");
    setTranscript("");

    const formData = new FormData();
    formData.append("file", audioBlob, fileName || "audio.webm");

    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server Error: ${response.status}`);
      }

      const data = await response.json();
      setTranscript(data.text);
      setStatus("completed");
    } catch (error) {
      console.error("Error:", error);
      // @ts-expect-error handling unknown error type
      alert(error.message || "An error occurred");
      setStatus("idle");
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />

      <div className="container relative z-10 space-y-8">
        <header className="text-center space-y-4">
          <h1 className="text-5xl font-bold title-gradient tracking-tight">Shebinscribe</h1>
        </header>

        <div className="glass p-8 space-y-8 animate-fade-in">
          {/* Controls */}
          <div className="flex flex-col md:flex-row gap-6 justify-center items-center">

            {/* Recording Button */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={status === "recording" ? stopRecording : startRecording}
                className={`
                  relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300
                  ${status === "recording" ? "bg-red-500/20 text-red-500 ring-2 ring-red-500 ring-offset-2 ring-offset-black" : "bg-primary/10 text-primary hover:bg-primary/20"}
                `}
              >
                {status === "recording" ? (
                  <>
                    <Square size={32} fill="currentColor" />
                    <span className="absolute inset-0 rounded-full animate-ping bg-red-500/20" />
                  </>
                ) : (
                  <Mic size={32} />
                )}
              </button>
              <span className="text-sm font-medium text-muted-foreground">
                {status === "recording" ? "Recording..." : "Microphone"}
              </span>
            </div>

            <div className="h-px w-24 bg-border md:w-px md:h-24 md:mx-4" />

            {/* Upload Area */}
            <div className="flex flex-col items-center gap-2 relative group">
              <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
                <Upload className="text-muted-foreground group-hover:text-primary transition-colors" />
                <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
              </label>
              <span className="text-sm font-medium text-muted-foreground">Upload Audio</span>
            </div>
          </div>

          {/* File Status */}
          {fileName && (
            <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg border border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg text-primary">
                  <FileAudio size={20} />
                </div>
                <div>
                  <p className="font-medium text-sm">{fileName}</p>
                  <p className="text-xs text-muted-foreground">Ready to process</p>
                </div>
              </div>
              <button onClick={handleSubmit} disabled={status === "processing"} className="btn-primary flex items-center gap-2 text-sm">
                {status === "processing" ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Processing
                  </>
                ) : (
                  <>
                    Transcribe <Play size={16} fill="currentColor" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Output Area */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-muted-foreground">Transcription Output</label>
                {transcript && (
                  <button onClick={handleCopy} className="text-muted-foreground hover:text-white transition-colors" title="Copy to clipboard">
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  </button>
                )}
              </div>
              {status === "completed" && (
                <span className="status-badge text-green-400 bg-green-400/10 border-green-400/20">
                  <Check size={12} /> Completed
                </span>
              )}
            </div>
            <textarea
              readOnly
              value={transcript}
              placeholder="Your accurate English transcription will appear here..."
              className={status === "processing" ? "animate-pulse" : ""}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
