import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'

// Item catalog: names only. Price is entered on each bill.
export default function ItemsPage() {
  const toast = useToast()
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [name, setName]       = useState('')
  const [searchQ, setSearchQ] = useState('')
  const [saving, setSaving]   = useState(false)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('items').select('id, name').order('name')
    if (error) toast('Failed to load items', 'error')
    else setItems(data || [])
    setLoading(false)
  }, [toast])

  useEffect(() => { fetchItems() }, [fetchItems])

  const handleAdd = async () => {
    const clean = name.trim()
    if (!clean) return toast('Enter an item name', 'error')
    if (items.some(i => i.name.toLowerCase() === clean.toLowerCase())) return toast(`"${clean}" already exists`, 'error')
    setSaving(true)
    const { error } = await supabase.from('items').insert({ name: clean })
    if (error) toast(error.code === '23505' ? `"${clean}" already exists` : 'Failed to save item: ' + error.message, 'error')
    else { toast(`"${clean}" added!`); setName(''); fetchItems() }
    setSaving(false)
  }

  const handleDelete = async (id, itemName) => {
    if (!confirm(`Delete "${itemName}"?`)) return
    const { error } = await supabase.from('items').delete().eq('id', id)
    if (error) toast('Failed to delete', 'error')
    else { toast(`"${itemName}" deleted`); fetchItems() }
  }

  const filtered = items.filter(i => i.name.toLowerCase().includes(searchQ.toLowerCase()))

  return (
    <div className="page-wide">
      <h1 className="page-title">Items</h1>
      <p className="page-subtitle">Saved item names — suggested while billing. Price is entered on each bill.</p>

      <div className="card" style={{ padding: 14, marginBottom: 16, display: 'flex', gap: 10 }}>
        <input className="form-input" placeholder="New item name, e.g. Haldi 100g" value={name}
          onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} />
        <button className="btn btn-primary" style={{ whiteSpace: 'nowrap' }} disabled={saving} onClick={handleAdd}>
          {saving ? '⏳' : '+ Add'}
        </button>
      </div>

      {items.length > 6 && (
        <input className="form-input" style={{ marginBottom: 12 }} placeholder="Search items…"
          value={searchQ} onChange={e => setSearchQ(e.target.value)} />
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="empty-state"><div className="empty-state-icon">⏳</div><div className="empty-state-title">Loading…</div></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <div className="empty-state-title">{items.length === 0 ? 'No items yet' : 'No matches'}</div>
          </div>
        ) : filtered.map((item, idx) => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <span style={{ fontWeight: 600, fontSize: '0.925rem' }}>{item.name}</span>
            <button className="btn btn-sm btn-secondary" title="Delete" onClick={() => handleDelete(item.id, item.name)}>🗑️</button>
          </div>
        ))}
      </div>
    </div>
  )
}
