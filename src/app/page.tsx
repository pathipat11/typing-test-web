/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/page.tsx
"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { SENTENCES, buildWordsText } from "@/lib/typingData";
import { Mode, useScores } from "@/hooks/useScores";

type SentenceModeConfig = {
  mode: "sentence";
  duration: number;
};

type WordsModeConfig = {
  mode: "words";
  wordCount: number;
};

type Config = SentenceModeConfig | WordsModeConfig;

type View =
  | "menu"
  | "config-sentence"
  | "config-words"
  | "test"
  | "result";

const SENTENCE_DURATIONS = [15, 30, 60] as const;
const WORD_COUNTS = [25, 50, 100] as const;

export default function HomePage() {
  const [view, setView] = useState<View>("menu");
  const [config, setConfig] = useState<Config | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const [finalStats, setFinalStats] = useState<{
    mode: Mode;
    duration?: number;
    wordCount?: number;
    wpm: number;
    accuracy: number;
    elapsed: number;
    typed: number;
    correct: number;
  } | null>(null);

  const { addScore, getBestForConfig } = useScores();

  const bestForCurrentConfig = useMemo(() => {
    if (!config) return undefined;
    if (config.mode === "sentence") {
      return getBestForConfig("sentence", config.duration, null);
    } else {
      return getBestForConfig("words", null, config.wordCount);
    }
  }, [config, getBestForConfig]);

  const isDark = theme === "dark";
  const themeClasses = {
    bg: isDark ? "bg-neutral-900" : "bg-neutral-100",
    card: isDark ? "bg-neutral-800" : "bg-white",
    text: isDark ? "text-neutral-100" : "text-neutral-900",
    textMuted: isDark ? "text-neutral-400" : "text-neutral-500",
    accent: isDark ? "text-cyan-400" : "text-cyan-600",
    border: isDark ? "border-neutral-700" : "border-neutral-200",
    buttonPrimary:
      isDark
        ? "bg-emerald-500 hover:bg-emerald-400 text-neutral-900"
        : "bg-emerald-500 hover:bg-emerald-400 text-white",
    buttonSecondary:
      isDark
        ? "bg-amber-400 hover:bg-amber-300 text-neutral-900"
        : "bg-amber-400 hover:bg-amber-300 text-neutral-900",
    buttonDanger:
      "bg-red-500 hover:bg-red-600 text-white",
    buttonGhost:
      isDark
        ? "bg-neutral-700 hover:bg-neutral-600 text-neutral-100"
        : "bg-neutral-200 hover:bg-neutral-300 text-neutral-900",
    correct: isDark ? "text-emerald-400" : "text-emerald-700",
    incorrect: "text-red-500",
    remaining: isDark ? "text-neutral-500" : "text-neutral-400",
  };

  // toggle theme (เฉพาะ UI app เอง)
  const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  // เมื่อกด "เริ่มทดสอบ"
  function startTestWithConfig(c: Config) {
    setConfig(c);
    setView("test");
    setFinalStats(null);
  }

  function handleTestFinished(stats: {
    mode: Mode;
    duration?: number;
    wordCount?: number;
    wpm: number;
    accuracy: number;
    elapsed: number;
    typed: number;
    correct: number;
  }) {
    setFinalStats(stats);
    // เก็บลง localStorage ผ่าน hook
    addScore({
      mode: stats.mode,
      duration: stats.mode === "sentence" ? stats.duration ?? null : null,
      wordCount: stats.mode === "words" ? stats.wordCount ?? null : null,
      wpm: stats.wpm,
      accuracy: stats.accuracy,
      elapsed: stats.elapsed,
      typed: stats.typed,
      correct: stats.correct,
    });
    setView("result");
  }

  return (
    <main
      className={`min-h-screen ${themeClasses.bg} ${themeClasses.text} flex items-center justify-center px-4`}
    >
      <div className={`w-full max-w-3xl`}>
        {/* top bar */}
        <div className="flex items-center justify-between mb-4">
          <h1 className={`text-xl font-semibold ${themeClasses.accent}`}>
            Typing Test
          </h1>
          <button
            type="button"
            onClick={toggleTheme}
            className={`text-xs px-3 py-1 rounded-full border ${themeClasses.border} ${themeClasses.buttonGhost}`}
          >
            Theme: {theme === "dark" ? "Dark" : "Light"}
          </button>
        </div>

        <div
          className={`rounded-2xl shadow-lg p-6 md:p-8 ${themeClasses.card} border ${themeClasses.border}`}
        >
          {view === "menu" && (
            <MenuView
              themeClasses={themeClasses}
              onSelectSentence={() => setView("config-sentence")}
              onSelectWords={() => setView("config-words")}
            />
          )}

          {view === "config-sentence" && (
            <SentenceConfigView
              themeClasses={themeClasses}
              onBack={() => setView("menu")}
              onStart={(duration) =>
                startTestWithConfig({ mode: "sentence", duration })
              }
            />
          )}

          {view === "config-words" && (
            <WordsConfigView
              themeClasses={themeClasses}
              onBack={() => setView("menu")}
              onStart={(wordCount) =>
                startTestWithConfig({ mode: "words", wordCount })
              }
            />
          )}

          {view === "test" && config && (
            <TypingTestView
              themeClasses={themeClasses}
              config={config}
              onExitToMenu={() => setView("menu")}
              onFinished={handleTestFinished}
            />
          )}

          {view === "result" && finalStats && config && (
            <ResultView
              themeClasses={themeClasses}
              stats={finalStats}
              best={bestForCurrentConfig}
              onRetry={() =>
                startTestWithConfig(config) // ใช้ config เดิม
              }
              onMenu={() => setView("menu")}
            />
          )}
        </div>
      </div>
    </main>
  );
}

