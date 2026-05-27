'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Upload, FileText, CheckCircle, AlertCircle, Loader2, Download } from 'lucide-react'
import Papa from 'papaparse'
import toast from 'react-hot-toast'

type Entity = 'deals' | 'accounts' | 'contacts'

interface Props { entity: Entity; onClose: () => void; onSave: () => void }

const TEMPLATES: Record<Entity, { headers: string[]; example: string[] }> = {
  accounts: {
    headers: ['name', 'industry', 'city'],
    example: ['Acme Corp', 'SaaS', 'Bengaluru'],
  },
  contacts: {
    headers: ['name', 'email', 'phone', 'designation', 'role'],
    example: ['Priya Sharma', 'priya@acme.com', '+91 98765 43210', 'CTO', 'kdm'],
  },
  deals: {
    headers: ['name', 'expected_mrr', 'close_date', 'stage'],
    example: ['Acme Enterprise', '50000', '2024-12-31', 'MQL'],
  },
}

export default function BulkUploadModal({ entity, onClose, onSave }: Props) {
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [status, setStatus] = useState<('pending' | 'success' | 'error')[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  function handleFile(file: File) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        setRows(result.data as Record<string, string>[])
        setStatus([])
        setErrors([])
        setDone(false)
      },
      error: () => toast.error('Failed to parse CSV'),
    })
  }

  function downloadTemplate() {
    const { headers, example } = TEMPLATES[entity]
    const csv = [headers.join(','), example.join(',')].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${entity}_template.csv`
    a.click()
  }

  async function handleUpload() {
    if (rows.length === 0) return
    setUploading(true)
    const newStatus: ('pending' | 'success' | 'error')[] = new Array(rows.length).fill('pending')
    const newErrors: string[] = new Array(rows.length).fill('')
    setStatus([...newStatus])

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      let payload: Record<string, unknown> = { ...row }

      // Normalize types
      if (entity === 'deals' && row.expected_mrr) {
        payload.expected_mrr = parseFloat(row.expected_mrr) || 0
      }

      const { error } = await supabase.from(entity).insert(payload)
      if (error) {
        newStatus[i] = 'error'
        newErrors[i] = error.message
      } else {
        newStatus[i] = 'success'
      }
      setStatus([...newStatus])
      setErrors([...newErrors])
    }

    setUploading(false)
    setDone(true)
    const succeeded = newStatus.filter(s => s === 'success').length
    toast.success(`${succeeded} of ${rows.length} records imported`)
    if (succeeded > 0) setTimeout(() => onSave(), 1500)
  }

  const entityLabel = entity.charAt(0).toUpperCase() + entity.slice(1)

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Bulk Upload {entityLabel}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Import multiple records via CSV</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Template download */}
          <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-indigo-800">Download Template</p>
              <p className="text-xs text-indigo-600 mt-0.5">
                Required columns: {TEMPLATES[entity].headers.join(', ')}
              </p>
            </div>
            <button onClick={downloadTemplate} className="btn-secondary flex items-center gap-2 text-xs">
              <Download className="w-3.5 h-3.5" /> Template
            </button>
          </div>

          {/* Upload zone */}
          {rows.length === 0 && (
            <div
              className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            >
              <Upload className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-600">Drop CSV here or click to browse</p>
              <p className="text-xs text-slate-400 mt-1">Only .csv files</p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            </div>
          )}

          {/* Preview table */}
          {rows.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-slate-700">{rows.length} records ready</p>
                <button onClick={() => { setRows([]); setStatus([]) }} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-3 py-2 text-left font-bold text-slate-500">#</th>
                        {Object.keys(rows[0]).map(k => (
                          <th key={k} className="px-3 py-2 text-left font-bold text-slate-500 capitalize">{k}</th>
                        ))}
                        {status.length > 0 && <th className="px-3 py-2 text-left font-bold text-slate-500">Status</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((row, i) => (
                        <tr key={i} className={status[i] === 'error' ? 'bg-red-50' : status[i] === 'success' ? 'bg-green-50' : ''}>
                          <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                          {Object.values(row).map((v, j) => (
                            <td key={j} className="px-3 py-2 text-slate-700 max-w-32 truncate">{v as string}</td>
                          ))}
                          {status.length > 0 && (
                            <td className="px-3 py-2">
                              {status[i] === 'pending' && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                              {status[i] === 'success' && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                              {status[i] === 'error' && (
                                <div className="flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                  <span className="text-red-600 text-xs">{errors[i]}</span>
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {rows.length > 0 && (
          <div className="flex justify-end gap-3 px-6 py-5 border-t border-slate-100 shrink-0">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={handleUpload} disabled={uploading || done} className="btn-primary flex items-center gap-2">
              {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
              {done ? 'Done!' : `Import ${rows.length} Records`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
