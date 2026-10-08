import { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2 } from "lucide-react";

// Pre-generated pleasing bar heights simulating speech cadence (Pic 3 look)
const WAVE_BARS = [
  30, 75, 45, 80, 25, 40, 60, 50, 90, 65, 30, 55, 70, 85, 20, 60, 40, 75, 50,
  35, 65, 80, 45, 60, 30, 70, 85, 40, 50, 65, 80, 35, 90, 70, 40, 60, 80, 25,
  45, 70, 50, 30,
];

export default function AnimatedAudioWaveform({ audioUrl, snippetText, totalDurationSec = 0 }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(totalDurationSec || 0);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.load();
    }
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setLoadError(true));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleBarClick = (index) => {
    if (!audioRef.current || !duration) return;
    const progressRatio = index / WAVE_BARS.length;
    const newTime = progressRatio * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatSecs = (sec) => {
    if (!sec || isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const progressFraction = duration > 0 ? currentTime / duration : 0;
  const activeBarIndex = Math.floor(progressFraction * WAVE_BARS.length);

  return (
    <div className="flex flex-col gap-2.5 w-full">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        onError={() => setLoadError(true)}
      />

      {/* Main Pill-shaped Waveform Container Matching Pic 3 */}
      <div className="relative group bg-slate-950/80 hover:bg-slate-950 border border-violet-500/30 hover:border-violet-500/50 rounded-2xl p-3.5 sm:px-5 transition-all shadow-lg shadow-violet-950/20">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Play/Pause + Speaker Indicator */}
          <button
            type="button"
            onClick={togglePlay}
            disabled={loadError}
            className="w-9 h-9 rounded-full bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-violet-600/30 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <Volume2
            className={`w-4 h-4 shrink-0 transition-colors ${
              isPlaying ? "text-violet-400 animate-pulse" : "text-slate-500"
            }`}
          />

          {/* Interactive Multi-bar Purple Waveform */}
          <div className="flex-1 h-9 flex items-center gap-1 sm:gap-1.5 overflow-hidden cursor-pointer">
            {WAVE_BARS.map((heightPercent, idx) => {
              const isPast = idx <= activeBarIndex;
              // Animate heights smoothly while playing for dynamic audio feel
              const dynamicStyle = isPlaying
                ? {
                    height: `${Math.max(
                      20,
                      (heightPercent * (0.8 + ((idx + Math.floor(currentTime * 4)) % 5) * 0.1))
                    )}%`,
                  }
                : { height: `${heightPercent}%` };

              return (
                <div
                  key={idx}
                  onClick={() => handleBarClick(idx)}
                  style={dynamicStyle}
                  className={`w-1 sm:w-1.5 rounded-full transition-all duration-150 ${
                    isPast
                      ? "bg-violet-400 shadow-sm shadow-violet-400/50"
                      : "bg-violet-950/80 hover:bg-violet-800/60"
                  }`}
                  title={`Seek to ${formatSecs((idx / WAVE_BARS.length) * duration)}`}
                />
              );
            })}
          </div>

          {/* Timer Clock display (e.g. 8:50 or 0:54) */}
          <div className="text-right shrink-0">
            <span className="text-base sm:text-lg font-bold font-mono text-violet-400 block tracking-tight">
              {formatSecs(currentTime > 0 ? currentTime : duration)}
            </span>
            <span className="text-[10px] text-slate-500 font-mono block">
              / {formatSecs(duration)}
            </span>
          </div>
        </div>
      </div>

      {/* Snippet text quotation below player (like Pic 3) */}
      {snippetText && (
        <p className="text-xs text-slate-400 italic px-2 font-sans line-clamp-2">
          "{snippetText}"
        </p>
      )}

      {loadError && (
        <span className="text-[11px] text-amber-400 px-2">
          Telephony recording stream is pending or expired.
        </span>
      )}
    </div>
  );
}