// -------------------
// Menu
// -------------------
function MenuView({
  themeClasses,
  onSelectSentence,
  onSelectWords,
}: {
  themeClasses: any;
  onSelectSentence: () => void;
  onSelectWords: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h2 className="text-2xl font-bold mb-2">Welcome</h2>
      <p className={`text-sm mb-4 max-w-md ${themeClasses.textMuted}`}>
        Choose a mode to start practicing your typing speed and accuracy,
        similar to monkeytype. All results are saved locally in your browser.
      </p>
      <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
        <button
          onClick={onSelectSentence}
          className={`flex-1 md:flex-none px-4 py-3 rounded-xl text-sm font-semibold ${themeClasses.buttonPrimary}`}
        >
          Sentence mode (timed)
        </button>
        <button
          onClick={onSelectWords}
          className={`flex-1 md:flex-none px-4 py-3 rounded-xl text-sm font-semibold ${themeClasses.buttonSecondary}`}
        >
          Words mode (25 / 50 / 100)
        </button>
      </div>
    </div>
  );
}

// -------------------
// Sentence config
// -------------------
function SentenceConfigView({
  themeClasses,
  onBack,
  onStart,
}: {
  themeClasses: any;
  onBack: () => void;
  onStart: (duration: number) => void;
}) {
  const [selected, setSelected] = useState<number>(30);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Sentence mode</h2>
        <button
          onClick={onBack}
          className={`text-xs px-3 py-1 rounded-full ${themeClasses.buttonGhost}`}
        >
          Back
        </button>
      </div>
      <p className={`text-sm ${themeClasses.textMuted}`}>
        Choose how long you want to type sentences. A random sentence will
        appear, and the timer starts when you type your first key.
      </p>
      <div className="flex flex-wrap gap-2 mt-2">
        {SENTENCE_DURATIONS.map((sec) => (
          <button
            key={sec}
            type="button"
            onClick={() => setSelected(sec)}
            className={`px-4 py-2 rounded-full text-sm border ${themeClasses.border} ${
              selected === sec
                ? "bg-emerald-500 text-white border-transparent"
                : "hover:bg-neutral-700/40"
            }`}
          >
            {sec} seconds
          </button>
        ))}
      </div>
      <button
        onClick={() => onStart(selected)}
        className={`mt-4 px-4 py-2 rounded-xl text-sm font-semibold ${themeClasses.buttonPrimary}`}
      >
        Start test
      </button>
    </div>
  );
}

