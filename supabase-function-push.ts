// MRCNK – Supabase Edge Function "push" (przypomnienia)
// Deploy: Edge Functions → Deploy a new function → nazwa: push → wklej ten plik
// WAŻNE: w ustawieniach funkcji wyłącz "Verify JWT" (wywołuje ją harmonogram), funkcja sama sprawdza dostęp.
// Secrets: VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT (np. mailto:twoj@email.pl), CRON_SECRET (dowolny długi ciąg)
// Harmonogram: Integrations → Cron → Create job → co 5 minut (*/5 * * * *) → typ: Supabase Edge Function → push
//   → nagłówek HTTP: x-cron-secret = wartość CRON_SECRET

import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const DEFAULTS: Record<string, { on: boolean; time: string; text: string }> = {
  morning: { on: false, time: '07:05', text: 'Waga, woda, medytacja.' },
  creatine: { on: false, time: '09:00', text: 'Kreatyna.' },
  focus: { on: false, time: '08:30', text: 'Start pierwszej sesji Deep Work.' },
  evening: { on: false, time: '21:30', text: 'Podsumowanie dnia i zadania na jutro.' },
  screens: { on: false, time: '22:25', text: '22:30 – telefon odkładasz. Melatonina.' },
  weekly: { on: false, time: '20:00', text: 'Przegląd tygodnia.' },
};
const TITLES: Record<string, string> = { morning: 'Poranek', creatine: 'Suplementy', focus: 'Deep Work', evening: 'Wieczór', screens: 'Ekrany off', weekly: 'Niedziela' };

function localNow(tz: string) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short' }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)?.value || '';
  return { day: `${g('year')}-${g('month')}-${g('day')}`, min: (Number(g('hour')) % 24) * 60 + Number(g('minute')), wd: g('weekday') };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com', Deno.env.get('VAPID_PUBLIC')!, Deno.env.get('VAPID_PRIVATE')!);
    const body = await req.json().catch(() => ({}));

    const send = async (userId: string, payload: Record<string, string>) => {
      const { data: subs } = await admin.from('records').select('id,data').eq('user_id', userId).eq('col', 'pushsub').eq('deleted', false);
      let n = 0;
      for (const s of subs || []) {
        try { await webpush.sendNotification(s.data.sub, JSON.stringify(payload)); n++; }
        catch (e) { if ((e as { statusCode?: number }).statusCode === 410 || (e as { statusCode?: number }).statusCode === 404) await admin.from('records').update({ deleted: true }).eq('user_id', userId).eq('id', s.id); }
      }
      return n;
    };

    // test z aplikacji (zalogowany użytkownik)
    if (body.test) {
      const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
      const { data } = await admin.auth.getUser(token);
      if (!data.user) return json({ error: 'Brak logowania' }, 401);
      const n = await send(data.user.id, { title: 'MRCNK', body: 'Powiadomienia działają.' });
      return json({ sent: n });
    }

    // wywołanie z harmonogramu
    if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) return json({ error: 'forbidden' }, 403);
    const { data: subs } = await admin.from('records').select('user_id,data').eq('col', 'pushsub').eq('deleted', false);
    const users = [...new Set((subs || []).map((s) => s.user_id))];
    let sent = 0;
    for (const uid of users) {
      const tz = (subs || []).find((s) => s.user_id === uid)?.data?.tz || 'Europe/Warsaw';
      const { data: st } = await admin.from('records').select('data').eq('user_id', uid).eq('id', 'settings').maybeSingle();
      const notify = { ...DEFAULTS, ...((st?.data?.notify) || {}) };
      const now = localNow(tz);
      for (const [key, cfg] of Object.entries(notify)) {
        if (!cfg || !cfg.on || !cfg.time) continue;
        if (key === 'weekly' && now.wd !== 'Sun') continue;
        const [h, m] = cfg.time.split(':').map(Number);
        const target = h * 60 + m;
        if (now.min < target || now.min > target + 9) continue;
        const { error } = await admin.from('push_log').insert({ user_id: uid, key, day: now.day });
        if (error) continue; // już wysłane dziś
        sent += await send(uid, { title: TITLES[key] || 'MRCNK', body: cfg.text || '', tag: key });
      }
    }
    return json({ sent });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
