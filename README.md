# Typing Test (Next.js + Supabase)

Interactive typing test web app built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase**.
Supports guest mode (local storage) and signed-in mode (cloud sync) with multiple test modes and detailed stats.

---

## Features

### 🎮 Typing Modes

* **Sentence mode**

  * Random sentence from a predefined list
  * Test ends when you finish typing the sentence
* **Words mode (timed)**

  * Choose duration: **15 / 30 / 60 seconds**
  * Random words, test ends automatically when timer reaches zero
* **Words mode (fixed count)**

  * Choose word count: **25 / 50 / 100 words**
  * Test ends when you finish all characters in the generated word sequence

### 📊 Stats & History

* Local scores stored in **`localStorage`** using `useScores` hook
* Optional cloud sync using **Supabase** (`typing_runs` table)
* **Stats page**:

  * Filter by **source**: `Local` or `Cloud`
  * Filter by **mode**: `All`, `Sentence`, `Words`
  * Summary cards:

    * Total runs
    * Best WPM
    * Average WPM & Accuracy
  * WPM trend chart (using **Recharts**) for the last 50 runs
  * Recent runs table (up to 20 latest runs)
* Clear local history (button: **“Clear local”**)

### 👤 Authentication (Supabase)

* Guest mode (no login required)
* **Email + password** login/signup via Supabase Auth
* After signup, a **profile row** is created in `profiles` table:

  * `id` = Supabase user id
  * `email`
* When logged in:

  * New test runs are stored in Supabase (`typing_runs` table)
  * Stats page can show **cloud data**

### 🎵 Typing Sounds (NK Cream-style)

* Typing sound feedback similar to NK Cream in monkeytype
* Uses custom hook: `useTypingSound`
* Sound files stored under:

  * `public/sounds/cream/cream1.wav`
  * `public/sounds/cream/cream2.wav`
  * `public/sounds/cream/cream3.wav`
  * `public/sounds/cream/cream4.wav`
* (Optional) Original sound pack includes `config.json` that maps **key codes** → specific `.wav` files
* Sound behavior:

  * Plays on keydown
  * Distinguishes some special keys (e.g. `Backspace`, `Tab`) based on keyCode mapping

### 🎨 UI / UX

* Dark / Light theme toggle (`Theme: Dark / Light`)
* Minimal, center layout with max width `max-w-3xl`
* Top bar:

  * App title: **Typing Test**
  * Auth info: `Signed in as <email>` or `Guest mode`
  * Buttons: `Stats`, `Theme`, `Login / Sign up` or `Logout`
* Test view:

  * Live **WPM**, **Accuracy**, **Time** display
  * Caret highlighting & colored characters:

    * Correct chars → green
    * Incorrect chars → red
    * Remaining chars → muted
* **Keyboard shortcuts**:

  * `ESC` → exit test and go back to menu
  * `Tab` → regenerate text (new sentence or new words sequence)

---

## Tech Stack

* **Framework**: Next.js (App Router)
* **Language**: TypeScript
* **Styling**: Tailwind CSS + some basic classes
* **Charts**: Recharts (`LineChart`, `ResponsiveContainer`, etc.)
* **Auth & DB**: Supabase
* **Storage**: `localStorage` for local scores

---

## Project Structure (relevant parts)

```txt
src/
  app/
    page.tsx              # Main page: routing between views, auth, stats, test modes
  hooks/
    useScores.ts          # Local scores (localStorage), getBestForConfig, clearScores
    useTypingSound.ts     # Typing sound hook
  lib/
    typingData.ts         # SENTENCES + buildWordsText(...) for generating text
    supabaseClient.ts     # Supabase client configuration
public/
  sounds/
    cream/
      cream1.wav
      cream2.wav
      cream3.wav
      cream4.wav
  sound/
    config.json           # (Optional) original sound pack mapping key codes → wav files
```

> Note: File paths under `public/` are available at `/sounds/...` URLs in the browser.

---

## Environment Setup

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd <your-repo-folder>

npm install
# or
pnpm install
# or
yarn install
```

### 2. Supabase Configuration

Create a project on [Supabase](https://supabase.com/) and then:

* Go to **Project Settings → API**
* Copy:

  * `Project URL`
  * `anon` public key

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

`supabaseClient.ts` should use these env vars, for example:

```ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 3. Database Schema (Supabase)

You will need at least **two tables**: `profiles` and `typing_runs`.

#### `profiles`

* `id`: `uuid`, primary key, **same as `auth.users.id`**
* `email`: `text`
* (optional) `display_name`, `avatar_url`, etc.

