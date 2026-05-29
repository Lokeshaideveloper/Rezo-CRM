'use client'

import { useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'

type UploadType = 'deals' | 'accounts' | 'contacts'

interface UploadResult {
  success: number
  failed: number
  errors: string[]
}

interface BulkUploadModalProps {
  isOpen?: boolean
  onClose: () => void
  type?: UploadType
  entity?: UploadType     // alias for type (legacy prop name)
  onSuccess?: () => void
  onSave?: () => void     // alias for onSuccess (legacy prop name)
}

// ─── CSV parsers ────────────────────────────────────────────────────────────

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'))
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
    return headers.reduce<Record<string, string>>((acc, h, i) => {
      acc[h] = values[i] ?? ''
      return acc
    }, {})
  })
}

// ─── Sample CSV templates ────────────────────────────────────────────────────

const TEMPLATES: Record<UploadType, { headers: string; example: string; notes: string[] }> = {
  accounts: {
    headers: 'name,industry,city',
    example: 'Acme Corp,SaaS,Bengaluru',
    notes: ['Upload accounts first before contacts or deals.'],
  },
  contacts: {
    headers: 'name,email,phone,designation,role,account_name',
    example: 'Priya Sharma,priya@acme.com,+91 98765 43210,CTO,kdm,Acme Corp',
    notes: [
      'account_name must match an existing account name exactly.',
      'role values: influencer | kdm | blocker | champion',
    ],
  },
  deals: {
    headers: 'name,expected_mrr,close_date,stage,account_name,contact_email',
    example: 'Enterprise Deal,50000,2024-12-31,MQL,Acme Corp,priya@acme.com',
    notes: [
      'account_name is matched to an existing account by name.',
      'contact_email is matched to an existing contact by email.',
      'stage values: MQL | Demo/Discovery | SQL | Commercial | POC/Pilot | Won | Lost | On Hold',
    ],
  },
}

// ─── Upload logic ────────────────────────────────────────────────────────────

async function uploadAccounts(
  rows: Record<string, string>[],
  supabase: ReturnType<typeof createClientComponentClient>
): Promise<UploadResult> {
  const result: UploadResult = { success: 0, failed: 0, errors: [] }
  for (const [i, row] of rows.entries()) {
    if (!row.name) {
      result.failed++
      result.errors.push(`Row ${i + 2}: missing required field "name"`)
      continue
    }
    const { error } = await supabase.from('accounts').insert({
      name: row.name,
      industry: row.industry || null,
      city: row.city || null,
    })
    if (error) {
      result.failed++
      result.errors.push(`Row ${i + 2} (${row.name}): ${error.message}`)
    } else {
      result.success++
    }
  }
  return result
}

async function uploadContacts(
  rows: Record<string, string>[],
  supabase: ReturnType<typeof createClientComponentClient>
): Promise<UploadResult> {
  const result: UploadResult = { success: 0, failed: 0, errors: [] }

  // Build account name → id lookup
  const accountNames = [...new Set(rows.map((r) => r.account_name).filter(Boolean))]
  const accountMap: Record<string, string> = {}
  if (accountNames.length > 0) {
    const { data } = await supabase
      .from('accounts')
      .select('id, name')
      .in('name', accountNames)
    for (const a of data ?? []) accountMap[a.name] = a.id
  }

  for (const [i, row] of rows.entries()) {
    if (!row.name || !row.email) {
      result.failed++
      result.errors.push(`Row ${i + 2}: missing required field "name" or "email"`)
      continue
    }

    let accountId: string | null = null
    if (row.account_name) {
      accountId = accountMap[row.account_name] ?? null
      if (!accountId) {
        result.failed++
        result.errors.push(
          `Row ${i + 2} (${row.name}): account "${row.account_name}" not found`
        )
        continue
      }
    }

    const { error } = await supabase.from('contacts').insert({
      name: row.name,
      email: row.email,
      phone: row.phone || null,
      designation: row.designation || null,
      role: row.role || null,
      account_id: accountId,
    })
    if (error) {
      result.failed++
      result.errors.push(`Row ${i + 2} (${row.name}): ${error.message}`)
    } else {
      result.success++
    }
  }
  return result
}

