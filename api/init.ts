import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = req.body?.userId;

  if (!userId) {
    return res.status(400).json({ error: 'No userId' });
  }

  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (!existing) {
    await supabase.from('users').insert({
      id: userId,
    });
  }

  return res.status(200).json({ ok: true });
}
