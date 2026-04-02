import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PACKAGE_NAME = process.env.GOOGLE_PLAY_PACKAGE_NAME!;
const PRODUCT_ID = 'bitelimit_full_access';

function getPrivateKey() {
  return process.env.GOOGLE_PLAY_PRIVATE_KEY?.replace(/\\n/g, '\n');
}

async function getAndroidPublisher() {
  const client = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_PLAY_CLIENT_EMAIL,
      private_key: getPrivateKey(),
    },
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });

  const authClient = await client.getClient();

  return google.androidpublisher({
    version: 'v3',
    auth: authClient,
  });
}

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
    const { userId, purchaseToken, productId } = req.body || {};

    if (!userId) {
      return res.status(400).json({ error: 'No userId' });
    }

    if (!purchaseToken) {
      return res.status(400).json({ error: 'No purchaseToken' });
    }

    if (!productId) {
      return res.status(400).json({ error: 'No productId' });
    }

    if (productId !== PRODUCT_ID) {
      return res.status(400).json({ error: 'Invalid productId' });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, is_premium')
      .eq('id', userId)
      .maybeSingle();

    if (userError) {
      console.error(userError);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.is_premium) {
      return res.status(200).json({
        ok: true,
        isPremium: true,
      });
    }

    const publisher = await getAndroidPublisher();

    const purchase = await publisher.purchases.products.get({
      packageName: PACKAGE_NAME,
      productId,
      token: purchaseToken,
    });

    const data = purchase.data;

    if (!data) {
      return res.status(400).json({ error: 'Purchase not found' });
    }

    if (Number(data.purchaseState) !== 0) {
      return res.status(400).json({ error: 'Purchase is not completed' });
    }

    if (Number(data.consumptionState) === 1) {
      return res.status(400).json({ error: 'Purchase already consumed' });
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ is_premium: true })
      .eq('id', userId);

    if (updateError) {
      console.error(updateError);
      return res.status(500).json({ error: 'Failed to update premium status' });
    }

    if (Number(data.acknowledgementState) === 0) {
      await publisher.purchases.products.acknowledge({
        packageName: PACKAGE_NAME,
        productId,
        token: purchaseToken,
        requestBody: {},
      });
    }

    return res.status(200).json({
      ok: true,
      isPremium: true,
    });
  } catch (error: any) {
    console.error(error);

    return res.status(500).json({
      error: 'Verify failed',
      details: error?.message || 'Unknown error',
    });
  }
}
