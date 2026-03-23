/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { SENTENCES, buildWordsText } from "@/lib/typingData";
import type { Mode } from "@/hooks/useScores";
import { useTypingSound } from "@/hooks/useTypingSound";
import type { Config, FinishedStats, ThemeClasses } from "@/lib/types";
import { countCorrectChars } from "@/lib/types";

/* ─── useTypingStats ─── */

function useTypingStats({ target, typed, duration, startTime }: {
    target: string; typed: string; duration?: number; startTime: number | null;
}) {
    const [now, setNow] = useState<number>(() => Date.now());
    useEffect(() => {
        if (!startTime) return;
        const id = setInterval(() => setNow(Date.now()), 100);
        return () => clearInterval(id);
    }, [startTime]);

    const elapsedMs = startTime !== null ? now - startTime : 0;
    const elapsed = elapsedMs / 1000;
    const minutes = elapsed / 60;
    const correct = countCorrectChars(typed, target);
    const wpm = minutes > 0 ? (correct / 5) / minutes : 0;
    const accuracy = typed.length > 0 ? (correct / typed.length) * 100 : 100;
    const remaining = duration != null ? Math.max(duration - elapsed, 0) : null;
    return { elapsed, wpm, accuracy, remaining };
}

/* ─── Smooth Caret ─── */

function SmoothCaret({ containerRef, charIndex, targetLen }: {
    containerRef: React.RefObject<HTMLDivElement | null>;
    charIndex: number;
    targetLen: number;
}) {
    const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // find the span at charIndex (or last span if at end)
        const spans = container.querySelectorAll<HTMLSpanElement>("span[data-ci]");
        if (spans.length === 0) return;

        let span: HTMLSpanElement;
        let atEnd = false;

        if (charIndex >= targetLen) {
            // caret after last char
            span = spans[spans.length - 1];
            atEnd = true;
        } else {
            span = spans[charIndex] ?? spans[spans.length - 1];
        }

        const containerRect = container.getBoundingClientRect();
        const spanRect = span.getBoundingClientRect();

        setPos({
            left: atEnd
                ? spanRect.right - containerRect.left
                : spanRect.left - containerRect.left,
            top: spanRect.top - containerRect.top,
        });
    }, [charIndex, targetLen, containerRef]);

    if (!pos) return null;

    return (
        <div
            className="absolute w-[2px] bg-emerald-400 rounded-full transition-all duration-75 ease-out pointer-events-none"
            style={{ left: pos.left, top: pos.top, height: "1.5em" }}
        />
    );
}


/* ─── TargetText (sentence / fixed words) ─── */

function TargetText({ themeClasses, target, typed, containerRef }: {
    themeClasses: ThemeClasses; target: string; typed: string;
    containerRef: React.RefObject<HTMLDivElement | null>;
}) {
    return (
        <div className="font-mono text-center relative" ref={containerRef}>
            <SmoothCaret containerRef={containerRef} charIndex={typed.length} targetLen={target.length} />
            {target.split("").map((ch, idx) => {
                const tc = typed[idx];
                let cls = themeClasses.remaining;
                if (tc != null) cls = tc === ch ? themeClasses.correct : themeClasses.incorrect;
                return (
                    <span key={idx} data-ci={idx} className={cls}>
                        {ch}
                    </span>
                );
            })}
        </div>
    );
}

/* ─── TimedWordsTarget (scrolling lines with smooth caret) ─── */