// -------------------
// Words config
// -------------------
function WordsConfigView({
  themeClasses,
  onBack,
  onStart,
}: {
  themeClasses: any;
  onBack: () => void;
  onStart: (wordCount: number) => void;
}) {
  const [selected, setSelected] = useState<number>(25);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Words mode</h2>
        <button
          onClick={onBack}
          className={`text-xs px-3 py-1 rounded-full ${themeClasses.buttonGhost}`}
        >
          Back
        </button>
      </div>
      <p className={`text-sm ${themeClasses.textMuted}`}>
        Choose how many random words you want to type. The test ends when you
        finish all characters of the word sequence.
      </p>
      <div className="flex flex-wrap gap-2 mt-2">
        {WORD_COUNTS.map((cnt) => (
          <button
            key={cnt}
            type="button"
            onClick={() => setSelected(cnt)}
            className={`px-4 py-2 rounded-full text-sm border ${themeClasses.border} ${
              selected === cnt
                ? "bg-amber-400 text-neutral-900 border-transparent"
                : "hover:bg-neutral-700/40"
            }`}
          >
            {cnt} words
          </button>
        ))}
      </div>
      <button
        onClick={() => onStart(selected)}
        className={`mt-4 px-4 py-2 rounded-xl text-sm font-semibold ${themeClasses.buttonSecondary}`}
      >
        Start test
      </button>
    </div>
  );
}