async function uploadDeals(
  rows: Record<string, string>[],
  supabase: ReturnType<typeof createClientComponentClient>
): Promise<UploadResult> {
  const result: UploadResult = { success: 0, failed: 0, errors: [] }

  // Build lookup maps
  const accountNames = [...new Set(rows.map((r) => r.account_name).filter(Boolean))]
  const contactEmails = [...new Set(rows.map((r) => r.contact_email).filter(Boolean))]

  const accountMap: Record<string, string> = {}
  if (accountNames.length > 0) {
    const { data } = await supabase
      .from('accounts')
      .select('id, name')
      .in('name', accountNames)
    for (const a of data ?? []) accountMap[a.name] = a.id
  }

  const contactMap: Record<string, string> = {}
  if (contactEmails.length > 0) {
    const { data } = await supabase
      .from('contacts')
      .select('id, email')
      .in('email', contactEmails)
    for (const c of data ?? []) contactMap[c.email] = c.id
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  for (const [i, row] of rows.entries()) {
    if (!row.name) {
      result.failed++
      result.errors.push(`Row ${i + 2}: missing required field "name"`)
      continue
    }

    let accountId: string | null = null
    if (row.account_name) {
      accountId = accountMap[row.account_name] ?? null
      if (!accountId) {
        result.failed++
        result.errors.push(
          `Row ${i + 2} (${row.name}): account "${row.account_name}" not found`
        )
        continue
      }
    }

    let contactId: string | null = null
    if (row.contact_email) {
      contactId = contactMap[row.contact_email] ?? null
      if (!contactId) {
        result.failed++
        result.errors.push(
          `Row ${i + 2} (${row.name}): contact with email "${row.contact_email}" not found`
        )
        continue
      }
    }

    const { error } = await supabase.from('deals').insert({
      name: row.name,
      expected_mrr: row.expected_mrr ? Number(row.expected_mrr) : null,
      close_date: row.close_date || null,
      stage: row.stage || 'MQL',
      account_id: accountId,
      contact_id: contactId,
      owner_id: user?.id ?? null,
    })
    if (error) {
      result.failed++
      result.errors.push(`Row ${i + 2} (${row.name}): ${error.message}`)
    } else {
      result.success++
    }
  }
  return result
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function BulkUploadModal({
  isOpen = true,
  onClose,
  type,
  entity,
  onSuccess,
  onSave,
}: BulkUploadModalProps) {
  const resolvedType: UploadType = (type ?? entity ?? 'deals')
  const handleSuccess = onSuccess ?? onSave ?? (() => {})
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Record<string, string>[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)

  if (!isOpen) return null

  const template = TEMPLATES[resolvedType]

  const handleFile = (f: File) => {
    setFile(f)
    setResult(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const rows = parseCSV(e.target?.result as string)
      setPreview(rows.slice(0, 5))
    }
    reader.readAsText(f)
  }

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setResult(null)
    const text = await file.text()
    const rows = parseCSV(text)
    let res: UploadResult

    if (resolvedType === 'accounts') res = await uploadAccounts(rows, supabase)
    else if (resolvedType === 'contacts') res = await uploadContacts(rows, supabase)
    else res = await uploadDeals(rows, supabase)

    setResult(res)
    setLoading(false)
    if (res.success > 0) handleSuccess()
  }

  const downloadTemplate = () => {
    const csv = `${template.headers}\n${template.example}`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${resolvedType}_template.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const reset = () => {
    setFile(null)
    setPreview([])
    setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const headers = preview.length > 0 ? Object.keys(preview[0]) : []

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--color-background-primary, #fff)',
          borderRadius: 12,
          border: '0.5px solid var(--color-border-tertiary)',
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.5rem',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>
            Bulk upload {resolvedType}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 20,
              color: 'var(--color-text-secondary)',
              lineHeight: 1,
              padding: 4,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Template download */}
        <div
          style={{
            background: 'var(--color-background-secondary)',
            borderRadius: 8,
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
          }}
        >
          <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 500 }}>CSV format</p>
          <code
            style={{
              fontSize: 12,
              color: 'var(--color-text-secondary)',
              display: 'block',
              marginBottom: 8,
            }}
          >
            {template.headers}
          </code>
          {template.notes.map((note, i) => (
            <p key={i} style={{ margin: '2px 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>
              • {note}
            </p>
          ))}
          <button
            onClick={downloadTemplate}
            style={{
              marginTop: 10,
              fontSize: 12,
              padding: '4px 12px',
              cursor: 'pointer',
              borderRadius: 6,
              border: '0.5px solid var(--color-border-secondary)',
              background: 'none',
            }}
          >
            ↓ Download template
          </button>
        </div>

        {/* Drop zone */}
        {!file && (
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              border: '1.5px dashed var(--color-border-secondary)',
              borderRadius: 8,
              padding: '2rem',
              cursor: 'pointer',
              marginBottom: '1rem',
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const f = e.dataTransfer.files[0]
              if (f) handleFile(f)
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
            <span style={{ fontSize: 28 }}>📂</span>
            <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
              Drop CSV here or <span style={{ color: 'var(--color-text-info, #1a73e8)', textDecoration: 'underline' }}>browse</span>
            </span>
          </label>
        )}

        {/* File selected */}
        {file && !result && (
          <div style={{ marginBottom: '1rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 500 }}>📄 {file.name}</span>
              <button
                onClick={reset}
                style={{
                  fontSize: 12,
                  color: 'var(--color-text-secondary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Remove
              </button>
            </div>

            {preview.length > 0 && (
              <div style={{ overflowX: 'auto', marginBottom: 12 }}>
                <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 6px' }}>
                  Preview (first {preview.length} rows)
                </p>
                <table
                  style={{
                    width: '100%',
                    fontSize: 12,
                    borderCollapse: 'collapse',
                    tableLayout: 'fixed',
                  }}
                >
                  <thead>
                    <tr>
                      {headers.map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: 'left',
                            padding: '4px 8px',
                            background: 'var(--color-background-secondary)',
                            borderBottom: '0.5px solid var(--color-border-tertiary)',
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i}>
                        {headers.map((h) => (
                          <td
                            key={h}
                            style={{
                              padding: '4px 8px',
                              borderBottom: '0.5px solid var(--color-border-tertiary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {row[h]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              {result.success > 0 && (
                <div
                  style={{
                    flex: 1,
                    background: 'var(--color-background-success)',
                    borderRadius: 8,
                    padding: '0.75rem',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 500, color: 'var(--color-text-success)' }}>
                    {result.success}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-success)' }}>imported</p>
                </div>
              )}
              {result.failed > 0 && (
                <div
                  style={{
                    flex: 1,
                    background: 'var(--color-background-danger)',
                    borderRadius: 8,
                    padding: '0.75rem',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 500, color: 'var(--color-text-danger)' }}>
                    {result.failed}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-danger)' }}>failed</p>
                </div>
              )}
            </div>
            {result.errors.length > 0 && (
              <div
                style={{
                  background: 'var(--color-background-danger)',
                  borderRadius: 8,
                  padding: '0.75rem',
                  maxHeight: 160,
                  overflowY: 'auto',
                }}
              >
                {result.errors.map((e, i) => (
                  <p key={i} style={{ margin: '2px 0', fontSize: 12, color: 'var(--color-text-danger)' }}>
                    {e}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {result ? (
            <>
              <button onClick={reset} style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: 6, border: '0.5px solid var(--color-border-secondary)', background: 'none', fontSize: 14 }}>
                Upload another
              </button>
              <button
                onClick={onClose}
                style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: 6, border: '0.5px solid var(--color-border-secondary)', background: 'var(--color-background-secondary)', fontSize: 14, fontWeight: 500 }}
              >
                Done
              </button>
            </>
          ) : (
            <>
              <button onClick={onClose} style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: 6, border: '0.5px solid var(--color-border-secondary)', background: 'none', fontSize: 14 }}>
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || loading}
                style={{
                  padding: '8px 20px',
                  cursor: file && !loading ? 'pointer' : 'not-allowed',
                  borderRadius: 6,
                  border: 'none',
                  background: file && !loading ? '#1a73e8' : 'var(--color-border-secondary)',
                  color: file && !loading ? '#fff' : 'var(--color-text-secondary)',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {loading ? 'Uploading…' : 'Upload'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
