// hooks/usePomodoro.js
import { useState, useEffect, useRef } from "react";
import { DateTime } from "luxon";
import { useCurrentTime } from "../context/TimeProvider";
import { AppToaster } from "../App";
import ringSound from "../assets/ring.wav";
import ring2Sound from "../assets/ring2.wav";
import peaceSound from "../assets/peace.mp3";

export const usePomodoro = (options = {}) => {
  const {
    focusMinutes = 25,
    breakMinutes = 5,
    longBreakMinutes = 15,
    cycleLimit = 4,
  } = options;

  const now = useCurrentTime();
  const [mode, setMode] = useState("idle");
  const [endTime, setEndTime] = useState(null);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const alarmAudioRef = useRef(null);
  const audioCtxRef = useRef(null);

  const tickBufferRef = useRef(null);
  const tickSourceRef = useRef(null);
  const tickGainRef = useRef(null);

  const peaceBufferRef = useRef(null);
  const peaceSourceRef = useRef(null);
  const peaceGainRef = useRef(null);

  // Resume context on user interaction
  useEffect(() => {
    const unlockAudio = () => {
      audioCtxRef.current?.resume();
      window.removeEventListener("click", unlockAudio);
    };
    window.addEventListener("click", unlockAudio);
    return () => window.removeEventListener("click", unlockAudio);
  }, []);

  // Load audio
  useEffect(() => {
    audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();

    const loadBuffer = async (src, ref) => {
      const response = await fetch(src);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
      ref.current = buffer;
    };

    alarmAudioRef.current = new Audio(ringSound);
    alarmAudioRef.current.loop = true;

    loadBuffer(ring2Sound, tickBufferRef);
    loadBuffer(peaceSound, peaceBufferRef);
  }, []);

  const stopAllAudio = () => {
    [tickSourceRef, peaceSourceRef].forEach((ref) => {
      try {
        ref.current?.stop();
      } catch {}
      ref.current?.disconnect();
      ref.current = null;
    });

    [tickGainRef, peaceGainRef].forEach((gainRef) => {
      gainRef.current?.disconnect();
      gainRef.current = null;
    });

    if (alarmAudioRef.current) {
      alarmAudioRef.current.pause();
      alarmAudioRef.current.currentTime = 0;
    }
  };

  const fadeOut = (gainNode) => {
    if (!gainNode) return;
    const time = audioCtxRef.current.currentTime;
    gainNode.gain.setValueAtTime(gainNode.gain.value, time);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.5);
    setTimeout(() => gainNode.disconnect(), 600);
  };

  const playLoop = async (bufferRef, sourceRef, gainRef, volume = 1) => {
    if (!soundEnabled || !bufferRef.current || !audioCtxRef.current) return;

    await audioCtxRef.current.resume();

    const gainNode = audioCtxRef.current.createGain();
    gainNode.gain.setValueAtTime(0.0001, audioCtxRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(volume, audioCtxRef.current.currentTime + 0.4);

    const source = audioCtxRef.current.createBufferSource();
    source.buffer = bufferRef.current;
    source.loop = true;

    source.connect(gainNode).connect(audioCtxRef.current.destination);
    source.start(0);

    gainRef.current = gainNode;
    sourceRef.current = source;
  };

  const playRinging = () => {
    if (soundEnabled && alarmAudioRef.current) {
      alarmAudioRef.current.currentTime = 0;
      alarmAudioRef.current.play().catch((e) => console.warn("Alarm play error", e));
      setTimeout(() => {
        alarmAudioRef.current.pause();
        alarmAudioRef.current.currentTime = 0;
      }, 5000);
    }
  };

  const startFocus = () => {
    stopAllAudio();
    setMode("focus");
    setEndTime(DateTime.local().plus({ minutes: focusMinutes }));
    AppToaster.show({ message: "🍅 Focus session started!", intent: "primary" });
  };

  const startBreak = () => {
    stopAllAudio();
    const isLong = (cyclesCompleted + 1) % cycleLimit === 0;
    setMode(isLong ? "longBreak" : "break");
    setEndTime(DateTime.local().plus({ minutes: isLong ? longBreakMinutes : breakMinutes }));

    AppToaster.show({
      message: isLong ? "🧘 Long break started!" : "☕ Short break started!",
      intent: "success",
    });
  };

  const reset = () => {
    stopAllAudio();
    setMode("idle");
    setEndTime(null);
    setCyclesCompleted(0);
    AppToaster.show({ message: "🔁 Pomodoro reset", intent: "warning" });
  };

  // ⏱ Main logic
  useEffect(() => {
    if (!endTime || mode === "idle") return;

    if (now >= endTime) {
      stopAllAudio();
      playRinging();

      AppToaster.show({
        message:
          mode === "focus"
            ? "✅ Focus complete! Take a break."
            : "🚨 Break over! Back to work.",
        intent: "success",
      });

      setTimeout(() => {
        if (mode === "focus") {
          setCyclesCompleted((c) => c + 1);
          startBreak();
        } else {
          startFocus();
        }
      }, 5000);
    } else {
      if (soundEnabled) {
        if (mode === "focus" && !tickSourceRef.current) {
          playLoop(tickBufferRef, tickSourceRef, tickGainRef, 0.3);
        } else if (mode === "break" && !peaceSourceRef.current) {
          playLoop(peaceBufferRef, peaceSourceRef, peaceGainRef, 0.35);
        }
      }
    }
  }, [now, endTime, mode, soundEnabled]);

  // Stop if muted
  useEffect(() => {
    if (!soundEnabled) stopAllAudio();
  }, [soundEnabled]);

  const secondsLeft = endTime
    ? Math.max(0, Math.floor(endTime.diff(now, "seconds").seconds))
    : 0;

  return {
    mode,
    secondsLeft,
    startFocus,
    reset,
    isRunning: mode !== "idle",
    soundEnabled,
    setSoundEnabled,
  };
};
