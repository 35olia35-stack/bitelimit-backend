import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TRIAL_DAYS = 10;

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

    const { data: user, error } = await supabase
      .from('users')
      .select('id, trial_start_at')
      .eq('id', authUser.id)
      .maybeSingle();

    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const trialStartAt = new Date(user.trial_start_at);
    const now = new Date();
    const diffMs = now.getTime() - trialStartAt.getTime();
    const daysPassed = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const trialActive = daysPassed < TRIAL_DAYS;

    return res.status(200).json({
      userId: user.id,
      email: authUser.email ?? null,
      trialActive,
      trialDays: TRIAL_DAYS,
      daysPassed,
      daysLeft: Math.max(TRIAL_DAYS - daysPassed, 0),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error' });
  }
}
