import React, { useState } from 'react';
import { Plus, Trash2, Users, FolderPlus, ChevronDown, ChevronRight, Check, X } from 'lucide-react';
import { Btn, Field, SectionTitle, Select, Modal, Progress, Empty } from './ui.jsx';

export function Packing(ctx) {
  const { data, save, saveMany, remove, toast } = ctx;
  const [mode, setMode] = useState('people'); // 'people' | 'bags'
  const [owner, setOwner] = useState('all');
  const [bag, setBag] = useState('all');
  const [openCats, setOpenCats] = useState({});
  const [editingId, setEditingId] = useState(null);

  // Quick-Add Form State
  const [newItemName, setNewItemName] = useState('');
  const [newCatId, setNewCatId] = useState('');
  const [newAssignee, setNewAssignee] = useState('everyone'); // 'everyone' | 'shared' | traveler.id
  const [newQty, setNewQty] = useState(1);

  // Category & Bag Modals
  const [newCategory, setNewCategory] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [newBag, setNewBag] = useState(false);
  const [bagName, setBagName] = useState('');

  const cats = [...data.packing_categories].sort((a, b) => a.position - b.position);
  const bags = data.packing_bags;
  const travelers = data.travelers;

  const whom = id => travelers.find(p => p.id === id)?.name || 'Shared';
  const bagNameOf = id => bags.find(b => b.id === id)?.name || 'Unassigned';

  const personal = mode === 'people'
    ? data.packing_items.filter(i => owner === 'all' || (owner === 'shared' && !i.owner_id) || i.owner_id === owner)
    : data.packing_items.filter(i => bag === 'all' || (bag === 'none' && !i.bag_id) || i.bag_id === bag);

  const sharedResponsibilities = mode === 'people' && !['all', 'shared'].includes(owner)
    ? data.packing_items.filter(i => !i.owner_id && i.responsible_id === owner)
    : [];

  const tracked = [...sharedResponsibilities, ...personal];
  const done = tracked.filter(i => i.packed).length;
  const sortedCats = cats.filter(c => personal.some(i => i.category_id === c.id));

  // Default quick add category if not set
  const activeCatId = newCatId || cats[0]?.id || '';

  async function handleQuickAdd(e) {
    if (e) e.preventDefault();
    if (!newItemName.trim() || !activeCatId) return;

    const basePayload = {
      name: newItemName.trim(),
      category_id: activeCatId,
      quantity: Number(newQty) || 1,
      packed: false,
      notes: ''
    };

    let ok = false;
    if (newAssignee === 'everyone') {
      const variants = travelers.map(p => ({ ...basePayload, owner_id: p.id, responsible_id: null }));
      ok = await saveMany('packing_items', variants);
    } else if (newAssignee === 'shared') {
      ok = await save('packing_items', { ...basePayload, owner_id: null, responsible_id: null });
    } else {
      ok = await save('packing_items', { ...basePayload, owner_id: newAssignee, responsible_id: null });
    }

    if (ok) {
      setNewItemName('');
      toast('Item added to packing list.');
    }
  }

  async function handleDeleteGroup(group) {
    if (group.items.length === 1) {
      if (window.confirm(`Delete "${group.name}"?`)) {
        await remove('packing_items', group.items[0]);
      }
      return;
    }

    const choice = window.confirm(`Delete "${group.name}" for ALL family members?\n\nClick OK to delete for everyone, or Cancel to keep.`);
    if (choice) {
      for (const item of group.items) {
        await remove('packing_items', item, { allowUndo: false });
      }
      toast(`Deleted "${group.name}" for everyone.`);
    }
  }

  async function addCategory() {
    if (!categoryName.trim()) return;
    const ok = await save('packing_categories', { name: categoryName.trim(), position: cats.length });
    if (ok) { setNewCategory(false); setCategoryName(''); }
  }

  async function addBag() {
    if (!bagName.trim()) return;
    const ok = await save('packing_bags', { name: bagName.trim() });
    if (ok) { setNewBag(false); setBagName(''); }
  }

  return (
    <div className="stack spacious">
      <SectionTitle title="Packing List" sub="Personal lists, shared responsibilities and bag contents — without duplicates" />

      {/* Mode Switcher Tabs */}
      <div className="tab-row">
        <button className={mode === 'people' ? 'active' : ''} onClick={() => setMode('people')}>By person / Shared</button>
        <button className={mode === 'bags' ? 'active' : ''} onClick={() => setMode('bags')}>By bag</button>
      </div>

      {/* Filter Pill Bar */}
      <div className="stack compact">
        <div className="row between align-center wrap">
          {mode === 'people' ? (
            <div className="filter-pills-bar" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', WebkitOverflowScrolling: 'touch', flex: 1 }}>
              <button type="button" className={`pill-btn ${owner === 'all' ? 'active' : ''}`} onClick={() => setOwner('all')} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '600', border: owner === 'all' ? '1px solid #2e5b97' : '1px solid #dfe5ed', background: owner === 'all' ? '#eaf2fd' : '#ffffff', color: owner === 'all' ? '#2e5b97' : '#475569', cursor: 'pointer' }}>All</button>
              <button type="button" className={`pill-btn ${owner === 'shared' ? 'active' : ''}`} onClick={() => setOwner('shared')} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '600', border: owner === 'shared' ? '1px solid #2e5b97' : '1px solid #dfe5ed', background: owner === 'shared' ? '#eaf2fd' : '#ffffff', color: owner === 'shared' ? '#2e5b97' : '#475569', cursor: 'pointer' }}>Shared</button>
              {travelers.map(t => (
                <button key={t.id} type="button" className={`pill-btn ${owner === t.id ? 'active' : ''}`} onClick={() => setOwner(t.id)} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '600', border: owner === t.id ? '1px solid #2e5b97' : '1px solid #dfe5ed', background: owner === t.id ? '#eaf2fd' : '#ffffff', color: owner === t.id ? '#2e5b97' : '#475569', cursor: 'pointer' }}>{t.name}</button>
              ))}
            </div>
          ) : (
            <div className="row wrap align-center" style={{ flex: 1 }}>
              <div className="filter-pills-bar" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', WebkitOverflowScrolling: 'touch' }}>
                <button type="button" className={`pill-btn ${bag === 'all' ? 'active' : ''}`} onClick={() => setBag('all')} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '600', border: bag === 'all' ? '1px solid #2e5b97' : '1px solid #dfe5ed', background: bag === 'all' ? '#eaf2fd' : '#ffffff', color: bag === 'all' ? '#2e5b97' : '#475569', cursor: 'pointer' }}>All bags</button>
                <button type="button" className={`pill-btn ${bag === 'none' ? 'active' : ''}`} onClick={() => setBag('none')} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '600', border: bag === 'none' ? '1px solid #2e5b97' : '1px solid #dfe5ed', background: bag === 'none' ? '#eaf2fd' : '#ffffff', color: bag === 'none' ? '#2e5b97' : '#475569', cursor: 'pointer' }}>Unassigned</button>
                {bags.map(b => (
                  <button key={b.id} type="button" className={`pill-btn ${bag === b.id ? 'active' : ''}`} onClick={() => setBag(b.id)} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '600', border: bag === b.id ? '1px solid #2e5b97' : '1px solid #dfe5ed', background: bag === b.id ? '#eaf2fd' : '#ffffff', color: bag === b.id ? '#2e5b97' : '#475569', cursor: 'pointer' }}>{b.name}</button>
                ))}
              </div>
              <Btn onClick={() => setNewBag(true)}><Plus size={15} /> New bag</Btn>
            </div>
          )}
          <Btn onClick={() => setNewCategory(true)}><FolderPlus size={16} /> Category</Btn>
        </div>
      </div>

      {/* Progress Summary */}
      <div className="card stack compact">
        <div className="row between">
          <strong>{mode === 'people' ? (owner === 'all' ? 'All family items' : owner === 'shared' ? 'Shared packing' : whom(owner)) : (bag === 'all' ? 'All bags' : bag === 'none' ? 'Not assigned' : bagNameOf(bag))}</strong>
          <span className="muted tiny">{done} of {tracked.length} packed</span>
        </div>
        <Progress done={done} total={tracked.length} />
      </div>

      {/* FAST INLINE QUICK-ADD CARD */}
      <form className="card stack compact" onSubmit={handleQuickAdd} style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <strong style={{ fontSize: '0.88rem', color: '#334155' }}>⚡ Quick Add Item</strong>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr auto', gap: '8px' }}>
          <input
            placeholder="Item name (e.g. Toothbrush, Jacket)..."
            value={newItemName}
            onChange={e => setNewItemName(e.target.value)}
            style={{ fontSize: '16px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
          <Btn kind="primary" type="submit" disabled={!newItemName.trim() || !activeCatId}>
            <Plus size={16} /> Add
          </Btn>
        </div>

        <div className="row wrap align-center" style={{ gap: '12px', paddingTop: '4px' }}>
          {/* Category Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="muted tiny">Category:</span>
            <select
              value={activeCatId}
              onChange={e => setNewCatId(e.target.value)}
              style={{ fontSize: '0.82rem', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
            >
              {cats.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Assignee Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            <span className="muted tiny">For:</span>
            <button
              type="button"
              onClick={() => setNewAssignee('everyone')}
              style={{
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '0.78rem',
                fontWeight: '600',
                border: newAssignee === 'everyone' ? '1px solid #2e5b97' : '1px solid #cbd5e1',
                background: newAssignee === 'everyone' ? '#eaf2fd' : '#fff',
                color: newAssignee === 'everyone' ? '#2e5b97' : '#64748b',
                cursor: 'pointer'
              }}
            >
              All Family
            </button>
            <button
              type="button"
              onClick={() => setNewAssignee('shared')}
              style={{
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '0.78rem',
                fontWeight: '600',
                border: newAssignee === 'shared' ? '1px solid #2e5b97' : '1px solid #cbd5e1',
                background: newAssignee === 'shared' ? '#eaf2fd' : '#fff',
                color: newAssignee === 'shared' ? '#2e5b97' : '#64748b',
                cursor: 'pointer'
              }}
            >
              Shared
            </button>
            {travelers.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setNewAssignee(t.id)}
                style={{
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '0.78rem',
                  fontWeight: '600',
                  border: newAssignee === t.id ? '1px solid #2e5b97' : '1px solid #cbd5e1',
                  background: newAssignee === t.id ? '#eaf2fd' : '#fff',
                  color: newAssignee === t.id ? '#2e5b97' : '#64748b',
                  cursor: 'pointer'
                }}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      </form>

      {/* Shared Responsibilities */}
      {mode === 'people' && sharedResponsibilities.length > 0 && (
        <section className="card stack compact responsibility-section">
          <div className="row"><Users size={18} /><strong>Shared responsibilities</strong></div>
          <p className="muted tiny">Shared items assigned to {whom(owner)}. Ticking them updates Shared and By Bag.</p>
          {sharedResponsibilities.map(i => (
            <div className="pack-row" key={i.id}>
              <label className="check-with-content">
                <input type="checkbox" checked={i.packed} onChange={e => save('packing_items', { packed: e.target.checked }, i.id)} />
                <span className={i.packed ? 'strike' : ''}>{i.name} {i.quantity > 1 && <span className="muted">× {i.quantity}</span>}</span>
              </label>
              <Btn kind="ghost" aria-label="Delete item" onClick={() => remove('packing_items', i)}><Trash2 size={16} /></Btn>
            </div>
          ))}
        </section>
      )}

      {/* Categories & Checklist Items */}
      <div className="stack compact">
        {sortedCats.map(c => {
          const subset = personal.filter(i => i.category_id === c.id);
          const open = openCats[c.id] !== false;

          // Group identical items (e.g. Winter Clothes across family members)
          const grouped = [];
          const map = new Map();
          subset.forEach(item => {
            const k = item.name.trim().toLowerCase();
            if (!map.has(k)) {
              const entry = { name: item.name, items: [item] };
              map.set(k, entry);
              grouped.push(entry);
            } else {
              map.get(k).items.push(item);
            }
          });

          return (
            <section className="card pack-category" key={c.id}>
              <button className="category-toggle" onClick={() => setOpenCats(p => ({ ...p, [c.id]: !open }))}>
                <span>
                  <strong>{c.name}</strong>
                  <small className="muted">{subset.filter(i => i.packed).length}/{subset.length} packed</small>
                </span>
                {open ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
              </button>

              {open && (
                <div className="pack-items">
                  {grouped.map(group => {
                    // Single Item View
                    if (group.items.length === 1) {
                      const i = group.items[0];
                      const isEditingThis = editingId === i.id;

                      return (
                        <div className="pack-row" key={i.id} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <label className="check-with-content" style={{ flex: 1 }}>
                              <input type="checkbox" checked={i.packed} onChange={e => save('packing_items', { packed: e.target.checked }, i.id)} />
                              <span>
                                <span className={i.packed ? 'strike' : ''}>{i.name} {i.quantity > 1 && <span className="muted">× {i.quantity}</span>}</span>
                                {(mode === 'bags' || owner === 'all' || owner === 'shared') && <small className="muted">{whom(i.owner_id)}{!i.owner_id && i.responsible_id ? ` · ${whom(i.responsible_id)} responsible` : ''}</small>}
                                {i.notes && <small className="muted clamp">{i.notes}</small>}
                              </span>
                            </label>
                            <div className="row compact">
                              <Btn kind="ghost" onClick={() => setEditingId(isEditingThis ? null : i.id)} style={{ fontSize: '0.76rem' }}>
                                {isEditingThis ? 'Close' : 'Details'}
                              </Btn>
                              <Btn kind="ghost" onClick={() => remove('packing_items', i)} aria-label="Delete item"><Trash2 size={16} /></Btn>
                            </div>
                          </div>

                          {/* Collapsible Inline Details Editor */}
                          {isEditingThis && (
                            <div style={{ background: '#f1f5f9', padding: '10px', borderRadius: '8px', marginTop: '8px' }} className="stack compact">
                              <div className="form-grid">
                                <Field label="Bag">
                                  <select value={i.bag_id || ''} onChange={e => save('packing_items', { bag_id: e.target.value || null }, i.id)}>
                                    <option value="">No bag assigned</option>
                                    {bags.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                  </select>
                                </Field>
                                <Field label="Quantity">
                                  <input type="number" min="1" value={i.quantity} onChange={e => save('packing_items', { quantity: Number(e.target.value) || 1 }, i.id)} />
                                </Field>
                              </div>
                              <Field label="Notes">
                                <input value={i.notes || ''} onChange={e => save('packing_items', { notes: e.target.value }, i.id)} placeholder="Optional note..." />
                              </Field>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Grouped Item View (e.g. Winter Clothes across family)
                    return (
                      <div className="pack-row grouped-pack-row" key={group.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                          <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{group.name}</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {group.items.map(item => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => save('packing_items', { packed: !item.packed }, item.id)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 10px',
                                  borderRadius: '14px',
                                  fontSize: '0.8rem',
                                  fontWeight: '600',
                                  border: item.packed ? '1px solid #16a34a' : '1px solid #cbd5e1',
                                  backgroundColor: item.packed ? '#f0fdf4' : '#ffffff',
                                  color: item.packed ? '#15803d' : '#475569',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                                title={`Toggle packing for ${whom(item.owner_id)}`}
                              >
                                <span>{item.packed ? '✓' : '○'}</span>
                                <span>{whom(item.owner_id)}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                        <Btn kind="ghost" onClick={() => handleDeleteGroup(group)} aria-label="Delete grouped item"><Trash2 size={16} /></Btn>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}

        {!sortedCats.length && <Empty text="No items in this view. Add an item above." />}
      </div>

      {/* Add Category Modal */}
      {newCategory && (
        <Modal title="Add packing category" onClose={() => setNewCategory(false)}>
          <div className="stack">
            <Field label="Name"><input value={categoryName} onChange={e => setCategoryName(e.target.value)} placeholder="e.g. Swimwear" autoFocus /></Field>
            <div className="row end">
              <Btn onClick={() => setNewCategory(false)}>Cancel</Btn>
              <Btn kind="primary" disabled={!categoryName.trim()} onClick={addCategory}>Create</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Bag Modal */}
      {newBag && (
        <Modal title="Add bag" onClose={() => setNewBag(false)}>
          <div className="stack">
            <Field label="Bag name"><input value={bagName} onChange={e => setBagName(e.target.value)} placeholder="e.g. Travel Day Bag" autoFocus /></Field>
            <div className="row end">
              <Btn onClick={() => setNewBag(false)}>Cancel</Btn>
              <Btn kind="primary" disabled={!bagName.trim()} onClick={addBag}>Create</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
