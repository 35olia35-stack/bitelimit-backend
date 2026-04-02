import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export default async function handler(req, res) {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'No userId' });
  }

  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (!existing) {
    await supabase.from('users').insert({
      id: userId,
    });
  }

  return res.status(200).json({ ok: true });
}
