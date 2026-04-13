import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TRIAL_DAYS = 30;

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
    const { userId } = req.body || {};

    if (!userId) {
      return res.status(400).json({ error: 'No userId' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, trial_start_at')
      .eq('id', userId)
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
      trialActive,
      trialDays: TRIAL_DAYS,
      daysPassed,
      daysLeft: Math.max(TRIAL_DAYS - daysPassed, 0)
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error' });
  }
}
