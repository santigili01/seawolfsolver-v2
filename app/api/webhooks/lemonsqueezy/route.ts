import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/utils/supabase/admin'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-signature')
  
  const hmac = crypto
    .createHmac('sha256', process.env.LEMONSQUEEZY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex')

  if (hmac !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = JSON.parse(rawBody)
  const eventName = payload.meta?.event_name

  if (eventName === 'order_created') {
    const userId = payload.meta?.custom_data?.user_id
    const variantId = String(payload.data?.attributes?.first_order_item?.variant_id)
    const orderId = String(payload.data?.id)
    const email = payload.data?.attributes?.user_email

    if (!userId || !variantId || !orderId) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    await supabaseAdmin.from('users').upsert({ id: userId, email })
    await supabaseAdmin.from('purchases').upsert({ user_id: userId, variant_id: variantId, order_id: orderId })
  }

  return NextResponse.json({ success: true })
}
