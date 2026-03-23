"use client";

import { useEffect } from "react";
import type { ScoreEntry } from "@/hooks/useScores";
import type { FinishedStats, ThemeClasses } from "@/lib/types";
import { StatCard } from "./StatCard";
import {
    LineChart, Line, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid,
} from "recharts";

export function ResultView({ themeClasses, stats, best, onRetry, onMenu }: {
    themeClasses: ThemeClasses; stats: FinishedStats;
    best?: ScoreEntry; onRetry: () => void; onMenu: () => void;
}) {
    let modeLabel = "";
    if (stats.mode === "sentence") modeLabel = "Sentence";
    else if (stats.duration != null) modeLabel = `Words · ${stats.duration}s`;
    else if (stats.wordCount != null) modeLabel = `Words · ${stats.wordCount} words`;
    else modeLabel = "Words";

    const isNewBest = best && stats.wpm >= best.wpm;

    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.key === "Tab") { e.preventDefault(); onRetry(); }
            if (e.key === "Escape") { e.preventDefault(); onMenu(); }
        }
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [onRetry, onMenu]);

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                    Result {isNewBest && <span className="text-amber-400 text-sm ml-2">🏆 New best!</span>}
                </h2>
                <span className={`text-xs ${themeClasses.textMuted}`}>{modeLabel}</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <StatCard themeClasses={themeClasses} label="WPM" value={String(Math.round(stats.wpm))} />
                <StatCard themeClasses={themeClasses} label="Accuracy" value={`${stats.accuracy.toFixed(1)}%`} />
                <StatCard themeClasses={themeClasses} label="Time" value={`${stats.elapsed.toFixed(1)}s`} />
                <StatCard themeClasses={themeClasses} label="Correct" value={`${stats.correct}/${stats.typed}`} />
            </div>

            {stats.wpmHistory.length > 1 && (
                <div className={`rounded-xl border ${themeClasses.border} px-4 py-3`}>
                    <div className="text-xs font-semibold uppercase tracking-wide mb-2">WPM during this run</div>
                    <div className="h-40 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.wpmHistory} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                                    tickFormatter={(v) => `${v}s`} />
                                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
                                <Tooltip contentStyle={{ fontSize: 12 }}
                                    formatter={(value) => [`${value} WPM`, "WPM"]}
                                    labelFormatter={(v) => `${v}s`} />
                                <Line type="monotone" dataKey="wpm" stroke="#22c55e" strokeWidth={2}
                                    dot={{ r: 2 }} activeDot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {best && (
                <div className={`rounded-xl border ${themeClasses.border} px-4 py-3 text-sm`}>
                    <div className="font-semibold mb-1">Personal best for this mode</div>
                    <div className="flex gap-4 flex-wrap">
                        <span>WPM: {Math.round(best.wpm)}</span>
                        <span>Accuracy: {best.accuracy.toFixed(1)}%</span>
                        <span className={themeClasses.textMuted}>
                            {new Date(best.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>
            )}

            <div className="flex flex-wrap gap-2">
                <button onClick={onRetry}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold ${themeClasses.buttonPrimary}`}>
                    ↻ Retry (Tab)
                </button>
                <button onClick={onMenu}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold ${themeClasses.buttonGhost}`}>
                    ← Menu (Esc)
                </button>
            </div>
        </div>
    );
}
