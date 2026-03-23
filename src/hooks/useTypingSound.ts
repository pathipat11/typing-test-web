import { useCallback, useEffect, useRef, useState } from "react";

const SOUND_ENABLED_KEY = "typing-sound-enabled";
const SOUND_VOLUME_KEY = "typing-sound-volume";

type SoundConfig = {
    id: string;
    name: string;
    default: boolean;
    key_define_type: "multi" | string;
    includes_numpad: boolean;
    sound: string;
    defines: Record<string, string | null>;
    tags: string[];
};

export function useTypingSound() {
    const [config, setConfig] = useState<SoundConfig | null>(null);
    const [enabled, setEnabled] = useState(true);
    const [volume, setVolume] = useState(0.5);

    // audio pool for low-latency playback
    const poolRef = useRef<Map<string, HTMLAudioElement[]>>(new Map());

    // load persisted prefs
    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            const savedEnabled = localStorage.getItem(SOUND_ENABLED_KEY);
            if (savedEnabled !== null) setEnabled(savedEnabled === "true");
            const savedVolume = localStorage.getItem(SOUND_VOLUME_KEY);
            if (savedVolume !== null) setVolume(parseFloat(savedVolume));
        } catch { /* ignore */ }
    }, []);

    // persist prefs
    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
            localStorage.setItem(SOUND_VOLUME_KEY, String(volume));
        } catch { /* ignore */ }
    }, [enabled, volume]);

    // load sound config
    useEffect(() => {
        let ignore = false;
        async function loadConfig() {
            try {
                const res = await fetch("/sound/config.json");
                if (!res.ok) throw new Error("Failed to load sound config");
                const json = (await res.json()) as SoundConfig;
                if (!ignore) setConfig(json);
            } catch (err) {
                console.error("Failed to load typing sound config:", err);
            }
        }
        loadConfig();
        return () => { ignore = true; };
    }, []);

    const getAudio = useCallback((file: string): HTMLAudioElement => {
        const pool = poolRef.current;
        let arr = pool.get(file);
        if (!arr) { arr = []; pool.set(file, arr); }
        // find a free audio element (ended or not yet played)
        let audio = arr.find((a) => a.ended || a.paused);
        if (!audio) {
            audio = new Audio(`/sound/${file}`);
            arr.push(audio);
        }
        return audio;
    }, []);

    const playByKeyCode = useCallback(
        (keyCode: number | undefined | null) => {
            if (!enabled || !config || keyCode == null) return;
            const file = config.defines[String(keyCode)];
            if (!file) return;
            const audio = getAudio(file);
            audio.volume = volume;
            audio.currentTime = 0;
            audio.play().catch(() => { /* browser autoplay block */ });
        },
        [config, enabled, volume, getAudio]
    );

    const toggleSound = useCallback(() => setEnabled((p) => !p), []);

    return { playByKeyCode, enabled, volume, setVolume, toggleSound };
}
