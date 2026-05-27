import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = process.env.FROM_EMAIL || 'crm@yourdomain.com'

export async function POST(req: NextRequest) {
  try {
    const { deal_id, to_email, to_name, subject, body, sent_by } = await req.json()

    if (!to_email || !subject || !body) {
      return NextResponse.json({ error: 'to_email, subject, and body are required' }, { status: 400 })
    }

    // Send via Resend
    const { data: emailData, error: sendError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: to_email,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
              .body { padding: 36px; color: #1e293b; font-size: 15px; line-height: 1.7; white-space: pre-wrap; }
              .footer { padding: 20px 36px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="body">${body.replace(/\n/g, '<br/>')}</div>
              <div class="footer">Sent via Pipeline CRM</div>
            </div>
          </body>
        </html>
      `,
    })

    if (sendError) {
      console.error('Resend error:', sendError)
      return NextResponse.json({ error: sendError.message }, { status: 500 })
    }

    // Log the email to deal_emails table
    await supabase.from('deal_emails').insert({
      deal_id,
      to_email,
      to_name,
      subject,
      body,
      sent_by,
      resend_id: emailData?.id || null,
    })

    return NextResponse.json({ success: true, id: emailData?.id })
  } catch (err: any) {
    console.error('Email send error:', err)
    return NextResponse.json({ error: err.message || 'Failed to send email' }, { status: 500 })
  }
}
