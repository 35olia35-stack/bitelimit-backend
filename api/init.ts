import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let { userId } = req.body || {};

    if (userId) {
      const { data: existing, error: selectError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (selectError) {
        console.error(selectError);
        return res.status(500).json({ error: 'Database error' });
      }

      if (existing) {
        return res.status(200).json({ userId });
      }
    }

    userId = randomUUID();

    const { error: insertError } = await supabase.from('users').insert({
      id: userId,
      trial_start_at: new Date().toISOString()
    });

    if (insertError) {
      console.error(insertError);
      return res.status(500).json({ error: 'Database error' });
    }

    return res.status(200).json({ userId });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error' });
  }
}
