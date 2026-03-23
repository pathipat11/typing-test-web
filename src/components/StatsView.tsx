/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import type { ScoreEntry } from "@/hooks/useScores";
import type { ThemeClasses } from "@/lib/types";
import { StatCard } from "./StatCard";
import {
    LineChart, Line, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid,
} from "recharts";

export function StatsView({ themeClasses, localScores, cloudScores, onBack, clearLocalScores, isLoggedIn, cloudLoading, cloudError }: {
    themeClasses: ThemeClasses; localScores: ScoreEntry[]; cloudScores: ScoreEntry[];
    onBack: () => void; clearLocalScores: () => void;
    isLoggedIn: boolean; cloudLoading: boolean; cloudError: string | null;
}) {
    const [modeFilter, setModeFilter] = useState<"all" | "sentence" | "words">("all");
    const [source, setSource] = useState<"local" | "cloud">("local");

    const baseScores = source === "local" ? localScores : cloudScores;
    const filteredByMode = modeFilter === "all" ? baseScores : baseScores.filter((s) => s.mode === modeFilter);

    const trendSorted = [...filteredByMode].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const chartData = trendSorted.slice(-50).map((s, idx) => ({
        index: idx + 1, wpm: Math.round(s.wpm),
        label: new Date(s.createdAt).toLocaleString(),
    }));

    const totalRuns = filteredByMode.length;
    const bestWpm = totalRuns > 0 ? Math.max(...filteredByMode.map((s) => s.wpm)) : 0;
    const avgWpm = totalRuns > 0 ? filteredByMode.reduce((sum, s) => sum + s.wpm, 0) / totalRuns : 0;
    const avgAccuracy = totalRuns > 0 ? filteredByMode.reduce((sum, s) => sum + s.accuracy, 0) / totalRuns : 0;

    const sorted = [...filteredByMode].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const recent = sorted.slice(0, 20);

    function handleClear() {
        if (window.confirm("Clear all local scores? This cannot be undone.")) clearLocalScores();
    }

    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.key === "Escape") { e.preventDefault(); onBack(); }
        }
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [onBack]);

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-xl font-semibold">📊 Stats & History</h2>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className={`flex text-xs rounded-full border ${themeClasses.border} px-1 py-0.5 overflow-hidden`}>
                        <button type="button" onClick={() => setSource("local")}
                            className={`px-2 py-0.5 rounded-full transition-all ${source === "local" ? "bg-sky-500 text-white" : ""}`}>
                            Local
                        </button>
                        <button type="button" onClick={() => setSource("cloud")} disabled={!isLoggedIn}
                            className={`px-2 py-0.5 rounded-full transition-all ${source === "cloud" ? "bg-sky-500 text-white" : ""} disabled:opacity-40`}>
                            Cloud
                        </button>
                    </div>
                    <div className={`flex text-xs rounded-full border ${themeClasses.border} px-1 py-0.5 overflow-hidden`}>
                        {(["all", "sentence", "words"] as const).map((m) => (
                            <button key={m} type="button" onClick={() => setModeFilter(m)}
                                className={`px-2 py-0.5 rounded-full capitalize transition-all ${modeFilter === m ? "bg-emerald-500 text-white" : ""}`}>
                                {m}
                            </button>
                        ))}
                    </div>
                    {source === "local" && (
                        <button type="button" onClick={handleClear}
                            className={`text-xs px-3 py-1 rounded-full ${themeClasses.buttonDanger}`}>Clear</button>
                    )}
                    <button type="button" onClick={onBack}
                        className={`text-xs px-3 py-1 rounded-full ${themeClasses.buttonGhost}`}>← Back</button>
                </div>
            </div>

            {source === "cloud" && (
                <div className="text-[11px]">
                    {!isLoggedIn && <p className="text-red-400">Sign in to view cloud stats.</p>}
                    {isLoggedIn && cloudLoading && <p className={themeClasses.textMuted}>Loading...</p>}
                    {isLoggedIn && cloudError && <p className="text-red-400">Error: {cloudError}</p>}
                </div>
            )}

            {totalRuns === 0 ? (
                <p className={themeClasses.textMuted}>No runs recorded yet. Play some tests and come back.</p>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <StatCard themeClasses={themeClasses} label="Total runs" value={String(totalRuns)} />
                        <StatCard themeClasses={themeClasses} label="Best WPM" value={String(Math.round(bestWpm))} />
                        <div className={`rounded-xl border ${themeClasses.border} px-3 py-3`}>
                            <div className={`text-[11px] uppercase tracking-wide ${themeClasses.textMuted}`}>Average</div>
                            <div className="text-sm mt-1">
                                WPM: <span className="font-semibold">{avgWpm.toFixed(1)}</span>
                                {" · "}
                                Acc: <span className="font-semibold">{avgAccuracy.toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>

                    {chartData.length > 1 && (
                        <div className={`rounded-xl border ${themeClasses.border} px-4 py-3`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-xs font-semibold uppercase tracking-wide">WPM over time</div>
                                <div className={`text-[11px] ${themeClasses.textMuted}`}>Last {chartData.length} runs</div>
                            </div>
                            <div className="h-56 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData} margin={{ top: 5, right: 16, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                        <XAxis dataKey="index" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
                                        <Tooltip contentStyle={{ fontSize: 12 }}
                                            formatter={(value, name) => name === "wpm" ? [`${value} WPM`, "WPM"] : [value, name]}
                                            labelFormatter={(_, payload) => payload?.[0] ? (payload[0].payload as any).label : ""} />
                                        <Line type="monotone" dataKey="wpm" stroke="#22c55e" strokeWidth={2}
                                            dot={{ r: 2 }} activeDot={{ r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    <div className={`rounded-xl border ${themeClasses.border} overflow-hidden`}>
                        <div className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide border-b ${themeClasses.border}`}>
                            Recent runs
                        </div>
                        <div className="max-h-72 overflow-auto scrollbar-hide text-xs md:text-sm">
                            <table className="min-w-full border-collapse">
                                <thead>
                                    <tr className={`border-b ${themeClasses.border}`}>
                                        <th className="text-left px-4 py-2">Date</th>
                                        <th className="text-left px-2 py-2">Mode</th>
                                        <th className="text-right px-2 py-2">WPM</th>
                                        <th className="text-right px-2 py-2">Accuracy</th>
                                        <th className="text-right px-2 py-2 hidden md:table-cell">Time</th>
                                        <th className="text-right px-4 py-2 hidden md:table-cell">Keys</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recent.map((s) => (
                                        <tr key={s.id} className={`border-b ${themeClasses.border} last:border-b-0`}>
                                            <td className="px-4 py-2 whitespace-nowrap">{new Date(s.createdAt).toLocaleString()}</td>
                                            <td className="px-2 py-2 whitespace-nowrap">
                                                {s.mode === "sentence" ? "Sentence"
                                                    : s.duration != null ? `Words · ${s.duration}s`
                                                        : s.wordCount != null ? `Words · ${s.wordCount}`
                                                            : "Words"}
                                            </td>
                                            <td className="px-2 py-2 text-right font-semibold">{Math.round(s.wpm)}</td>
                                            <td className="px-2 py-2 text-right">{s.accuracy.toFixed(1)}%</td>
                                            <td className="px-2 py-2 text-right hidden md:table-cell">{s.elapsed.toFixed(1)}s</td>
                                            <td className="px-4 py-2 text-right hidden md:table-cell">{s.typed}</td>
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
