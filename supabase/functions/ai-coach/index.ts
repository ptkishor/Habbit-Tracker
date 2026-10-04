/**
 * Supabase Edge Function: ai-coach
 * ─────────────────────────────────────────────────────────────
 * Receives aggregated habit analytics from the frontend,
 * calls Google Gemini API, and returns an AI-generated review.
 *
 * Deploy: supabase functions deploy ai-coach
 * Secret:  supabase secrets set GEMINI_API_KEY=your_key_here
 * ─────────────────────────────────────────────────────────────
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY secret is not set. Run: supabase secrets set GEMINI_API_KEY=...')
    }

    // Parse payload from frontend
    const payload = await req.json()
    const { days, habits, streaks, weekday_pattern, correlations, privacy_mode } = payload

    // Build a concise data summary for the prompt
    const habitSummary = habits
      .map((h: { habit_name: string; pct: number; completed_days: number; total_days: number }) =>
        `  - ${h.habit_name}: ${h.pct}% (${h.completed_days}/${h.total_days} days)`
      )
      .join('\n')

    const daysPctStr = days
      .slice(-7)
      .map((d: { date: string; pct: number }) => `${d.date}: ${d.pct}%`)
      .join(', ')

    const weekdayStr = Object.entries(weekday_pattern)
      .map(([d, p]) => `${d}:${p}%`)
      .join(', ')

    const corrStr = correlations
      .map((c: { label: string; pct_with: number; pct_without: number }) =>
        `${c.label} — with: ${c.pct_with}% vs without: ${c.pct_without}%`
      )
      .join('\n')

    const systemPrompt = `You are the Winter Arc AI Coach — an uncompromising, tough-love discipline mentor.
Analyze the user's 14-day habit telemetry, call out excuses, highlight the weakest habit and day of the week, and deliver exactly 3 high-impact, non-negotiable directives for the upcoming week.
Tone: Direct, intense, serious, holding them strictly to their standard without fluff or coddling.
Format:
Start with a punchy 1-2 sentence tough-love assessment of their execution.
Then provide:
1. [Directive 1 targeting their weakest habit]
2. [Directive 2 targeting their weakest weekday or dropoff pattern]
3. [Directive 3 for streak protection and mental toughness]
End with a short closing challenge (e.g., "Lock in and execute.").
Keep it under 180 words.`

    const userMessage = `
Habit data (last 14 days):
${habitSummary}

Last 7 days daily %: ${daysPctStr}
Current streak: ${streaks.current} days | Best: ${streaks.best} days
Weekday pattern: ${weekdayStr}

Correlations:
${corrStr || 'None available yet'}

Privacy mode: ${privacy_mode ? 'yes (habit names anonymised)' : 'no'}
`

    // Call Gemini API with automatic fallback to latest available flash model
    const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash']
    let content: string | null = null
    let lastError = ''

    for (const model of modelsToTry) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`
        const geminiResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: systemPrompt + '\n\n' + userMessage }],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 400,
            },
          }),
        })

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json()
          content = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text
          if (content) break
        } else {
          lastError = await geminiResponse.text()
        }
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e)
      }
    }

    if (!content) {
      throw new Error(`Gemini API error: ${lastError || 'No content in Gemini response'}`)
    }

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[ai-coach]', message)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