// -------------------
// Typing test view
// -------------------
function TypingTestView({
  themeClasses,
  config,
  onExitToMenu,
  onFinished,
}: {
  themeClasses: any;
  config: Config;
  onExitToMenu: () => void;
  onFinished: (stats: {
    mode: Mode;
    duration?: number;
    wordCount?: number;
    wpm: number;
    accuracy: number;
    elapsed: number;
    typed: number;
    correct: number;
  }) => void;
}) {
  const [target, setTarget] = useState<string>("");
  const [typed, setTyped] = useState<string>("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  
  // focus invisible input
  const [inputFocused, setInputFocused] = useState(false);

  useEffect(() => {
    if (config.mode === "sentence") {
      const randomSentence =
        SENTENCES[Math.floor(Math.random() * SENTENCES.length)];
      setTarget(randomSentence);
    } else {
      setTarget(buildWordsText(config.wordCount));
    }
    setTyped("");
    setStartTime(null);
    setFinished(false);
  }, [config]);

  // stats
  const { elapsed, wpm, accuracy, remaining } = useTypingStats({
    target,
    typed,
    mode: config.mode,
    duration: config.mode === "sentence" ? config.duration : undefined,
    startTime,
  });

  // end conditions (monkeytype-style)
  useEffect(() => {
    if (finished) return;
    if (!target) return;
    if (!startTime) return; // ยังไม่เริ่มพิมพ์จริง

    const reachedEnd = typed.length >= target.length;

    if (config.mode === "sentence") {
      // หมดเวลา → จบ
      if (remaining !== null && remaining <= 0) {
        handleFinish();
        return;
      }
      // พิมพ์ครบจำนวนตัวอักษรทั้งหมดของประโยค → จบ
      if (reachedEnd) {
        handleFinish();
        return;
      }
    } else {
      // words mode: จบเมื่อพิมพ์ครบความยาวของ target
      if (reachedEnd) {
        handleFinish();
        return;
      }
    }
  }, [typed, target, remaining, finished, startTime, config.mode]);


  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (finished) return;

    if (e.key === "Escape") {
      e.preventDefault();
      onExitToMenu();
      return;
    }

    // Backspace
    if (e.key === "Backspace") {
      e.preventDefault();
      if (!typed.length) return;
      setTyped((prev) => prev.slice(0, -1));
      return;
    }

    // ignore control keys
    if (e.key.length > 1) {
      return;
    }

    // start timer on first key
    if (!startTime) {
      setStartTime(Date.now());
    }

    // limit to target length
    if (typed.length >= target.length) {
      return;
    }

    setTyped((prev) => prev + e.key);
  }

  function handleFinish() {
    setFinished(true);
    const now = Date.now();
    const elapsedMs =
      startTime !== null ? now - startTime : 1;
    const elapsedSec = elapsedMs / 1000;
    const correctChars = countCorrectChars(typed, target);
    const minutes = elapsedSec / 60;
    const wpmVal =
      minutes > 0 ? (correctChars / 5) / minutes : 0;
    const accVal =
      typed.length > 0
        ? (correctChars / typed.length) * 100
        : 100;

    onFinished({
      mode: config.mode,
      duration: config.mode === "sentence" ? config.duration : undefined,
      wordCount: config.mode === "words" ? config.wordCount : undefined,
      wpm: wpmVal,
      accuracy: accVal,
      elapsed: elapsedSec,
      typed: typed.length,
      correct: correctChars,
    });
  }

  function handleBlur() {
    setInputFocused(false);
  }

  function handleFocus() {
    setInputFocused(true);
  }

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <div className="font-semibold">
            {config.mode === "sentence"
              ? `Sentence mode · ${config.duration}s`
              : `Words mode · ${config.wordCount} words`}
          </div>
          <div className={`text-xs ${themeClasses.textMuted}`}>
            ESC to exit · Focus the input box and start typing
          </div>
        </div>
        <button
          type="button"
          onClick={onExitToMenu}
          className={`text-xs px-3 py-1 rounded-full ${themeClasses.buttonGhost}`}
        >
          Exit
        </button>
      </div>

      {/* stats bar */}
      <div
        className={`flex items-center justify-between text-sm px-3 py-2 rounded-xl border ${themeClasses.border}`}
      >
        <div>
          <span className="font-semibold">WPM</span>:{" "}
          {Math.round(wpm) || 0}
        </div>
        <div>
          <span className="font-semibold">Accuracy</span>:{" "}
          {accuracy.toFixed(1)}%
        </div>
        <div>
          <span className="font-semibold">
            {config.mode === "sentence"
              ? "Time left"
              : "Time"}
          </span>
          :{" "}
          {config.mode === "sentence"
            ? remaining !== null
              ? `${remaining.toFixed(1)}s`
              : `${config.duration.toFixed(1)}s`
            : `${elapsed.toFixed(1)}s`}
        </div>
      </div>

      {/* target text */}
      <div className="min-h-[140px] rounded-xl border px-4 py-3 text-lg leading-relaxed overflow-hidden" 
      onClick={() => inputRef.current?.focus()}>
        <TargetText
          themeClasses={themeClasses}
          target={target}
          typed={typed}
        />
      </div>

            {/* hidden input to capture keys */}
      <div
        className="mt-3 cursor-pointer"
        onClick={() => inputRef.current?.focus()}
      >
        <input
          ref={inputRef}
          autoFocus
          value=""
          onChange={() => {}}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={handleFocus}
          className="opacity-0 h-0 w-0 absolute pointer-events-none"
        />
        <div
          className={`text-xs ${
            inputFocused ? themeClasses.textMuted : "text-red-400"
          }`}
        >
          {inputFocused
            ? "Typing... (press ESC to exit)"
            : "Click anywhere here to refocus and continue typing."}
        </div>
      </div>
    </div>
  );
}

// -------------------
// Result view
// -------------------
import type { ScoreEntry } from "@/hooks/useScores";

