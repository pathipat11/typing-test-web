/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/page.tsx
"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { SENTENCES, buildWordsText } from "@/lib/typingData";
import { Mode, useScores } from "@/hooks/useScores";
import { supabase } from "@/lib/supabaseClient";
import type { ScoreEntry } from "@/hooks/useScores";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { User } from "@supabase/supabase-js";



type SentenceModeConfig = {
  mode: "sentence";
};

type WordsModeConfig = {
  mode: "words";
  wordCount?: number;
  duration?: number;
};

type Config = SentenceModeConfig | WordsModeConfig;

type View =
  | "menu"
  | "config-sentence"
  | "config-words"
  | "test"
  | "result"
  | "stats";

const SENTENCE_DURATIONS = [15, 30, 60] as const;
const WORD_COUNTS = [25, 50, 100] as const;

export default function HomePage() {
  const [view, setView] = useState<View>("menu");
  const [config, setConfig] = useState<Config | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [cloudScores, setCloudScores] = useState<ScoreEntry[]>([]);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);

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

  const { scores, addScore, getBestForConfig, clearScores } = useScores();

  // 👉 Supabase auth state
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showAuthBox, setShowAuthBox] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (ignore) return;
        if (!error && data.user) {
          setUser(data.user);
        }
      })
      .finally(() => {
        if (!ignore) setAuthChecked(true);
      });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      ignore = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setCloudScores([]);
      setCloudError(null);
      return;
    }

    setCloudLoading(true);
    setCloudError(null);

    supabase
      .from("typing_runs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to fetch typing_runs", error);
          setCloudError(error.message);
          return;
        }
        if (!data) {
          setCloudScores([]);
          return;
        }

        // map ให้หน้าตาเหมือน ScoreEntry
        const mapped: ScoreEntry[] = data.map((row: any) => ({
          id: row.id, // ต้องมีในตาราง typing_runs
          mode: row.mode,
          duration: row.duration,
          wordCount: row.word_count,
          wpm: row.wpm,
          accuracy: row.accuracy,
          elapsed: row.elapsed,
          typed: row.typed,
          correct: row.correct,
          createdAt: row.created_at,
        }));

        setCloudScores(mapped);
      })
      .finally(() => {
        setCloudLoading(false);
      });
  }, [user]);

  const bestForCurrentConfig = useMemo(() => {
    if (!config) return undefined;

    if (config.mode === "sentence") {
      // sentence: ไม่มี param อื่น
      return getBestForConfig("sentence", null, null);
    } else {
      // words: ถ้ามี duration -> timed, ถ้ามี wordCount -> fixed
      return getBestForConfig(
        "words",
        config.duration ?? null,
        config.wordCount ?? null
      );
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

  async function handleTestFinished(stats: {
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

    // Local
    addScore({
      mode: stats.mode,
      duration: stats.duration ?? null,
      wordCount: stats.wordCount ?? null,
      wpm: stats.wpm,
      accuracy: stats.accuracy,
      elapsed: stats.elapsed,
      typed: stats.typed,
      correct: stats.correct,
    });

    // Cloud
    if (user) {
      try {
        const { data, error } = await supabase
          .from("typing_runs")
          .insert({
            user_id: user.id,
            mode: stats.mode,
            duration: stats.duration ?? null,
            word_count: stats.wordCount ?? null,
            wpm: stats.wpm,
            accuracy: stats.accuracy,
            elapsed: stats.elapsed,
            typed: stats.typed,
            correct: stats.correct,
          })
          .select("*")
          .single();

        if (!error && data) {
          setCloudScores((prev) => [
            ...prev,
            {
              id: data.id,
              mode: data.mode,
              duration: data.duration,
              wordCount: data.word_count,
              wpm: data.wpm,
              accuracy: data.accuracy,
              elapsed: data.elapsed,
              typed: data.typed,
              correct: data.correct,
              createdAt: data.created_at,
            },
          ]);
        }
      } catch (err) {
        console.error("Failed to save score to Supabase", err);
      }
    }

    setView("result");
  }


  async function handleAuth(mode: "signin" | "signup") {
    setAuthLoading(true);
    setAuthError(null);

    try {
      if (!authEmail || !authPassword) {
        setAuthError("กรุณากรอกอีเมลและรหัสผ่าน");
        return;
      }

      if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });

        if (error) {
          setAuthError(error.message);
        } else {
          setUser(data.user ?? data.session?.user ?? null);
          setShowAuthBox(false);
        }
      } else {
        // 🔽 signup
        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
        });

        if (error) {
          setAuthError(error.message);
        } else {
          const newUser = data.user ?? data.session?.user ?? null;

          // ✅ สร้าง profile ให้ user คนนี้
          if (newUser) {
            try {
              await supabase.from("profiles").insert({
                id: newUser.id,  // ต้องตรงกับ primary key ของ profiles
                email: newUser.email,
                // ถ้ามี field อื่น เช่น display_name, avatar_url ก็ใส่เพิ่มได้
              });
            } catch (err) {
              console.error("Failed to create profile", err);
            }
          }

          setUser(newUser);
          setShowAuthBox(false);
        }
      }
    } catch (err: any) {
      console.error(err);
      setAuthError(err?.message ?? "Unknown error");
    } finally {
      setAuthLoading(false);
    }
  }


  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {
      console.error("Failed to sign out", err);
    }
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
          <div className="flex items-center gap-2">
            {/* แสดงสถานะว่าตอนนี้ guest หรือ login แล้ว */}
            <span className={`hidden sm:inline text-[11px] ${themeClasses.textMuted}`}>
              {authChecked
                ? user
                  ? `Signed in as ${user.email}`
                  : "Guest mode"
                : "Checking auth..."}
            </span>

            <button
              type="button"
              onClick={() => setView("stats")}
              className={`text-xs px-3 py-1 rounded-full border ${themeClasses.border} ${themeClasses.buttonGhost}`}
            >
              Stats
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className={`text-xs px-3 py-1 rounded-full border ${themeClasses.border} ${themeClasses.buttonGhost}`}
            >
              Theme: {theme === "dark" ? "Dark" : "Light"}
            </button>

            {user ? (
              <button
                type="button"
                onClick={handleSignOut}
                className={`text-xs px-3 py-1 rounded-full border ${themeClasses.border} ${themeClasses.buttonDanger}`}
              >
                Logout
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuthBox((v) => !v)}
                className={`text-xs px-3 py-1 rounded-full border ${themeClasses.border} ${themeClasses.buttonPrimary}`}
              >
                {showAuthBox ? "Close" : "Login / Sign up"}
              </button>
            )}
          </div>
      </div>

        {/* Auth box */}
        {showAuthBox && !user && (
          <div
            className={`mb-4 rounded-2xl border ${themeClasses.border} ${themeClasses.card} p-4 text-xs space-y-3`}
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold text-sm">Sign in / Sign up</div>
              <button
                type="button"
                onClick={() => setShowAuthBox(false)}
                className={`px-2 py-1 rounded-full ${themeClasses.buttonGhost}`}
              >
                ✕
              </button>
            </div>

            <div className="grid gap-2">
              <label className="flex flex-col gap-1">
                <span className={themeClasses.textMuted}>Email</span>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="px-2 py-1 rounded-md border border-neutral-600 bg-transparent text-xs outline-none"
                  placeholder="you@example.com"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className={themeClasses.textMuted}>Password</span>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="px-2 py-1 rounded-md border border-neutral-600 bg-transparent text-xs outline-none"
                  placeholder="••••••••"
                />
              </label>

              {authError && (
                <p className="text-red-400 text-[11px]">
                  {authError}
                </p>
              )}

              <div className="flex flex-wrap gap-2 mt-1">
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={() => handleAuth("signin")}
                  className={`px-3 py-1 rounded-full ${themeClasses.buttonPrimary} disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {authLoading ? "Signing in..." : "Sign in"}
                </button>
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={() => handleAuth("signup")}
                  className={`px-3 py-1 rounded-full ${themeClasses.buttonSecondary} disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {authLoading ? "Signing up..." : "Sign up"}
                </button>
              </div>

              <p className={`text-[11px] ${themeClasses.textMuted}`}>
                You can play as guest without an account.  
                Logging in lets your runs be saved to Supabase.
              </p>
            </div>
          </div>
        )}


        <div
          className={`rounded-2xl shadow-lg p-6 md:p-8 ${themeClasses.card} border ${themeClasses.border}`}
        >
          {view === "menu" && (
            <MenuView
              themeClasses={themeClasses}
              // ▶ Sentence: เริ่ม test ทันที ใช้ประโยคเดียว
              onSelectSentence={() =>
                startTestWithConfig({ mode: "sentence" })
              }

              // ▶ Words (timed): ไปหน้าเลือกเวลา (ใช้ view เดิม config-sentence)
              onSelectTimedWords={() => setView("config-sentence")}

              // ▶ Words (fixed count): ของเดิม
              onSelectWords={() => setView("config-words")}
            />
          )}

          {view === "config-sentence" && (
            <SentenceConfigView
              themeClasses={themeClasses}
              onBack={() => setView("menu")}
              onStart={(duration) =>
                startTestWithConfig({ mode: "words", duration })
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
          
          {view === "stats" && (
            <StatsView
              themeClasses={themeClasses}
              localScores={scores}
              cloudScores={cloudScores}
              onBack={() => setView("menu")}
              clearLocalScores={clearScores}
              isLoggedIn={!!user}
              cloudLoading={cloudLoading}
              cloudError={cloudError}
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
  onSelectTimedWords,
  onSelectWords,
}: {
  themeClasses: any;
  onSelectSentence: () => void;
  onSelectTimedWords: () => void;
  onSelectWords: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h2 className="text-2xl font-bold mb-2">Welcome</h2>
      <p className={`text-sm mb-4 max-w-md ${themeClasses.textMuted}`}>
        All results are saved locally in your browser.
        If you sign in, your runs are also saved to the cloud.
      </p>
      <div className="flex flex-col gap-3 w-full md:w-auto">
        <button
          onClick={onSelectSentence}
          className={`px-4 py-3 rounded-xl text-sm font-semibold ${themeClasses.buttonPrimary}`}
        >
          Sentence mode (1 sentence)
        </button>
        <button
          onClick={onSelectTimedWords}
          className={`px-4 py-3 rounded-xl text-sm font-semibold ${themeClasses.buttonSecondary}`}
        >
          Words mode (timed)
        </button>
        <button
          onClick={onSelectWords}
          className={`px-4 py-3 rounded-xl text-sm font-semibold ${themeClasses.buttonSecondary}`}
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
        <h2 className="text-xl font-semibold">Words mode (timed)</h2>
        <button
          onClick={onBack}
          className={`text-xs px-3 py-1 rounded-full ${themeClasses.buttonGhost}`}
        >
          Back
        </button>
      </div>
      <p className={`text-sm ${themeClasses.textMuted}`}>
        Choose how long you want to type random words. The test ends
        automatically when the timer reaches zero.
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
      // ประโยคเดียว
      const randomSentence =
        SENTENCES[Math.floor(Math.random() * SENTENCES.length)];
      setTarget(randomSentence);
    } else {
      const count =
        config.wordCount != null ? config.wordCount : 400;
      setTarget(buildWordsText(count));
    }
    setTyped("");
    setStartTime(null);
    setFinished(false);
  }, [config]);


  // stats
  const { elapsed, wpm, accuracy, remaining } = useTypingStats({
    target,
    typed,
    duration: config.mode === "words" ? config.duration : undefined,
    startTime,
  });

  
  // end conditions (monkeytype-style)
    useEffect(() => {
      if (finished) return;
      if (!target) return;
      if (!startTime) return; // ยังไม่เริ่ม

      const reachedEnd = typed.length >= target.length;

      const isSentence = config.mode === "sentence";
      const isTimedWords =
        config.mode === "words" && config.duration != null;
      const isFixedWords =
        config.mode === "words" &&
        config.wordCount != null &&
        config.duration == null;

      if (isSentence) {
        // ประโยคเดียว: จบเมื่อพิมพ์ครบ
        if (reachedEnd) {
          handleFinish();
        }
        return;
      }

      if (isTimedWords) {
        // words timed: จบเมื่อหมดเวลา
        if (remaining !== null && remaining <= 0) {
          handleFinish();
        }
        return;
      }

      if (isFixedWords) {
        // words fixed count: จบเมื่อพิมพ์ครบ
        if (reachedEnd) {
          handleFinish();
        }
        return;
      }
    }, [typed, target, remaining, finished, startTime, config]);



  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      if (config.mode === "sentence") {
        setTarget(SENTENCES[Math.floor(Math.random() * SENTENCES.length)]);
      } else {
        const count = config.wordCount ?? 400;  // <- ตรงนี้สำคัญ
        setTarget(buildWordsText(count));
      }

      setTyped("");
      setStartTime(null);
      setFinished(false);
      return;
    }

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
    const elapsedMs = startTime !== null ? now - startTime : 1;
    const elapsedSec = elapsedMs / 1000;
    const correctChars = countCorrectChars(typed, target);
    const minutes = elapsedSec / 60;
    const wpmVal = minutes > 0 ? (correctChars / 5) / minutes : 0;
    const accVal =
      typed.length > 0 ? (correctChars / typed.length) * 100 : 100;

    let resultDuration: number | undefined;
    let resultWordCount: number | undefined;

    if (config.mode === "sentence") {
      // sentence: ไม่มี config พิเศษ
      resultDuration = undefined;
      resultWordCount = undefined;
    } else {
      // words
      if (config.duration != null) {
        // timed words
        resultDuration = config.duration;
      }
      if (config.wordCount != null) {
        // fixed words
        resultWordCount = config.wordCount;
      }
    }

    onFinished({
      mode: config.mode,
      duration: resultDuration,
      wordCount: resultWordCount,
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

  const isTimedWords = config.mode === "words" && config.duration != null;
  const timeLabel = isTimedWords ? "Time left" : "Time";
  const timeValue = isTimedWords
    ? remaining !== null
      ? `${remaining.toFixed(1)}s`
      : `${(config.duration ?? 0).toFixed(1)}s`
    : `${elapsed.toFixed(1)}s`;

  let headerLabel = "";
  if (config.mode === "sentence") {
    headerLabel = "Sentence mode · 1 sentence";
  } else if (config.duration != null) {
    headerLabel = `Words mode · ${config.duration}s`;
  } else if (config.wordCount != null) {
    headerLabel = `Words mode · ${config.wordCount} words`;
  } else {
    headerLabel = "Words mode";
  }


  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <div className="font-semibold">{headerLabel}</div>
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
          <div>
            <span className="font-semibold">{timeLabel}</span>: {timeValue}
          </div>
        </div>
      </div>

      {/* target text */}
      <div
        className="min-h-[140px] rounded-xl border px-4 py-3 text-lg leading-relaxed overflow-hidden"
        onClick={() => inputRef.current?.focus()}
      >
        {isTimedWords ? (
          <TimedWordsTarget
            themeClasses={themeClasses}
            target={target}
            typed={typed}
          />
        ) : (
          <TargetText
            themeClasses={themeClasses}
            target={target}
            typed={typed}
          />
        )}
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
  let modeLabel = "";
  if (stats.mode === "sentence") {
    modeLabel = "Sentence · 1 sentence";
  } else if (stats.duration != null) {
    modeLabel = `Words · ${stats.duration}s`;
  } else if (stats.wordCount != null) {
    modeLabel = `Words · ${stats.wordCount} words`;
  } else {
    modeLabel = "Words";
  }

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

function StatsView({
  themeClasses,
  localScores,
  cloudScores,
  onBack,
  clearLocalScores,
  isLoggedIn,
  cloudLoading,
  cloudError,
}: {
  themeClasses: any;
  localScores: ScoreEntry[];
  cloudScores: ScoreEntry[];
  onBack: () => void;
  clearLocalScores: () => void;
  isLoggedIn: boolean;
  cloudLoading: boolean;
  cloudError: string | null;
}) {

  const [modeFilter, setModeFilter] = useState<"all" | "sentence" | "words">("all");
  const [source, setSource] = useState<"local" | "cloud">("local");

  const baseScores =
    source === "local" ? localScores : cloudScores;


  const filteredByMode =
    modeFilter === "all"
      ? baseScores
      : baseScores.filter((s) => s.mode === modeFilter);


  // เรียงจากเก่าสุด -> ใหม่สุด สำหรับกราฟ (จะได้อ่านซ้ายไปขวา)
  const trendSorted = [...filteredByMode].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() -
      new Date(b.createdAt).getTime()
  );

  // ใช้แค่ล่าสุดไม่เกิน 50 run เพื่อไม่แน่นเกินไป
  const chartData = trendSorted.slice(-50).map((s, idx) => ({
    index: idx + 1,
    wpm: Math.round(s.wpm),
    label: new Date(s.createdAt).toLocaleString(),
  }));

  // สำหรับ summary ด้านบน ใช้ filter เดียวกัน
  const totalRuns = filteredByMode.length;
  const bestWpm =
    totalRuns > 0
      ? Math.max(...filteredByMode.map((s) => s.wpm))
      : 0;
  const avgWpm =
    totalRuns > 0
      ? filteredByMode.reduce((sum, s) => sum + s.wpm, 0) /
        totalRuns
      : 0;
  const avgAccuracy =
    totalRuns > 0
      ? filteredByMode.reduce(
          (sum, s) => sum + s.accuracy,
          0
        ) / totalRuns
      : 0;

  // recent table: ใหม่ -> เก่า
  const sorted = [...filteredByMode].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
  );
  const recent = sorted.slice(0, 20);

  function handleClear() {
    if (
      window.confirm(
        "Clear all local scores? This action cannot be undone."
      )
    ) {
      clearLocalScores();
    }
  }


  return (
    <div className="space-y-4">
      {/* header + actions */}
            <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">
          Stats &amp; History
        </h2>
        <div className="flex items-center gap-2">
          {/* source filter: Local / Cloud */}
          <div className="flex text-xs rounded-full border px-1 py-0.5 overflow-hidden">
            <button
              type="button"
              onClick={() => setSource("local")}
              className={`px-2 py-0.5 rounded-full ${
                source === "local"
                  ? "bg-sky-500 text-neutral-900"
                  : ""
              }`}
            >
              Local
            </button>
            <button
              type="button"
              onClick={() => setSource("cloud")}
              className={`px-2 py-0.5 rounded-full ${
                source === "cloud"
                  ? "bg-sky-500 text-neutral-900"
                  : ""
              }`}
              disabled={!isLoggedIn}
            >
              Cloud
            </button>
          </div>

          {/* mode filter */}
          <div className="flex text-xs rounded-full border px-1 py-0.5 overflow-hidden">
            <button
              type="button"
              onClick={() => setModeFilter("all")}
              className={`px-2 py-0.5 rounded-full ${
                modeFilter === "all"
                  ? "bg-emerald-500 text-neutral-900"
                  : ""
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setModeFilter("sentence")}
              className={`px-2 py-0.5 rounded-full ${
                modeFilter === "sentence"
                  ? "bg-emerald-500 text-neutral-900"
                  : ""
              }`}
            >
              Sentence
            </button>
            <button
              type="button"
              onClick={() => setModeFilter("words")}
              className={`px-2 py-0.5 rounded-full ${
                modeFilter === "words"
                  ? "bg-emerald-500 text-neutral-900"
                  : ""
              }`}
            >
              Words
            </button>
          </div>

          {/* clear เฉพาะ local */}
          {source === "local" && (
            <button
              type="button"
              onClick={handleClear}
              className={`text-xs px-3 py-1 rounded-full ${themeClasses.buttonDanger}`}
            >
              Clear local
            </button>
          )}

          <button
            type="button"
            onClick={onBack}
            className={`text-xs px-3 py-1 rounded-full ${themeClasses.buttonGhost}`}
          >
            Back
          </button>
        </div>
      </div>
      
      {/* cloud status message */}
      {source === "cloud" && (
        <div className="text-[11px] mb-1">
          {!isLoggedIn && (
            <p className="text-red-400">
              You are in guest mode. Please sign in to view cloud stats.
            </p>
          )}
          {isLoggedIn && cloudLoading && (
            <p className={themeClasses.textMuted}>
              Loading cloud stats from Supabase...
            </p>
          )}
          {isLoggedIn && cloudError && (
            <p className="text-red-400">
              Failed to load cloud stats: {cloudError}
            </p>
          )}
        </div>
      )}

      {totalRuns === 0 ? (
        <p className={themeClasses.textMuted}>
          No runs recorded for this filter. Play a few tests
          and come back to see your progress.
        </p>
      ) : (
        <>
          {/* summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div
              className={`rounded-xl border ${themeClasses.border} px-4 py-3`}
            >
              <div className="text-xs uppercase tracking-wide mb-1">
                Total runs
              </div>
              <div className="text-2xl font-semibold">
                {totalRuns}
              </div>
              <div className={`text-[11px] mt-1 ${themeClasses.textMuted}`}>
                Filter: {modeFilter === "all" ? "All modes" : modeFilter}
              </div>
            </div>
            <div
              className={`rounded-xl border ${themeClasses.border} px-4 py-3`}
            >
              <div className="text-xs uppercase tracking-wide mb-1">
                Best WPM
              </div>
              <div className="text-2xl font-semibold">
                {Math.round(bestWpm)}
              </div>
            </div>
            <div
              className={`rounded-xl border ${themeClasses.border} px-4 py-3`}
            >
              <div className="text-xs uppercase tracking-wide mb-1">
                Average
              </div>
              <div className="text-sm">
                <div>
                  WPM:{" "}
                  <span className="font-semibold">
                    {avgWpm.toFixed(1)}
                  </span>
                </div>
                <div>
                  Accuracy:{" "}
                  <span className="font-semibold">
                    {avgAccuracy.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* WPM trend chart */}
          <div
            className={`mt-4 rounded-xl border ${themeClasses.border} px-4 py-3`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold uppercase tracking-wide">
                WPM over time
              </div>
              <div className={`text-[11px] ${themeClasses.textMuted}`}>
                Showing last {chartData.length} runs
              </div>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 16, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="index"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                    }}
                    formatter={(value, name) => {
                      if (name === "wpm") return [`${value} WPM`, "WPM"];
                      return [value, name];
                    }}
                    labelFormatter={(_, payload) =>
                      payload && payload[0]
                        ? (payload[0].payload as any).label
                        : ""
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="wpm"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* recent runs table */}
          <div
            className={`mt-4 rounded-xl border ${themeClasses.border} overflow-hidden`}
          >
            <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide border-b border-neutral-700/40">
              Recent runs
            </div>
            <div className="max-h-72 overflow-auto text-xs md:text-sm">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b border-neutral-700/40">
                    <th className="text-left px-4 py-2">
                      Date
                    </th>
                    <th className="text-left px-2 py-2">
                      Mode
                    </th>
                    <th className="text-right px-2 py-2">
                      WPM
                    </th>
                    <th className="text-right px-2 py-2">
                      Accuracy
                    </th>
                    <th className="text-right px-2 py-2 hidden md:table-cell">
                      Time
                    </th>
                    <th className="text-right px-4 py-2 hidden md:table-cell">
                      Keystrokes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-neutral-700/20 last:border-b-0"
                    >
                      <td className="px-4 py-2 whitespace-nowrap">
                        {new Date(
                          s.createdAt
                        ).toLocaleString()}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        {s.mode === "sentence"
                          ? "Sentence · 1 sentence"
                          : s.duration != null
                            ? `Words · ${s.duration}s`
                            : s.wordCount != null
                              ? `Words · ${s.wordCount}`
                              : "Words"}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {Math.round(s.wpm)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {s.accuracy.toFixed(1)}%
                      </td>
                      <td className="px-2 py-2 text-right hidden md:table-cell">
                        {s.elapsed.toFixed(1)}s
                      </td>
                      <td className="px-4 py-2 text-right hidden md:table-cell">
                        {s.typed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
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
  duration,
  startTime,
}: {
  target: string;
  typed: string;
  duration?: number;
  startTime: number | null;
}) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!startTime) return;

    const id = setInterval(() => {
      setNow(Date.now());
    }, 100);

    return () => clearInterval(id);
  }, [startTime]);

  const elapsedMs = startTime !== null ? now - startTime : 0;
  const elapsed = elapsedMs / 1000;
  const minutes = elapsed / 60;

  const correct = countCorrectChars(typed, target);
  const wpm = minutes > 0 ? (correct / 5) / minutes : 0;
  const accuracy =
    typed.length > 0 ? (correct / typed.length) * 100 : 100;

  const remaining =
    duration != null ? Math.max(duration - elapsed, 0) : null;

  return { elapsed, wpm, accuracy, remaining };
}

function TimedWordsTarget({
  themeClasses,
  target,
  typed,
}: {
  themeClasses: any;
  target: string;
  typed: string;
}) {
  // แบ่ง target เป็นคำ
  const words = target.split(" ");

  type WordMeta = { word: string; start: number; end: number };
  const meta: WordMeta[] = [];
  let idx = 0;

  for (const w of words) {
    const start = idx;
    const end = start + w.length;
    meta.push({ word: w, start, end });
    idx = end + 1; // +1 เผื่อ space ระหว่างคำ
  }

  if (meta.length === 0) {
    return <div className="font-mono" />;
  }

  const caretIndex = typed.length; // caret = index global ของ char ถัดไป

  // ---- กำหนดบรรทัดจากจำนวน "ตัวอักษร" ----
  const MAX_CHARS_PER_LINE = 55; // ✅ ปรับตัวนี้ให้ตรงกับความกว้างกล่อง
  const LINES_VISIBLE = 5;       // แสดงกี่บรรทัด
  const CENTER_OFFSET = Math.floor(LINES_VISIBLE / 2);

  type LineRange = { start: number; end: number };
  const allLines: LineRange[] = [];

  // สร้างบรรทัดเรียงตามตัวอักษร (ใช้ index จริงใน target)
  let lineStart = meta[0].start;
  let lastEnd = meta[0].end;

  for (let i = 1; i < meta.length; i++) {
    const m = meta[i];
    const candidateEnd = m.end;
    const candidateLen = candidateEnd - lineStart; // ความยาวถ้ารวมคำนี้เข้าไปด้วย

    if (candidateLen > MAX_CHARS_PER_LINE) {
      // ถ้าเกินความยาวที่กำหนด → ปิดบรรทัดเดิม แล้วเริ่มบรรทัดใหม่ที่คำนี้
      allLines.push({ start: lineStart, end: lastEnd });

      lineStart = m.start;
      lastEnd = m.end;
    } else {
      // ยังอยู่บรรทัดเดียวกันได้
      lastEnd = candidateEnd;
    }
  }

  // push บรรทัดสุดท้าย
  allLines.push({ start: lineStart, end: lastEnd });

  // หา "บรรทัดที่ caret อยู่"
  let currentLineIndex = 0;
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    if (caretIndex <= line.end + 1) {
      currentLineIndex = i;
      break;
    }
    currentLineIndex = i;
  }

  // window รอบบรรทัดปัจจุบัน (ให้บรรทัดนี้อยู่กลาง ๆ)
  const totalLines = allLines.length;
  let startLine = Math.max(0, currentLineIndex - CENTER_OFFSET);
  if (startLine + LINES_VISIBLE > totalLines) {
    startLine = Math.max(0, totalLines - LINES_VISIBLE);
  }
  const endLine = Math.min(totalLines, startLine + LINES_VISIBLE);

  const visibleLines = allLines.slice(startLine, endLine);

  return (
    <LinesWindow
      themeClasses={themeClasses}
      target={target}
      typed={typed}
      lines={visibleLines}
    />
  );
}

function LinesWindow({
  themeClasses,
  target,
  typed,
  lines,
}: {
  themeClasses: any;
  target: string;
  typed: string;
  lines: { start: number; end: number }[];
}) {
  return (
    <div className="font-mono text-center">
      {lines.map((line, lineIdx) => {
        const slice = target.slice(line.start, line.end);
        const chars = slice.split("");

        return (
          <div key={lineIdx}>
            {chars.map((ch, idx) => {
              const globalIndex = line.start + idx; // index จริงใน target/typed
              const typedChar = typed[globalIndex];

              let cls = themeClasses.remaining;

              if (typedChar != null) {
                cls =
                  typedChar === ch
                    ? themeClasses.correct
                    : themeClasses.incorrect;
              }

              const isCaret =
                globalIndex === typed.length &&
                typed.length < target.length;

              const classes = [
                cls,
                isCaret ? "border-b-2 border-emerald-400 animate-pulse" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <span key={globalIndex} className={classes}>
                  {ch}
                </span>
              );
            })}
          </div>
        );
      })}

      {typed.length >= target.length && target.length > 0 && (
        <span className="inline-block w-0.5 h-5 align-middle bg-emerald-400 animate-pulse ml-0.5" />
      )}
    </div>
  );
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
    <div className="font-mono text-center">
      {chars.map((ch, idx) => {
        const typedChar = typed[idx];

        let cls = themeClasses.remaining;

        if (typedChar != null) {
          cls =
            typedChar === ch
              ? themeClasses.correct
              : themeClasses.incorrect;
        }

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

      {typed.length >= target.length && target.length > 0 && (
        <span className="inline-block w-0.5 h-5 align-middle bg-emerald-400 animate-pulse ml-0.5" />
      )}
    </div>
  );
}

