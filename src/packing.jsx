import React, { useState } from 'react';
import { Plus, Trash2, Users, FolderPlus, ChevronDown, ChevronUp, CheckCircle2, Circle, UserCheck } from 'lucide-react';
import { Btn, Field, SectionTitle, Modal, Progress, Empty } from './ui.jsx';

export function Packing(ctx) {
  const { data, save, saveMany, remove, toast } = ctx;

  const [activeTab, setActiveTab] = useState('all'); // 'all' | traveler.id | 'shared'
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newCatModalOpen, setNewCatModalOpen] = useState(false);

  // Add Item Form State
  const [name, setName] = useState('');
  const [catId, setCatId] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [selectedTravelerIds, setSelectedTravelerIds] = useState([]);
  const [responsibleId, setResponsibleId] = useState('');
  const [notes, setNotes] = useState('');

  // Category Creation State
  const [newCatName, setNewCatName] = useState('');

  const cats = [...data.packing_categories].sort((a, b) => a.position - b.position);
  const travelers = data.travelers;

  const whom = id => travelers.find(p => p.id === id)?.name || 'Shared';

  // Open Add Modal
  function openAddModal(defaultOwnerId = null) {
    setName('');
    setCatId(cats[0]?.id || '');
    if (defaultOwnerId === 'shared') {
      setIsShared(true);
      setSelectedTravelerIds([]);
      setResponsibleId('');
    } else {
      setIsShared(false);
      setSelectedTravelerIds(defaultOwnerId ? [defaultOwnerId] : travelers.map(t => t.id));
      setResponsibleId('');
    }
    setNotes('');
    setAddModalOpen(true);
  }

  async function handleAddItem(e) {
    if (e) e.preventDefault();
    if (!name.trim() || !catId) return;

    if (isShared) {
      const ok = await save('packing_items', {
        name: name.trim(),
        category_id: catId,
        owner_id: null,
        responsible_id: responsibleId || null,
        notes: notes.trim(),
        quantity: 1,
        packed: false
      });
      if (ok) { setAddModalOpen(false); toast('Shared item added.'); }
    } else {
      if (selectedTravelerIds.length === 0) {
        toast('Select at least one person.');
        return;
      }
      const payload = selectedTravelerIds.map(tId => ({
        name: name.trim(),
        category_id: catId,
        owner_id: tId,
        responsible_id: null,
        notes: notes.trim(),
        quantity: 1,
        packed: false
      }));
      const ok = await saveMany('packing_items', payload);
      if (ok) { setAddModalOpen(false); toast('Items added to packing list.'); }
    }
  }

  async function handleAddCategory() {
    if (!newCatName.trim()) return;
    const ok = await save('packing_categories', { name: newCatName.trim(), position: cats.length });
    if (ok) { setNewCatModalOpen(false); setNewCatName(''); toast('Category created.'); }
  }

  async function handleDeleteCategory(cat) {
    const catItems = data.packing_items.filter(i => i.category_id === cat.id);
    const count = catItems.length;
    if (window.confirm(`Delete category "${cat.name}"${count > 0 ? ` and its ${count} item(s)` : ''}?`)) {
      for (const item of catItems) {
        await remove('packing_items', item, { allowUndo: false });
      }
      await remove('packing_categories', cat);
      toast(`Category "${cat.name}" deleted.`);
    }
  }

  // Filter displaying cards
  const displayPeople = travelers.filter(t => activeTab === 'all' || activeTab === t.id);
  const showSharedCard = activeTab === 'all' || activeTab === 'shared';

  const totalItems = data.packing_items.length;
  const totalPacked = data.packing_items.filter(i => i.packed).length;

  return (
    <div className="stack spacious">
      <SectionTitle
        title="Packing List"
        sub="Personal cards for each family member with checkboxes and category grouping"
        action={
          <Btn kind="primary" onClick={() => openAddModal()}>
            <Plus size={16} /> Add Item
          </Btn>
        }
      />

      {/* Person Filter Pills */}
      <div className="row wrap between align-center">
        <div className="filter-pills-bar" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', WebkitOverflowScrolling: 'touch', flex: 1 }}>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: '600',
              border: activeTab === 'all' ? '1px solid #2e5b97' : '1px solid #dfe5ed',
              background: activeTab === 'all' ? '#eaf2fd' : '#ffffff',
              color: activeTab === 'all' ? '#2e5b97' : '#475569',
              cursor: 'pointer'
            }}
          >
            All Cards
          </button>
          {travelers.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '0.82rem',
                fontWeight: '600',
                border: activeTab === t.id ? '1px solid #2e5b97' : '1px solid #dfe5ed',
                background: activeTab === t.id ? '#eaf2fd' : '#ffffff',
                color: activeTab === t.id ? '#2e5b97' : '#475569',
                cursor: 'pointer'
              }}
            >
              {t.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setActiveTab('shared')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: '600',
              border: activeTab === 'shared' ? '1px solid #2e5b97' : '1px solid #dfe5ed',
              background: activeTab === 'shared' ? '#eaf2fd' : '#ffffff',
              color: activeTab === 'shared' ? '#2e5b97' : '#475569',
              cursor: 'pointer'
            }}
          >
            Shared Items
          </button>
        </div>

        <Btn onClick={() => setNewCatModalOpen(true)} style={{ fontSize: '0.8rem' }}>
          <FolderPlus size={15} /> Categories
        </Btn>
      </div>

      {/* Overall Progress */}
      <div className="card stack compact" style={{ padding: '12px 16px' }}>
        <div className="row between">
          <strong>Total Packing Progress</strong>
          <span className="muted tiny">{totalPacked} of {totalItems} packed</span>
        </div>
        <Progress done={totalPacked} total={totalItems} />
      </div>

      {/* PERSON-CENTRIC CARDS */}
      <div className="stack" style={{ gap: '14px' }}>
        {displayPeople.map(person => {
          const personItems = data.packing_items.filter(i => i.owner_id === person.id);
          const personShared = data.packing_items.filter(i => !i.owner_id && i.responsible_id === person.id);
          const pPacked = personItems.filter(i => i.packed).length + personShared.filter(i => i.packed).length;
          const pTotal = personItems.length + personShared.length;

          return (
            <article key={person.id} className="card stack" style={{ border: '1px solid #cbd5e1', borderRadius: '12px', padding: '14px 16px', gap: '10px' }}>
              {/* Person Card Header */}
              <div className="row between align-center" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <div className="row align-center" style={{ gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#eaf2fd', color: '#2e5b97', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>
                    {person.name.charAt(0)}
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.98rem' }}>{person.name}'s List</strong>
                    <span className="muted tiny" style={{ marginLeft: '8px' }}>{pPacked}/{pTotal} packed</span>
                  </div>
                </div>
                <Btn kind="ghost" style={{ fontSize: '0.78rem', color: '#2e5b97', padding: '2px 8px' }} onClick={() => openAddModal(person.id)}>
                  <Plus size={14} /> Add
                </Btn>
              </div>

              {/* Shared Responsibilities assigned to this person */}
              {personShared.length > 0 && (
                <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '4px' }}>
                  <div className="muted tiny strong" style={{ color: '#2e5b97', marginBottom: '4px' }}>⚡ Shared Items Assigned:</div>
                  {personShared.map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                      <button
                        type="button"
                        onClick={() => save('packing_items', { packed: !item.packed }, item.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', flex: 1 }}
                      >
                        {item.packed ? <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} /> : <Circle size={18} style={{ color: '#cbd5e1', flexShrink: 0 }} />}
                        <span className={item.packed ? 'strike' : ''} style={{ fontSize: '0.9rem', color: '#1e293b' }}>{item.name}</span>
                      </button>
                      <Btn kind="ghost" onClick={() => remove('packing_items', item)} aria-label="Delete item" style={{ padding: '2px' }}>
                        <Trash2 size={14} style={{ color: '#94a3b8' }} />
                      </Btn>
                    </div>
                  ))}
                </div>
              )}

              {/* Categories inside Person Card */}
              {cats.map(cat => {
                const cItems = personItems.filter(i => i.category_id === cat.id);
                if (cItems.length === 0) return null;

                return (
                  <div key={cat.id} style={{ marginBottom: '4px' }}>
                    <div className="row between align-center" style={{ paddingBottom: '3px', borderBottom: '1px dashed #f1f5f9', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{cat.name}</span>
                      <span className="muted tiny" style={{ fontSize: '0.72rem' }}>{cItems.filter(i => i.packed).length}/{cItems.length}</span>
                    </div>

                    {cItems.map(item => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                        <button
                          type="button"
                          onClick={() => save('packing_items', { packed: !item.packed }, item.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', flex: 1 }}
                        >
                          {item.packed ? <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} /> : <Circle size={18} style={{ color: '#cbd5e1', flexShrink: 0 }} />}
                          <span className={item.packed ? 'strike' : ''} style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                            {item.name}
                            {item.notes && <small className="muted" style={{ marginLeft: '6px', fontSize: '0.75rem' }}>({item.notes})</small>}
                          </span>
                        </button>
                        <Btn kind="ghost" onClick={() => remove('packing_items', item)} aria-label="Delete item" style={{ padding: '2px' }}>
                          <Trash2 size={14} style={{ color: '#94a3b8' }} />
                        </Btn>
                      </div>
                    ))}
                  </div>
                );
              })}

              {personItems.length === 0 && personShared.length === 0 && (
                <div className="muted tiny" style={{ fontStyle: 'italic', padding: '4px 0' }}>
                  No items in {person.name}'s list yet. Tap + Add above.
                </div>
              )}
            </article>
          );
        })}

        {/* SHARED ITEMS CARD */}
        {showSharedCard && (() => {
          const sharedItems = data.packing_items.filter(i => !i.owner_id);
          const sPacked = sharedItems.filter(i => i.packed).length;

          return (
            <article className="card stack" style={{ border: '1px solid #cbd5e1', borderRadius: '12px', padding: '14px 16px', gap: '10px', background: '#fafafb' }}>
              <div className="row between align-center" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <div className="row align-center" style={{ gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>
                    <Users size={15} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.98rem' }}>Shared Trip Essentials</strong>
                    <span className="muted tiny" style={{ marginLeft: '8px' }}>{sPacked}/{sharedItems.length} packed</span>
                  </div>
                </div>
                <Btn kind="ghost" style={{ fontSize: '0.78rem', color: '#d97706', padding: '2px 8px' }} onClick={() => openAddModal('shared')}>
                  <Plus size={14} /> Add
                </Btn>
              </div>

              {cats.map(cat => {
                const cItems = sharedItems.filter(i => i.category_id === cat.id);
                if (cItems.length === 0) return null;

                return (
                  <div key={cat.id} style={{ marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{cat.name}</span>
                    {cItems.map(item => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                        <button
                          type="button"
                          onClick={() => save('packing_items', { packed: !item.packed }, item.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', flex: 1 }}
                        >
                          {item.packed ? <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} /> : <Circle size={18} style={{ color: '#cbd5e1', flexShrink: 0 }} />}
                          <span className={item.packed ? 'strike' : ''} style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                            {item.name}
                            {item.responsible_id && (
                              <small className="muted" style={{ marginLeft: '6px', fontSize: '0.75rem' }}>({whom(item.responsible_id)} bringing)</small>
                            )}
                          </span>
                        </button>
                        <Btn kind="ghost" onClick={() => remove('packing_items', item)} aria-label="Delete item" style={{ padding: '2px' }}>
                          <Trash2 size={14} style={{ color: '#94a3b8' }} />
                        </Btn>
                      </div>
                    ))}
                  </div>
                );
              })}

              {sharedItems.length === 0 && (
                <div className="muted tiny" style={{ fontStyle: 'italic', padding: '4px 0' }}>
                  No shared essentials added yet.
                </div>
              )}
            </article>
          );
        })()}
      </div>

      {/* --- ADD ITEM MODAL --- */}
      {addModalOpen && (
        <Modal title="Add Packing Item" onClose={() => setAddModalOpen(false)}>
          <form className="stack" onSubmit={handleAddItem} style={{ gap: '12px' }}>
            <Field label="Item Name">
              <input
                autoFocus
                placeholder="e.g. Winter Clothes, Toothbrush, Passport"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ fontSize: '15px', fontFamily: 'inherit' }}
                required
              />
            </Field>

            <div className="form-grid">
              <Field label="Category">
                <select value={catId} onChange={e => setCatId(e.target.value)} style={{ fontSize: '15px', fontFamily: 'inherit' }} required>
                  {cats.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Item Type">
                <select value={isShared ? 'shared' : 'personal'} onChange={e => setIsShared(e.target.value === 'shared')} style={{ fontSize: '15px', fontFamily: 'inherit' }}>
                  <option value="personal">Personal Item</option>
                  <option value="shared">Shared Item</option>
                </select>
              </Field>
            </div>

            {!isShared ? (
              <Field label="Add to who's card?">
                <div className="stack compact" style={{ paddingTop: '4px', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedTravelerIds(travelers.map(t => t.id))}
                      style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.78rem', border: '1px solid #2e5b97', background: '#eaf2fd', color: '#2e5b97', fontWeight: 600, cursor: 'pointer' }}
                    >
                      All Family
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTravelerIds([])}
                      style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.78rem', border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', cursor: 'pointer' }}
                    >
                      Clear
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {travelers.map(t => {
                      const isSel = selectedTravelerIds.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            if (isSel) setSelectedTravelerIds(selectedTravelerIds.filter(id => id !== t.id));
                            else setSelectedTravelerIds([...selectedTravelerIds, t.id]);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 12px',
                            borderRadius: '16px',
                            fontSize: '0.82rem',
                            fontWeight: '600',
                            border: isSel ? '1px solid #16a34a' : '1px solid #cbd5e1',
                            background: isSel ? '#f0fdf4' : '#ffffff',
                            color: isSel ? '#15803d' : '#475569',
                            cursor: 'pointer'
                          }}
                        >
                          <span>{isSel ? '✓' : '○'}</span>
                          <span>{t.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Field>
            ) : (
              <Field label="Who is bringing this? (Optional)">
                <select value={responsibleId} onChange={e => setResponsibleId(e.target.value)} style={{ fontSize: '15px', fontFamily: 'inherit' }}>
                  <option value="">Unassigned</option>
                  {travelers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Notes (Optional)">
              <input placeholder="e.g. 2 sets, pack in carry-on" value={notes} onChange={e => setNotes(e.target.value)} style={{ fontSize: '15px', fontFamily: 'inherit' }} />
            </Field>

            <div className="row end" style={{ paddingTop: '8px' }}>
              <Btn onClick={() => setAddModalOpen(false)}>Cancel</Btn>
              <Btn kind="primary" type="submit" disabled={!name.trim() || !catId || (!isShared && selectedTravelerIds.length === 0)}>
                Add Item
              </Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* --- CATEGORY MODAL --- */}
      {newCatModalOpen && (
        <Modal title="Categories" onClose={() => setNewCatModalOpen(false)}>
          <div className="stack">
            <div className="stack compact">
              {cats.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                  <Btn kind="ghost" onClick={() => handleDeleteCategory(c)}>
                    <Trash2 size={15} style={{ color: '#ef4444' }} />
                  </Btn>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }} className="stack compact">
              <strong style={{ fontSize: '0.88rem' }}>Add New Category</strong>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  placeholder="e.g. Swimwear, Baby Gear..."
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  style={{ fontSize: '15px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', flex: 1, fontFamily: 'inherit' }}
                />
                <Btn kind="primary" disabled={!newCatName.trim()} onClick={handleAddCategory}>
                  <Plus size={16} /> Add
                </Btn>
              </div>
            </div>

            <div className="row end" style={{ paddingTop: '8px' }}>
              <Btn onClick={() => setNewCatModalOpen(false)}>Done</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