function ResultView({
  themeClasses,
  stats,
  best,
  onRetry,
  onMenu,
}: {
  themeClasses: any;
  stats: {
    mode: Mode;
    duration?: number;
    wordCount?: number;
    wpm: number;
    accuracy: number;
    elapsed: number;
    typed: number;
    correct: number;
  };
  best?: ScoreEntry;
  onRetry: () => void;
  onMenu: () => void;
}) {
  const modeLabel =
    stats.mode === "sentence" ? "Sentence" : "Words";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Result</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div
          className={`rounded-xl border ${themeClasses.border} px-4 py-3`}
        >
          <div className="font-semibold mb-1">
            Current run
          </div>
          <p className={themeClasses.textMuted}>
            Mode: {modeLabel}
            {stats.mode === "sentence" &&
              ` · ${stats.duration}s`}
            {stats.mode === "words" &&
              ` · ${stats.wordCount} words`}
          </p>
          <ul className="mt-2 space-y-1">
            <li>
              WPM:{" "}
              <span className="font-semibold">
                {Math.round(stats.wpm)}
              </span>
            </li>
            <li>
              Accuracy:{" "}
              <span className="font-semibold">
                {stats.accuracy.toFixed(1)}%
              </span>
            </li>
            <li>Time: {stats.elapsed.toFixed(1)}s</li>
            <li>Keystrokes: {stats.typed}</li>
            <li>Correct chars: {stats.correct}</li>
          </ul>
        </div>

        <div
          className={`rounded-xl border ${themeClasses.border} px-4 py-3`}
        >
          <div className="font-semibold mb-1">
            Best for this mode
          </div>
          {best ? (
            <ul className="mt-2 space-y-1 text-sm">
              <li>
                Best WPM:{" "}
                <span className="font-semibold">
                  {Math.round(best.wpm)}
                </span>
              </li>
              <li>
                Best Accuracy:{" "}
                <span className="font-semibold">
                  {best.accuracy.toFixed(1)}%
                </span>
              </li>
              <li>Best Time: {best.elapsed.toFixed(1)}s</li>
              <li className={themeClasses.textMuted}>
                Played at:{" "}
                {new Date(
                  best.createdAt
                ).toLocaleString()}
              </li>
            </ul>
          ) : (
            <p className={themeClasses.textMuted}>
              No previous runs found for this configuration yet.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={onRetry}
          className={`px-4 py-2 rounded-xl text-sm font-semibold ${themeClasses.buttonPrimary}`}
        >
          Retry same mode
        </button>
        <button
          onClick={onMenu}
          className={`px-4 py-2 rounded-xl text-sm font-semibold ${themeClasses.buttonSecondary}`}
        >
          Back to main menu
        </button>
      </div>
    </div>
  );
}

// -------------------
// helpers
// -------------------

function countCorrectChars(typed: string, target: string): number {
  let c = 0;
  for (let i = 0; i < typed.length && i < target.length; i++) {
    if (typed[i] === target[i]) c++;
  }
  return c;
}

function useTypingStats({
  target,
  typed,
  mode,
  duration,
  startTime,
}: {
  target: string;
  typed: string;
  mode: Mode;
  duration?: number;
  startTime: number | null;
}) {
  const [now, setNow] = useState<number>(() =>
    Date.now()
  );

  useEffect(() => {
    if (!startTime) return;

    const id = setInterval(() => {
      setNow(Date.now());
    }, 100);

    return () => clearInterval(id);
  }, [startTime]);

  const elapsedMs =
    startTime !== null ? now - startTime : 0;
  const elapsed = elapsedMs / 1000;
  const minutes = elapsed / 60;

  const correct = countCorrectChars(typed, target);
  const wpm =
    minutes > 0 ? (correct / 5) / minutes : 0;
  const accuracy =
    typed.length > 0
      ? (correct / typed.length) * 100
      : 100;

  const remaining =
    mode === "sentence" && duration != null
      ? Math.max(duration - elapsed, 0)
      : null;

  return { elapsed, wpm, accuracy, remaining };
}

function TargetText({
  themeClasses,
  target,
  typed,
}: {
  themeClasses: any;
  target: string;
  typed: string;
}) {
  const chars = target.split("");

  return (
    <div className="font-mono">
      {chars.map((ch, idx) => {
        const typedChar = typed[idx];

        // ยังไม่พิมพ์
        let cls = themeClasses.remaining;

        // ถ้าพิมพ์แล้ว
        if (typedChar != null) {
          cls =
            typedChar === ch
              ? themeClasses.correct
              : themeClasses.incorrect;
        }

        // caret = ตัวถัดไปที่ต้องพิมพ์
        const isCaret = idx === typed.length && typed.length < target.length;

        const classes = [
          cls,
          isCaret ? "border-b-2 border-emerald-400 animate-pulse" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <span key={idx} className={classes}>
            {ch}
          </span>
        );
      })}

      {/* caret อยู่ท้ายสุด เมื่อพิมพ์ครบแล้ว (แบบ monkeytype ที่ยังมี cursor ต่อ) */}
      {typed.length >= target.length && target.length > 0 && (
        <span className="inline-block w-0.5 h-5 align-middle bg-emerald-400 animate-pulse ml-0.5" />
      )}
    </div>
  );
}
