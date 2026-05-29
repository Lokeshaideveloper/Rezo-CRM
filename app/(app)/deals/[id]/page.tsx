'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import { Deal, STAGE_COLORS, DealStage } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  ArrowLeft, StickyNote, Paperclip, Trash2, Download,
  Send, FileText, Image, File, Loader2, Plus, Mail,
  X, ChevronDown, CheckCircle2, AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

// ─── Types ───────────────────────────────────────────────────
interface Note {
  id: string; deal_id: string; content: string
  created_by: string; author?: { full_name: string }; created_at: string
}
interface Attachment {
  id: string; deal_id: string; file_name: string; file_size: number
  file_type: string; storage_path: string; uploaded_by: string
  uploader?: { full_name: string }; created_at: string
}
interface DealEmail {
  id: string; deal_id: string; to_email: string; to_name: string
  subject: string; body: string; sent_by: string
  sender?: { full_name: string }; created_at: string
}

// ─── Helpers ─────────────────────────────────────────────────
function fileIcon(type: string) {
  if (type.startsWith('image/')) return <Image className="w-4 h-4 text-blue-500" />
  if (type === 'application/pdf') return <FileText className="w-4 h-4 text-red-500" />
  return <File className="w-4 h-4 text-slate-500" />
}
function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}
function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return formatDate(date)
}

