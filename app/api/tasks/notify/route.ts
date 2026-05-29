import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTaskAssignmentEmail } from '@/lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { assigned_to, deal_name, title, description, due_date, deal_id } = body

    // Get assignee details
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', assigned_to)
      .single()

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    await sendTaskAssignmentEmail(
      { title, description, due_date, deal_id } as any,
      user,
      deal_name
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Task notification error:', err)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}
