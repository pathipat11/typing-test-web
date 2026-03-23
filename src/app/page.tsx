/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useScores } from "@/hooks/useScores";
import type { ScoreEntry } from "@/hooks/useScores";
import type { User } from "@supabase/supabase-js";
import { buildTheme } from "@/lib/types";
import type { Config, FinishedStats, View } from "@/lib/types";

import { AuthBox } from "@/components/AuthBox";
import { MenuView } from "@/components/MenuView";
import { SentenceConfigView, WordsConfigView } from "@/components/ConfigViews";
import { TypingTestView } from "@/components/TypingTestView";
import { ResultView } from "@/components/ResultView";
import { StatsView } from "@/components/StatsView";

export default function HomePage() {
  const [view, setView] = useState<View>("menu");
  const [config, setConfig] = useState<Config | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [cloudScores, setCloudScores] = useState<ScoreEntry[]>([]);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [finalStats, setFinalStats] = useState<FinishedStats | null>(null);

  const { scores, addScore, getBestForConfig, clearScores } = useScores();

  // auth state
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showAuthBox, setShowAuthBox] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // check auth on mount
  useEffect(() => {
    let ignore = false;
    async function checkUser() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (ignore) return;
        if (!error && data.user) setUser(data.user);
      } catch (err) { console.error("getUser error", err); }
      finally { if (!ignore) setAuthChecked(true); }
    }
    checkUser();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => { ignore = true; sub.subscription.unsubscribe(); };
  }, []);

  // load cloud scores
  useEffect(() => {
    if (!user) { setCloudScores([]); setCloudError(null); return; }
    let cancelled = false;
    async function load() {
      setCloudLoading(true); setCloudError(null);
      try {
        const { data, error } = await supabase.from("typing_runs").select("*")
          .eq("user_id", user!.id).order("created_at", { ascending: true });
        if (cancelled) return;
        if (error) { setCloudError(error.message); setCloudScores([]); return; }
        setCloudScores((data ?? []).map((r: any) => ({
          id: r.id, mode: r.mode, duration: r.duration, wordCount: r.word_count,
          wpm: r.wpm, accuracy: r.accuracy, elapsed: r.elapsed, typed: r.typed,
          correct: r.correct, createdAt: r.created_at,
        })));
      } catch (err) {
        if (!cancelled) setCloudError(err instanceof Error ? err.message : "Unknown error");
      } finally { if (!cancelled) setCloudLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  const bestForCurrentConfig = useMemo(() => {
    if (!config) return undefined;
    if (config.mode === "sentence") return getBestForConfig("sentence", null, null);
    return getBestForConfig("words", config.duration ?? null, config.wordCount ?? null);
  }, [config, getBestForConfig]);

  const themeClasses = useMemo(() => buildTheme(theme === "dark"), [theme]);
  const toggleTheme = () => setTheme((p) => (p === "dark" ? "light" : "dark"));

  function startTest(c: Config) { setConfig(c); setView("test"); setFinalStats(null); }

  async function handleTestFinished(stats: FinishedStats) {
    setFinalStats(stats);
    addScore({
      mode: stats.mode, duration: stats.duration ?? null,
      wordCount: stats.wordCount ?? null, wpm: stats.wpm,
      accuracy: stats.accuracy, elapsed: stats.elapsed,
      typed: stats.typed, correct: stats.correct,
    });
    if (user) {
      try {
        const { data, error } = await supabase.from("typing_runs").insert({
          user_id: user!.id, mode: stats.mode,
          duration: stats.duration ?? null, word_count: stats.wordCount ?? null,
          wpm: stats.wpm, accuracy: stats.accuracy, elapsed: stats.elapsed,
          typed: stats.typed, correct: stats.correct,
        }).select("*").single();
        if (!error && data) {
          setCloudScores((prev) => [...prev, {
            id: data.id, mode: data.mode, duration: data.duration,
            wordCount: data.word_count, wpm: data.wpm, accuracy: data.accuracy,
            elapsed: data.elapsed, typed: data.typed, correct: data.correct,
            createdAt: data.created_at,
          }]);
        }
      } catch (err) { console.error("Failed to save to Supabase", err); }
    }
    setView("result");
  }

  async function handleAuth(mode: "signin" | "signup") {
    setAuthLoading(true); setAuthError(null);
    try {
      if (!authEmail || !authPassword) { setAuthError("กรุณากรอกอีเมลและรหัสผ่าน"); return; }
      if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) setAuthError(error.message);
        else { setUser(data.user ?? data.session?.user ?? null); setShowAuthBox(false); }
      } else {
        const { data, error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
        if (error) setAuthError(error.message);
        else {
          const u = data.user ?? data.session?.user ?? null;
          if (u) { try { await supabase.from("profiles").insert({ id: u.id, email: u.email }); } catch { } }
          setUser(u); setShowAuthBox(false);
        }
      }
    } catch (err: any) { setAuthError(err?.message ?? "Unknown error"); }
    finally { setAuthLoading(false); }
  }

  async function handleSignOut() {
    try { await supabase.auth.signOut(); setUser(null); } catch { }
  }

  return (
    <main className={`min-h-screen ${themeClasses.bg} ${themeClasses.text} flex items-center justify-center px-4 py-6`}>
      <div className="w-full max-w-3xl">
        {/* top bar */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h1 className={`text-xl font-semibold ${themeClasses.accent} cursor-pointer`}
            onClick={() => setView("menu")}>
            ⌨ Typing Test
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`hidden sm:inline text-[11px] ${themeClasses.textMuted}`}>
              {authChecked ? (user ? user.email : "Guest") : "..."}
            </span>
            <button type="button" onClick={() => setView("stats")}
              className={`text-xs px-3 py-1 rounded-full border ${themeClasses.border} ${themeClasses.buttonGhost}`}>
              📊 Stats
            </button>
            <button type="button" onClick={toggleTheme}
              className={`text-xs px-3 py-1 rounded-full border ${themeClasses.border} ${themeClasses.buttonGhost}`}>
              {theme === "dark" ? "🌙" : "☀️"}
            </button>
            {user ? (
              <button type="button" onClick={handleSignOut}
                className={`text-xs px-3 py-1 rounded-full border ${themeClasses.border} ${themeClasses.buttonDanger}`}>
                Logout
              </button>
            ) : (
              <button type="button" onClick={() => setShowAuthBox((v) => !v)}
                className={`text-xs px-3 py-1 rounded-full border ${themeClasses.border} ${themeClasses.buttonPrimary}`}>
                {showAuthBox ? "Close" : "Login"}
              </button>
            )}
          </div>
        </div>

        {showAuthBox && !user && (
          <AuthBox themeClasses={themeClasses} authEmail={authEmail} authPassword={authPassword}
            authLoading={authLoading} authError={authError}
            onEmailChange={setAuthEmail} onPasswordChange={setAuthPassword}
            onAuth={handleAuth} onClose={() => setShowAuthBox(false)} />
        )}

        <div className={`rounded-2xl shadow-lg p-6 md:p-8 ${themeClasses.card} border ${themeClasses.border} animate-fade-in`}>
          {view === "menu" && (
            <MenuView themeClasses={themeClasses}
              onSelectSentence={() => startTest({ mode: "sentence" })}
              onSelectTimedWords={() => setView("config-sentence")}
              onSelectWords={() => setView("config-words")} />
          )}
          {view === "config-sentence" && (
            <SentenceConfigView themeClasses={themeClasses} onBack={() => setView("menu")}
              onStart={(d) => startTest({ mode: "words", duration: d })} />
          )}
          {view === "config-words" && (
            <WordsConfigView themeClasses={themeClasses} onBack={() => setView("menu")}
              onStart={(wc) => startTest({ mode: "words", wordCount: wc })} />
          )}
          {view === "test" && config && (
            <TypingTestView themeClasses={themeClasses} config={config}
              onExitToMenu={() => setView("menu")} onFinished={handleTestFinished} />
          )}
          {view === "result" && finalStats && config && (
            <ResultView themeClasses={themeClasses} stats={finalStats}
              best={bestForCurrentConfig}
              onRetry={() => startTest(config)} onMenu={() => setView("menu")} />
          )}
          {view === "stats" && (
            <StatsView themeClasses={themeClasses} localScores={scores}
              cloudScores={cloudScores} onBack={() => setView("menu")}
              clearLocalScores={clearScores} isLoggedIn={!!user}
              cloudLoading={cloudLoading} cloudError={cloudError} />
          )}
        </div>

        <footer className={`text-center text-[11px] mt-4 ${themeClasses.textMuted}`}>
          Tab to restart · Esc to exit · Built with Next.js + Supabase
        </footer>
      </div>
    </main>
  );
}