// ─── Email Compose Modal ──────────────────────────────────────
function EmailModal({
  toEmail, toName, dealName, sentBy,
  onClose, onSent, dealId
}: {
  toEmail: string; toName: string; dealName: string
  sentBy: string; dealId: string
  onClose: () => void; onSent: () => void
}) {
  const [subject, setSubject] = useState(`Re: ${dealName}`)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSend() {
    if (!subject.trim() || !body.trim()) { toast.error('Subject and message are required'); return }
    setSending(true)
    try {
      const res = await fetch('/api/deals/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal_id: dealId, to_email: toEmail, to_name: toName, subject, body, sent_by: sentBy }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send')
      setSent(true)
      toast.success('Email sent!')
      setTimeout(() => { onSent(); onClose() }, 1200)
    } catch (err: any) {
      toast.error(err.message)
    }
    setSending(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <Mail className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">New Email</p>
              <p className="text-xs text-slate-400">To: {toName} &lt;{toEmail}&gt;</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* To field (read-only) */}
          <div className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 rounded-lg">
            <span className="text-xs font-bold text-slate-400 uppercase w-14 shrink-0">To</span>
            <span className="text-sm text-slate-700 font-medium">{toName}</span>
            <span className="text-sm text-slate-400">&lt;{toEmail}&gt;</span>
          </div>

          {/* Subject */}
          <div className="flex items-center gap-3 border border-slate-200 rounded-lg px-3 py-2.5 focus-within:border-red-400 transition-colors">
            <span className="text-xs font-bold text-slate-400 uppercase w-14 shrink-0">Subject</span>
            <input
              className="flex-1 text-sm text-slate-800 focus:outline-none bg-transparent"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Email subject..."
            />
          </div>

          {/* Body */}
          <textarea
            className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-400 transition-colors resize-none min-h-[200px] leading-relaxed"
            placeholder={`Hi ${toName.split(' ')[0]},\n\n`}
            value={body}
            onChange={e => setBody(e.target.value)}
          />

          <p className="text-xs text-slate-400">{body.length} characters</p>
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button
            onClick={handleSend}
            disabled={sending || sent || !subject.trim() || !body.trim()}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-60"
          >
            {sent ? (
              <><CheckCircle2 className="w-4 h-4" /> Sent!</>
            ) : sending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
            ) : (
              <><Send className="w-4 h-4" /> Send Email</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────
export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()

  const [deal, setDeal] = useState<Deal | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [emails, setEmails] = useState<DealEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [activeTab, setActiveTab] = useState<'notes' | 'attachments' | 'emails'>('notes')
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchAll = useCallback(async () => {
    const [
      { data: dealData },
      { data: notesData },
      { data: attachData },
      { data: emailsData },
    ] = await Promise.all([
      supabase
        .from('deals')
        .select(`*, owner:users!deals_owner_id_fkey(id,full_name,email), contact:contacts(id,name,email), account:accounts(id,name)`)
        .eq('id', id).single(),
      supabase
        .from('deal_notes')
        .select(`*, author:users!deal_notes_created_by_fkey(full_name)`)
        .eq('deal_id', id).order('created_at', { ascending: false }),
      supabase
        .from('deal_attachments')
        .select(`*, uploader:users!deal_attachments_uploaded_by_fkey(full_name)`)
        .eq('deal_id', id).order('created_at', { ascending: false }),
      supabase
        .from('deal_emails')
        .select(`*, sender:users!deal_emails_sent_by_fkey(full_name)`)
        .eq('deal_id', id).order('created_at', { ascending: false }),
    ])
    setDeal(dealData)
    setNotes(notesData || [])
    setAttachments(attachData || [])
    setEmails(emailsData || [])
    setLoading(false)
  }, [supabase, id])

  useEffect(() => {
    fetchAll()
    supabase.auth.getUser().then(({ data: { user: session } }) => {
      if (session) setCurrentUserId(session.user.id)
    })
  }, [fetchAll, supabase])

  async function handleAddNote() {
    if (!noteText.trim()) return
    setSavingNote(true)
    const { error } = await supabase.from('deal_notes').insert({
      deal_id: id, content: noteText.trim(), created_by: currentUserId,
    })
    if (error) toast.error('Failed to save note')
    else { toast.success('Note added'); setNoteText(''); fetchAll() }
    setSavingNote(false)
  }

  async function handleDeleteNote(noteId: string) {
    if (!confirm('Delete this note?')) return
    await supabase.from('deal_notes').delete().eq('id', noteId)
    fetchAll()
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) { toast.error('Max file size is 20MB'); return }
    setUploadingFile(true)
    const path = `deals/${id}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('deal-attachments').upload(path, file)
    if (uploadError) { toast.error('Upload failed: ' + uploadError.message); setUploadingFile(false); return }
    await supabase.from('deal_attachments').insert({
      deal_id: id, file_name: file.name, file_size: file.size,
      file_type: file.type, storage_path: path, uploaded_by: currentUserId,
    })
    toast.success('File uploaded!')
    fetchAll()
    setUploadingFile(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleDownload(att: Attachment) {
    const { data } = await supabase.storage.from('deal-attachments').createSignedUrl(att.storage_path, 60)
    if (data) window.open(data.signedUrl, '_blank')
  }

  async function handleDeleteAttachment(att: Attachment) {
    if (!confirm('Delete this file?')) return
    await supabase.storage.from('deal-attachments').remove([att.storage_path])
    await supabase.from('deal_attachments').delete().eq('id', att.id)
    fetchAll()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-red-500" />
    </div>
  )
  if (!deal) return (
    <div className="p-8 text-center text-slate-500">
      Deal not found. <Link href="/deals" className="text-red-600 underline">Back to deals</Link>
    </div>
  )

  const stageColor = STAGE_COLORS[deal.stage as DealStage]
  const contactEmail = (deal as any).contact?.email
  const contactName = (deal as any).contact?.name

  const tabs = [
    { key: 'notes', label: 'Notes', icon: StickyNote, count: notes.length },
    { key: 'attachments', label: 'Attachments', icon: Paperclip, count: attachments.length },
    { key: 'emails', label: 'Emails', icon: Mail, count: emails.length },
  ] as const

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <Link href="/deals" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4 w-fit transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Deals
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{deal.name}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: stageColor + '20', color: stageColor }}>
                {deal.stage}
              </span>
              {(deal as any).account && <span className="text-sm text-slate-500">🏢 {(deal as any).account.name}</span>}
              {contactName && <span className="text-sm text-slate-500">👤 {contactName}</span>}
              {contactEmail && <span className="text-sm text-slate-400">{contactEmail}</span>}
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold text-red-600">{formatCurrency(deal.expected_mrr)}</p>
              <p className="text-xs text-slate-400 mt-0.5">Expected MRR</p>
            </div>
            {/* Send Email button */}
            {contactEmail ? (
              <button
                onClick={() => setShowEmailModal(true)}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <Mail className="w-4 h-4" /> Send Email
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                No contact email on this deal
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-6 mt-4 text-sm text-slate-600 flex-wrap">
          {(deal as any).owner && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-700">
                {(deal as any).owner.full_name.charAt(0)}
              </div>
              <span>{(deal as any).owner.full_name}</span>
            </div>
          )}
          {deal.close_date && <span className="text-slate-500">📅 Close: {formatDate(deal.close_date)}</span>}
          <span className="text-slate-400 text-xs">Created {formatDate(deal.created_at)}</span>
        </div>
      </div>

      <div className="p-8 max-w-4xl">
        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit mb-6">
          {tabs.map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === key
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === key ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-600'
                }`}>{count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── NOTES TAB ── */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <textarea
                className="w-full text-sm text-slate-800 placeholder-slate-400 resize-none focus:outline-none min-h-[80px]"
                placeholder="Add a note — call summary, meeting outcome, next steps..."
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddNote() }}
              />
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-400">⌘ + Enter to save</span>
                <button onClick={handleAddNote} disabled={savingNote || !noteText.trim()} className="btn-primary flex items-center gap-2 text-sm py-2 px-4 disabled:opacity-50">
                  {savingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Add Note
                </button>
              </div>
            </div>

            {notes.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <StickyNote className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No notes yet</p>
                <p className="text-slate-400 text-sm mt-1">Add call summaries, meeting notes, or any deal context</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map(note => (
                  <div key={note.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-sm font-bold text-red-700 shrink-0">
                          {note.author?.full_name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-sm font-semibold text-slate-700">{note.author?.full_name || 'Unknown'}</span>
                            <span className="text-xs text-slate-400">{timeAgo(note.created_at)}</span>
                          </div>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteNote(note.id)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-all shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ATTACHMENTS TAB ── */}
        {activeTab === 'attachments' && (
          <div className="space-y-4">
            <div
              className="bg-white rounded-xl border-2 border-dashed border-slate-300 hover:border-red-400 transition-colors p-8 text-center cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                const file = e.dataTransfer.files[0]
                if (file && fileInputRef.current) {
                  const dt = new DataTransfer(); dt.items.add(file)
                  fileInputRef.current.files = dt.files
                  fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }))
                }
              }}
            >
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
              {uploadingFile ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                  <p className="text-sm text-slate-500">Uploading...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-slate-100 group-hover:bg-red-50 rounded-full flex items-center justify-center transition-colors">
                    <Plus className="w-6 h-6 text-slate-400 group-hover:text-red-500 transition-colors" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600 group-hover:text-red-600 transition-colors">Click or drag a file to upload</p>
                  <p className="text-xs text-slate-400">Any file type · Max 20MB</p>
                </div>
              )}
            </div>

            {attachments.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Paperclip className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No attachments yet</p>
                <p className="text-slate-400 text-sm mt-1">Upload proposals, contracts, presentations</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{attachments.length} file{attachments.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="divide-y divide-slate-50">
                  {attachments.map(att => (
                    <div key={att.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group">
                      <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                        {fileIcon(att.file_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{att.file_name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{formatBytes(att.file_size)} · {att.uploader?.full_name} · {timeAgo(att.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleDownload(att)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors">
                          <Download className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteAttachment(att)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── EMAILS TAB ── */}
        {activeTab === 'emails' && (
          <div className="space-y-4">
            {/* Compose CTA */}
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-red-800">Send an email to {contactName || 'contact'}</p>
                <p className="text-xs text-red-500 mt-0.5">{contactEmail || 'No contact email set on this deal'}</p>
              </div>
              <button
                onClick={() => setShowEmailModal(true)}
                disabled={!contactEmail}
                className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mail className="w-4 h-4" /> Compose
              </button>
            </div>

            {emails.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Mail className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No emails sent yet</p>
                <p className="text-slate-400 text-sm mt-1">Emails you send from this deal will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {emails.map(email => (
                  <div key={email.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-700">
                          {email.sender?.full_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{email.subject}</p>
                          <p className="text-xs text-slate-400">
                            {email.sender?.full_name} → {email.to_name} &lt;{email.to_email}&gt; · {timeAgo(email.created_at)}
                          </p>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Sent
                      </span>
                    </div>
                    <div className="px-5 py-4">
                      <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{email.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Email compose modal */}
      {showEmailModal && contactEmail && (
        <EmailModal
          toEmail={contactEmail}
          toName={contactName || contactEmail}
          dealName={deal.name}
          dealId={id}
          sentBy={currentUserId}
          onClose={() => setShowEmailModal(false)}
          onSent={fetchAll}
        />
      )}
    </div>
  )
}
