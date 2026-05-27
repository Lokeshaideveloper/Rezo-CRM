'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import { Plus, Search, Copy, Pencil, Trash2, Tag, X, Check, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

interface Snippet {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  created_by: string
  created_at: string
  updated_at: string
}

const CATEGORIES = ['Email', 'Follow-up', 'Proposal', 'Objection Handling', 'Intro', 'Closing', 'Other']
const CATEGORY_COLORS: Record<string, string> = {
  'Email': 'bg-blue-100 text-blue-700',
  'Follow-up': 'bg-amber-100 text-amber-700',
  'Proposal': 'bg-purple-100 text-purple-700',
  'Objection Handling': 'bg-red-100 text-red-700',
  'Intro': 'bg-green-100 text-green-700',
  'Closing': 'bg-emerald-100 text-emerald-700',
  'Other': 'bg-slate-100 text-slate-600',
}

function SnippetModal({
  snippet,
  onClose,
  onSave,
}: {
  snippet: Snippet | null
  onClose: () => void
  onSave: (data: Partial<Snippet>) => void
}) {
  const [title, setTitle] = useState(snippet?.title || '')
  const [content, setContent] = useState(snippet?.content || '')
  const [category, setCategory] = useState(snippet?.category || 'Email')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(snippet?.tags || [])

  function addTag() {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  function removeTag(tag: string) {
    setTags(prev => prev.filter(t => t !== tag))
  }

  function handleSubmit() {
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required')
      return
    }
    onSave({ title: title.trim(), content: content.trim(), category, tags })
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">{snippet ? 'Edit Snippet' : 'New Snippet'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Title</label>
            <input
              className="input w-full"
              placeholder="e.g. Initial Outreach Email"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Category</label>
            <select className="input w-full" value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
              Content
              <span className="ml-2 text-slate-400 font-normal normal-case">Use {'{{name}}'}, {'{{company}}'} for placeholders</span>
            </label>
            <textarea
              className="input w-full min-h-[160px] resize-y font-mono text-sm"
              placeholder={"Hi {{name}},\n\nI noticed that {{company}} is growing rapidly..."}
              value={content}
              onChange={e => setContent(e.target.value)}
            />
            <p className="text-xs text-slate-400 mt-1">{content.length} characters</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Tags</label>
            <div className="flex gap-2">
              <input
                className="input flex-1 text-sm"
                placeholder="Add a tag and press Enter"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
              />
              <button onClick={addTag} className="btn-secondary text-sm px-4">Add</button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2.5">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full font-medium">
                    #{tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-indigo-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} className="btn-primary">
            {snippet ? 'Save Changes' : 'Create Snippet'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SnippetsPage() {
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editSnippet, setEditSnippet] = useState<Snippet | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const supabase = createClient()

  const fetchSnippets = useCallback(async () => {
    const { data } = await supabase
      .from('snippets')
      .select('*')
      .order('created_at', { ascending: false })
    setSnippets(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchSnippets() }, [fetchSnippets])

  const filtered = snippets.filter(s => {
    const matchSearch = !search ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.content.toLowerCase().includes(search.toLowerCase()) ||
      s.tags?.some(t => t.includes(search.toLowerCase()))
    const matchCat = !categoryFilter || s.category === categoryFilter
    return matchSearch && matchCat
  })

  async function handleSave(data: Partial<Snippet>) {
    const { data: { session } } = await supabase.auth.getSession()
    if (editSnippet) {
      const { error } = await supabase.from('snippets').update({ ...data, updated_at: new Date().toISOString() }).eq('id', editSnippet.id)
      if (error) toast.error('Failed to update snippet')
      else { toast.success('Snippet updated'); fetchSnippets() }
    } else {
      const { error } = await supabase.from('snippets').insert({ ...data, created_by: session?.user.id })
      if (error) toast.error('Failed to create snippet')
      else { toast.success('Snippet created!'); fetchSnippets() }
    }
    setShowModal(false)
    setEditSnippet(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this snippet?')) return
    const { error } = await supabase.from('snippets').delete().eq('id', id)
    if (error) toast.error('Failed to delete')
    else { toast.success('Deleted'); fetchSnippets() }
  }

  function handleCopy(snippet: Snippet) {
    navigator.clipboard.writeText(snippet.content)
    setCopiedId(snippet.id)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div>
      <PageHeader
        title="Snippets"
        subtitle="Reusable message templates for your sales team"
        actions={
          <button
            onClick={() => { setEditSnippet(null); setShowModal(true) }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Snippet
          </button>
        }
      />

      <div className="p-8 space-y-5">
        {/* Filters */}
        <div className="card p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input pl-9 w-full"
              placeholder="Search snippets, tags..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setCategoryFilter('')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                !categoryFilter ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategoryFilter(c === categoryFilter ? '' : c)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  categoryFilter === c ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Snippets Grid */}
        {loading ? (
          <div className="text-center py-20 text-slate-400">Loading snippets...</div>
        ) : filtered.length === 0 ? (
          <div className="card p-16 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No snippets found</p>
            <p className="text-slate-400 text-sm mt-1">
              {snippets.length === 0
                ? 'Create your first reusable message template'
                : 'Try a different search or filter'}
            </p>
            {snippets.length === 0 && (
              <button
                onClick={() => { setEditSnippet(null); setShowModal(true) }}
                className="btn-primary mt-4 inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create First Snippet
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(snippet => (
              <div key={snippet.id} className="card p-5 flex flex-col gap-3 group hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 truncate text-sm">{snippet.title}</h3>
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[snippet.category] || CATEGORY_COLORS['Other']}`}>
                      {snippet.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCopy(snippet)}
                      title="Copy to clipboard"
                      className="p-1.5 hover:bg-green-50 rounded-md text-slate-400 hover:text-green-600 transition-colors"
                    >
                      {copiedId === snippet.id ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => { setEditSnippet(snippet); setShowModal(true) }}
                      title="Edit"
                      className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(snippet.id)}
                      title="Delete"
                      className="p-1.5 hover:bg-red-50 rounded-md text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div
                  className={`text-sm text-slate-600 bg-slate-50 rounded-lg p-3 font-mono whitespace-pre-wrap leading-relaxed cursor-pointer ${
                    expandedId === snippet.id ? '' : 'line-clamp-4'
                  }`}
                  onClick={() => setExpandedId(expandedId === snippet.id ? null : snippet.id)}
                >
                  {snippet.content}
                </div>

                {snippet.content.split('\n').length > 4 && (
                  <button
                    onClick={() => setExpandedId(expandedId === snippet.id ? null : snippet.id)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium text-left"
                  >
                    {expandedId === snippet.id ? 'Show less' : 'Show more'}
                  </button>
                )}

                {snippet.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {snippet.tags.map(tag => (
                      <span
                        key={tag}
                        onClick={() => setSearch(tag)}
                        className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full cursor-pointer hover:bg-indigo-100 transition-colors font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-xs text-slate-400">
                    {new Date(snippet.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <button
                    onClick={() => handleCopy(snippet)}
                    className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                  >
                    {copiedId === snippet.id ? (
                      <><Check className="w-3.5 h-3.5" /> Copied!</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" /> Copy</>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <SnippetModal
          snippet={editSnippet}
          onClose={() => { setShowModal(false); setEditSnippet(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