Example SQL:

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamp with time zone default now()
);
```

#### `typing_runs`

* `id`: `uuid`, primary key (can be `default uuid_generate_v4()`)
* `user_id`: `uuid` (references `auth.users.id`)
* `mode`: `text` (`"sentence"` or `"words"`)
* `duration`: `int` (nullable) — for **timed words** mode
* `word_count`: `int` (nullable) — for **fixed words** mode
* `wpm`: `numeric`
* `accuracy`: `numeric`
* `elapsed`: `numeric` (seconds)
* `typed`: `int` — total keystrokes
* `correct`: `int` — number of correct characters
* `created_at`: `timestamp` with time zone, default `now()`

Example SQL:

```sql
create table if not exists public.typing_runs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users (id) on delete cascade,
  mode text not null,
  duration integer,
  word_count integer,
  wpm numeric not null,
  accuracy numeric not null,
  elapsed numeric not null,
  typed integer not null,
  correct integer not null,
  created_at timestamp with time zone default now()
);
```

Make sure you configure **Row Level Security (RLS)** on `typing_runs` so that:

* Users can **insert** their own runs
* Users can **select** only rows where `user_id = auth.uid()`

Example policy (Supabase UI → Table Editor → typing_runs → Policies):

```sql
create policy "Users can insert their own runs"
  on public.typing_runs for insert
  with check (auth.uid() = user_id);

create policy "Users can select their own runs"
  on public.typing_runs for select
  using (auth.uid() = user_id);
```

---

## Development

Run the dev server:

```bash
npm run dev
# or
pnpm dev
# or
yarn dev
```

Then open:

```text
http://localhost:3000
```

You should see the **Typing Test** main screen with:

* `Sentence mode (1 sentence)`
* `Words mode (timed)`
* `Words mode (25 / 50 / 100)`

Sound files under `public/sounds/cream` will be automatically accessible.

---

## Build & Deploy

### Local production build

```bash
npm run build
npm start
```

### Deploy on Vercel

1. Push your repo to GitHub/GitLab
2. Import the project on [Vercel](https://vercel.com/)
3. In **Project Settings → Environment Variables**, add:

   * `NEXT_PUBLIC_SUPABASE_URL`
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

Vercel will run:

```bash
npm install
npm run build
```

Make sure your TypeScript errors (especially around `user` possibly `null`) are fixed before deploying.

---

## Hooks & Logic Details

### `useScores` (local scores)

Located in `src/hooks/useScores.ts`:

* Stores scores in `localStorage` under key:

  * `typing-test-scores-v1`
* Score shape (TypeScript type `ScoreEntry`):

```ts
export type Mode = "sentence" | "words";

export interface ScoreEntry {
  id: string;
  mode: Mode;
  duration?: number | null;   // for words (timed)
  wordCount?: number | null;  // for words (fixed)
  wpm: number;
  accuracy: number;
  elapsed: number;
  typed: number;
  correct: number;
  createdAt: string;          // ISO string
}
```

* Exposes:

  * `scores`: all saved runs
  * `addScore(entry)`: append new run
  * `getBestForConfig(mode, duration?, wordCount?)`: best WPM for a given configuration
  * `clearScores()`: clear all local scores

### `useTypingSound`

Located in `src/hooks/useTypingSound.ts`.

* Preloads a small array of Audio objects:

```ts
const files = [
  "/sounds/cream/cream1.wav",
  "/sounds/cream/cream2.wav",
  "/sounds/cream/cream3.wav",
  "/sounds/cream/cream4.wav",
];
```

* Returns a function for playing sound (e.g. `playByKeyCode(...)` or `play()` depending on implementation)
* Called on `onKeyDown` in the typing input to play corresponding sound

### Typing Logic (in `TypingTestView`)

* `target`: full string you have to type
* `typed`: what user actually typed so far
* `startTime`: timestamp when user starts typing first character
* `useTypingStats` hook:

  * Tracks `elapsed` time with `setInterval`
  * Calculates:

    * `wpm`
    * `accuracy`
    * `remaining` time (for timed words)
* End conditions:

  * **Sentence mode**: when `typed.length >= target.length`
  * **Words (timed)**: when `remaining <= 0`
  * **Words (fixed)**: when `typed.length >= target.length`

---

## Keyboard Shortcuts & Behavior

* `ESC`

  * Leave the current test and go back to main menu
  * May play a sound depending on keyCode mapping
* `Tab`

  * Prevents default browser behavior
  * Regenerates new text:

    * Sentence mode → new random sentence
    * Words mode → new random words sequence
  * Resets `typed`, `startTime`, `finished`
* `Backspace`

  * Deletes last character in `typed`
  * Plays corresponding sound file (e.g. `backspace.wav` in the original pack)

---

## Notes & Possible Extensions

* Add user profile customization (display name, avatar)
* Add more modes (numbers, punctuation, code snippets, Thai text, etc.)
* Add per-mode high-score tracking per day/week/month
* Add leaderboard (global or friends) by reading from `typing_runs`
* Add settings page to:

  * Toggle sounds
  * Adjust sound volume
  * Select sound pack

---

## License

You can choose any license for your project (MIT, Apache-2.0, etc.).
Make sure that the NK Cream sound pack you use respects the original creator's license/terms if you plan to make this project public.


*Created by Pathipat Mattra* 