function TimedWordsTarget({ themeClasses, target, typed, containerRef }: {
    themeClasses: ThemeClasses; target: string; typed: string;
    containerRef: React.RefObject<HTMLDivElement | null>;
}) {
    const words = target.split(" ");
    type WordMeta = { word: string; start: number; end: number };
    const meta: WordMeta[] = [];
    let idx = 0;
    for (const w of words) {
        meta.push({ word: w, start: idx, end: idx + w.length });
        idx += w.length + 1;
    }
    if (meta.length === 0) return <div className="font-mono" />;

    const caretIndex = typed.length;
    const MAX_CHARS_PER_LINE = 55;
    const LINES_VISIBLE = 5;
    const CENTER_OFFSET = Math.floor(LINES_VISIBLE / 2);

    type LineRange = { start: number; end: number };
    const allLines: LineRange[] = [];
    let lineStart = meta[0].start;
    let lastEnd = meta[0].end;

    for (let i = 1; i < meta.length; i++) {
        const m = meta[i];
        if (m.end - lineStart > MAX_CHARS_PER_LINE) {
            allLines.push({ start: lineStart, end: lastEnd });
            lineStart = m.start;
            lastEnd = m.end;
        } else {
            lastEnd = m.end;
        }
    }
    allLines.push({ start: lineStart, end: lastEnd });

    let currentLineIndex = 0;
    for (let i = 0; i < allLines.length; i++) {
        if (caretIndex <= allLines[i].end + 1) { currentLineIndex = i; break; }
        currentLineIndex = i;
    }

    let startLine = Math.max(0, currentLineIndex - CENTER_OFFSET);
    if (startLine + LINES_VISIBLE > allLines.length) startLine = Math.max(0, allLines.length - LINES_VISIBLE);
    const endLine = Math.min(allLines.length, startLine + LINES_VISIBLE);
    const visibleLines = allLines.slice(startLine, endLine);

    return (
        <div className="font-mono text-center relative" ref={containerRef}>
            <SmoothCaret containerRef={containerRef} charIndex={typed.length} targetLen={target.length} />
            {visibleLines.map((line, lineIdx) => {
                const slice = target.slice(line.start, line.end);
                return (
                    <div key={lineIdx}>
                        {slice.split("").map((ch, i) => {
                            const gi = line.start + i;
                            const tc = typed[gi];
                            let cls = themeClasses.remaining;
                            if (tc != null) cls = tc === ch ? themeClasses.correct : themeClasses.incorrect;
                            return (
                                <span key={gi} data-ci={gi} className={cls}>
                                    {ch}
                                </span>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
}


/* ═══════════════════════════════════════════════
   TypingTestView — main export
   ═══════════════════════════════════════════════ */

export function TypingTestView({ themeClasses, config, onExitToMenu, onFinished }: {
    themeClasses: ThemeClasses; config: Config; onExitToMenu: () => void;
    onFinished: (stats: FinishedStats) => void;
}) {
    const [target, setTarget] = useState("");
    const [typed, setTyped] = useState("");
    const [startTime, setStartTime] = useState<number | null>(null);
    const [finished, setFinished] = useState(false);
    const [inputFocused, setInputFocused] = useState(false);
    const [capsLock, setCapsLock] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const textContainerRef = useRef<HTMLDivElement | null>(null);
    const wpmHistoryRef = useRef<{ time: number; wpm: number }[]>([]);

    const { playByKeyCode, enabled: soundEnabled, toggleSound } = useTypingSound();

    const resetTest = useCallback(() => {
        if (config.mode === "sentence") {
            setTarget(SENTENCES[Math.floor(Math.random() * SENTENCES.length)]);
        } else {
            setTarget(buildWordsText(config.wordCount ?? 400));
        }
        setTyped("");
        setStartTime(null);
        setFinished(false);
        wpmHistoryRef.current = [];
    }, [config]);

    useEffect(() => { resetTest(); }, [resetTest]);
    useEffect(() => { inputRef.current?.focus(); }, []);

    const { elapsed, wpm, accuracy, remaining } = useTypingStats({
        target, typed,
        duration: config.mode === "words" ? config.duration : undefined,
        startTime,
    });

    // WPM snapshots every second
    useEffect(() => {
        if (!startTime || finished) return;
        const id = setInterval(() => {
            const elSec = (Date.now() - startTime) / 1000;
            const correct = countCorrectChars(typed, target);
            const mins = elSec / 60;
            const w = mins > 0 ? (correct / 5) / mins : 0;
            wpmHistoryRef.current.push({ time: Math.round(elSec), wpm: Math.round(w) });
        }, 1000);
        return () => clearInterval(id);
    }, [startTime, finished, typed, target]);

    // end conditions
    useEffect(() => {
        if (finished || !target || !startTime) return;
        const reachedEnd = typed.length >= target.length;
        const isSentence = config.mode === "sentence";
        const isTimedWords = config.mode === "words" && config.duration != null;
        const isFixedWords = config.mode === "words" && config.wordCount != null && config.duration == null;
        if (isSentence && reachedEnd) { handleFinish(); return; }
        if (isTimedWords && remaining !== null && remaining <= 0) { handleFinish(); return; }
        if (isFixedWords && reachedEnd) { handleFinish(); return; }
    }, [typed, target, remaining, finished, startTime, config]);

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        // Caps Lock detection
        setCapsLock(e.getModifierState("CapsLock"));

        const keyCode = (e as any).keyCode ?? (e as any).which;

        if (e.key === "Tab") {
            e.preventDefault();
            playByKeyCode(keyCode);
            resetTest();
            return;
        }
        if (finished) return;
        if (e.key === "Escape") {
            e.preventDefault();
            playByKeyCode(keyCode);
            onExitToMenu();
            return;
        }
        if (e.key === "Backspace") {
            e.preventDefault();
            if (!typed.length) return;
            playByKeyCode(keyCode);
            setTyped((prev) => prev.slice(0, -1));
            return;
        }
        if (e.key.length > 1) return;
        if (!startTime) setStartTime(Date.now());
        if (typed.length >= target.length) return;
        playByKeyCode(keyCode);
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
        const accVal = typed.length > 0 ? (correctChars / typed.length) * 100 : 100;
        wpmHistoryRef.current.push({ time: Math.round(elapsedSec), wpm: Math.round(wpmVal) });

        let resultDuration: number | undefined;
        let resultWordCount: number | undefined;
        if (config.mode === "words") {
            if (config.duration != null) resultDuration = config.duration;
            if (config.wordCount != null) resultWordCount = config.wordCount;
        }

        onFinished({
            mode: config.mode, duration: resultDuration, wordCount: resultWordCount,
            wpm: wpmVal, accuracy: accVal, elapsed: elapsedSec,
            typed: typed.length, correct: correctChars,
            wpmHistory: [...wpmHistoryRef.current],
        });
    }

    const isTimedWords = config.mode === "words" && config.duration != null;
    const timeLabel = isTimedWords ? "Time left" : "Time";
    const timeValue = isTimedWords
        ? remaining !== null ? `${remaining.toFixed(1)}s` : `${(config.duration ?? 0).toFixed(1)}s`
        : `${elapsed.toFixed(1)}s`;

    let headerLabel = "";
    if (config.mode === "sentence") headerLabel = "📝 Sentence mode";
    else if (config.duration != null) headerLabel = `⏱ Words · ${config.duration}s`;
    else if (config.wordCount != null) headerLabel = `🔢 Words · ${config.wordCount} words`;
    else headerLabel = "Words mode";

    const progress = target.length > 0 ? Math.min((typed.length / target.length) * 100, 100) : 0;

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
                <div className="text-sm">
                    <div className="font-semibold">{headerLabel}</div>
                    <div className={`text-[11px] ${themeClasses.textMuted}`}>Tab → restart · Esc → exit</div>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={toggleSound}
                        className={`text-xs px-2 py-1 rounded-full ${themeClasses.buttonGhost}`}
                        title={soundEnabled ? "Mute sound" : "Unmute sound"}>
                        {soundEnabled ? "🔊" : "🔇"}
                    </button>
                    <button type="button" onClick={onExitToMenu}
                        className={`text-xs px-3 py-1 rounded-full ${themeClasses.buttonGhost}`}>Exit</button>
                </div>
            </div>

            {/* progress bar */}
            <div className={`h-1 rounded-full overflow-hidden ${themeClasses.bg}`}>
                <div className="h-full bg-emerald-500 transition-all duration-150 ease-out rounded-full"
                    style={{ width: `${progress}%` }} />
            </div>

            {/* stats bar */}
            <div className={`flex items-center justify-between text-sm px-3 py-2 rounded-xl border ${themeClasses.border}`}>
                <div><span className="font-semibold">WPM</span>: {Math.round(wpm) || 0}</div>
                <div><span className="font-semibold">Accuracy</span>: {accuracy.toFixed(1)}%</div>
                <div><span className="font-semibold">{timeLabel}</span>: {timeValue}</div>
            </div>

            {/* Caps Lock warning */}
            {capsLock && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs animate-fade-in">
                    <span className="text-base">⚠️</span>
                    <span>Caps Lock is ON</span>
                </div>
            )}

            {/* target text */}
            <div className="min-h-[140px] rounded-xl border px-4 py-3 text-lg leading-relaxed overflow-hidden cursor-text"
                onClick={() => inputRef.current?.focus()}>
                {isTimedWords ? (
                    <TimedWordsTarget themeClasses={themeClasses} target={target} typed={typed} containerRef={textContainerRef} />
                ) : (
                    <TargetText themeClasses={themeClasses} target={target} typed={typed} containerRef={textContainerRef} />
                )}
            </div>

            {/* hidden input */}
            <div className="mt-3 cursor-pointer" onClick={() => inputRef.current?.focus()}>
                <input ref={inputRef} autoFocus value="" onChange={() => { }}
                    onKeyDown={handleKeyDown} onBlur={() => setInputFocused(false)}
                    onFocus={() => setInputFocused(true)}
                    className="opacity-0 h-0 w-0 absolute pointer-events-none" />
                <div className={`text-xs ${inputFocused ? themeClasses.textMuted : "text-red-400 font-medium"}`}>
                    {inputFocused ? "Typing... (Tab to restart, Esc to exit)" : "⚠ Click here to focus and start typing"}
                </div>
            </div>
        </div>
    );
}
