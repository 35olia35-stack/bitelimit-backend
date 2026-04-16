import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';

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
    const requestedUserId =
      typeof req.body?.userId === 'string' && req.body.userId.trim()
        ? req.body.userId.trim()
        : null;

    if (requestedUserId) {
      const { data: existing, error: selectError } = await supabase
        .from('users')
        .select('id')
        .eq('id', requestedUserId)
        .maybeSingle();

      if (selectError) {
        console.error(selectError);
        return res.status(500).json({ error: 'Database error' });
      }

      if (!existing) {
        const { error: insertError } = await supabase.from('users').insert({
          id: requestedUserId,
          trial_start_at: new Date().toISOString(),
        });

        if (insertError) {
          console.error(insertError);
          return res.status(500).json({ error: 'Database error' });
        }
      }

      return res.status(200).json({ userId: requestedUserId });
    }

    const newUserId = randomUUID();

    const { error: insertError } = await supabase.from('users').insert({
      id: newUserId,
      trial_start_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error(insertError);
      return res.status(500).json({ error: 'Database error' });
    }

    return res.status(200).json({ userId: newUserId });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error' });
  }
}
