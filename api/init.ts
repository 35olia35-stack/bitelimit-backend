import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ error: 'Missing token' });
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authData?.user) {
      console.error(authError);
      return res.status(401).json({ error: 'Invalid token' });
    }

    const authUser = authData.user;

    const { data: existing, error: selectError } = await supabase
      .from('users')
      .select('id, trial_start_at')
      .eq('id', authUser.id)
      .maybeSingle();

    if (selectError) {
      console.error(selectError);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!existing) {
      const { error: insertError } = await supabase.from('users').insert({
        id: authUser.id,
        trial_start_at: new Date().toISOString()
      });

      if (insertError) {
        console.error(insertError);
        return res.status(500).json({ error: 'Database error' });
      }
    }

    return res.status(200).json({
      userId: authUser.id,
      email: authUser.email ?? null
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error' });
  }
}
