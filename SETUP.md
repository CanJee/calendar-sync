# Setup Guide

## 1. Google Calendar iCal URLs (yours)

Each Google Calendar has a **secret private iCal URL** that only the URL holder can use. This is different from public sharing — it's a long random URL that you keep private.

**For each of your Google Calendars (work + personal):**

1. Go to [calendar.google.com](https://calendar.google.com)
2. In the left sidebar, hover over the calendar name → click the three dots → **Settings and sharing**
3. Scroll to **"Integrate calendar"**
4. Copy the **"Secret address in iCal format"** — it looks like:
   ```
   https://calendar.google.com/calendar/ical/YOUR_EMAIL%40DOMAIN.com/private-abc123.../basic.ics
   ```
5. Repeat for your second calendar

Paste these into `.env.local` as:
```
GOOGLE_CALENDAR_WORK_ICAL_URL=https://calendar.google.com/...
GOOGLE_CALENDAR_PERSONAL_ICAL_URL=https://calendar.google.com/...
```

---

## 2. Partner's Calendar

Your partner needs to share their **secret iCal address** with you privately.

**They need to do this (takes 30 seconds):**

1. Go to [calendar.google.com](https://calendar.google.com) on their account
2. Click the three dots next to their calendar name → **Settings and sharing**
3. Scroll to **"Integrate calendar"** → **"Secret address in iCal format"**
4. Copy and send you that URL privately (DM, text, etc.)
5. Paste it as `LAILS_PERSONAL_ICAL_URL` in `.env.local`

**Privacy note:** This URL is a secret — only people who have it can read the calendar. They do NOT need to make their calendar public.

---

## 3. Supabase Setup

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **SQL Editor** → paste the contents of `supabase/schema.sql` → Run
4. Go to **Settings → API**:
   - Copy **"Project URL"** → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy **"service_role"** key (the secret one, not anon) → `SUPABASE_SERVICE_ROLE_KEY`

---

## 4. Admin Secret Key

Choose any random string. This is the password for the admin view at `/admin`.

```
ADMIN_SECRET_KEY=pick-something-long-and-random-here
```

---

## 5. Create .env.local

Copy the example and fill in values:

```bash
cp .env.example .env.local
# then edit .env.local with your values
```

---

## 6. Run Locally

```bash
npm install
npm run dev
# App runs at http://localhost:3000
```

---

## 7. Deploy to Vercel

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project → import the repo
3. In Vercel project settings → **Environment Variables** → add all the variables from `.env.local`
4. Deploy — you get a public URL like `https://your-project.vercel.app`

Share that URL with friends/family for booking.
The `/admin` page is for your eyes only (protected by the admin key).
