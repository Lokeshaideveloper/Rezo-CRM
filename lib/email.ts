import { Resend } from 'resend'
import { Task, User } from '@/types'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = process.env.FROM_EMAIL || 'crm@yourdomain.com'

export async function sendTaskAssignmentEmail(
  task: Task,
  assignee: User,
  dealName: string
) {
  const dueDate = new Date(task.due_date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  await resend.emails.send({
    from: FROM_EMAIL,
    to: assignee.email,
    subject: `New Task: ${task.title} — ${dealName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 0; }
            .container { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
            .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px; }
            .header h1 { color: #f8fafc; font-size: 22px; margin: 0; font-weight: 700; letter-spacing: -0.5px; }
            .header p { color: #94a3b8; margin: 6px 0 0; font-size: 14px; }
            .body { padding: 32px; }
            .label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 4px; }
            .value { font-size: 16px; color: #0f172a; font-weight: 500; margin-bottom: 20px; }
            .badge { display: inline-block; background: #f1f5f9; color: #475569; font-size: 13px; font-weight: 600; padding: 4px 12px; border-radius: 100px; }
            .desc-box { background: #f8fafc; border-left: 3px solid #6366f1; padding: 16px; border-radius: 0 8px 8px 0; color: #475569; font-size: 14px; line-height: 1.6; }
            .footer { padding: 20px 32px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; }
            .btn { display: inline-block; background: #6366f1; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 24px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 New Task Assigned</h1>
              <p>You have a new task on deal: <strong>${dealName}</strong></p>
            </div>
            <div class="body">
              <div class="label">Task</div>
              <div class="value">${task.title}</div>

              <div class="label">Due Date</div>
              <div class="value"><span class="badge">📅 ${dueDate}</span></div>

              ${task.description ? `
              <div class="label">Description</div>
              <div class="desc-box">${task.description}</div>
              ` : ''}

              <a href="${process.env.NEXT_PUBLIC_APP_URL}/deals" class="btn">View Deal →</a>
            </div>
            <div class="footer">
              Pipeline CRM · This is an automated notification
            </div>
          </div>
        </body>
      </html>
    `,
  })
}

export async function sendTaskReminderEmail(task: Task, assignee: User, dealName: string) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: assignee.email,
    subject: `⏰ Task Due Today: ${task.title}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2>Task Due Today</h2>
        <p><strong>${task.title}</strong> on deal <em>${dealName}</em> is due today.</p>
        ${task.description ? `<p>${task.description}</p>` : ''}
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/deals" style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Open CRM</a>
      </div>
    `,
  })
}
