/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";

export type Mode = "sentence" | "words";

export interface ScoreEntry {
    id: string;
    mode: Mode;
    duration?: number | null;   // sentence
    wordCount?: number | null;  // words
    wpm: number;
    accuracy: number;
    elapsed: number;
    typed: number;
    correct: number;
    createdAt: string;          // ISO string
}

const STORAGE_KEY = "typing-test-scores-v1";

export function useScores() {
    const [scores, setScores] = useState<ScoreEntry[]>([]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const data = JSON.parse(raw);
            if (Array.isArray(data)) {
                setScores(data);
            }
        } catch (err) {
            console.error("Failed to load scores", err);
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
        } catch (err) {
            console.error("Failed to save scores", err);
        }
    }, [scores]);

    function addScore(
        entry: Omit<ScoreEntry, "id" | "createdAt">
    ): ScoreEntry {
        const full: ScoreEntry = {
            ...entry,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
        };
        setScores((prev) => [...prev, full]);
        return full;
    }

    function getBestForConfig(
        mode: Mode,
        duration?: number | null,
        wordCount?: number | null
    ): ScoreEntry | undefined {
        const filtered = scores.filter((s) => {
            if (s.mode !== mode) return false;
            if (mode === "sentence") {
                return s.duration === duration;
            }
            if (mode === "words") {
                return s.wordCount === wordCount;
            }
            return false;
        });

        if (!filtered.length) return undefined;
        return filtered.reduce((best, cur) =>
            cur.wpm > best.wpm ? cur : best
        );
    }

    return { scores, addScore, getBestForConfig };
}
