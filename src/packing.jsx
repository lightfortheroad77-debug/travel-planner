import React, { useState } from 'react';
import { Plus, Trash2, Users, FolderPlus, ChevronDown, ChevronUp, ChevronRight, Check, X, Luggage, UserCheck, Pencil } from 'lucide-react';
import { Btn, Field, SectionTitle, Modal, Progress, Empty } from './ui.jsx';

export function Packing(ctx) {
  const { data, save, saveMany, remove, toast } = ctx;

  // Navigation & Filter States
  const [filter, setFilter] = useState('all'); // 'all' | 'shared' | traveler.id
  const [openCats, setOpenCats] = useState({});

  // Modals State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(null);
  const [manageCatsOpen, setManageCatsOpen] = useState(false);

  // Add Form State
  const [itemName, setItemName] = useState('');
  const [catId, setCatId] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [selectedTravelers, setSelectedTravelers] = useState([]); // Array of traveler IDs
  const [responsibleId, setResponsibleId] = useState('');
  const [bagId, setBagId] = useState('');
  const [notes, setNotes] = useState('');

  // Category Editing State
  const [categoryName, setCategoryName] = useState('');
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatName, setEditingCatName] = useState('');

  const cats = [...data.packing_categories].sort((a, b) => a.position - b.position);
  const bags = data.packing_bags;
  const travelers = data.travelers;

  const whom = id => travelers.find(p => p.id === id)?.name || 'Shared';

  // Filter items based on active tab selection
  const items = data.packing_items.filter(i => {
    if (filter === 'all') return true;
    if (filter === 'shared') return !i.owner_id;
    return i.owner_id === filter;
  });

  // Shared items assigned to active person for packing responsibility
  const sharedForPerson = filter !== 'all' && filter !== 'shared'
    ? data.packing_items.filter(i => !i.owner_id && i.responsible_id === filter)
    : [];

  const trackedAll = [...items, ...sharedForPerson];
  const packedCount = trackedAll.filter(i => i.packed).length;

  // Open Add Item Modal with smart defaults
  function openAddModal() {
    setItemName('');
    setCatId(cats[0]?.id || '');
    setIsShared(false);
    setSelectedTravelers(filter !== 'all' && filter !== 'shared' ? [filter] : travelers.map(t => t.id));
    setResponsibleId('');
    setBagId('');
    setNotes('');
    setAddModalOpen(true);
  }

  // Handle Add Form Submission
  async function handleCreateItem(e) {
    if (e) e.preventDefault();
    if (!itemName.trim() || !catId) return;

    const basePayload = {
      name: itemName.trim(),
      category_id: catId,
      bag_id: bagId || null,
      notes: notes.trim(),
      quantity: 1,
      packed: false
    };

    let ok = false;
    if (isShared) {
      ok = await save('packing_items', {
        ...basePayload,
        owner_id: null,
        responsible_id: responsibleId || null
      });
    } else {
      if (selectedTravelers.length === 0) {
        toast('Select at least one person.');
        return;
      }
      const payloads = selectedTravelers.map(tId => ({
        ...basePayload,
        owner_id: tId,
        responsible_id: null
      }));
      ok = await saveMany('packing_items', payloads);
    }

    if (ok) {
      setAddModalOpen(false);
      toast('Item added to packing list.');
    }
  }

  // Delete single item for 1 person
  async function handleDeleteSingle(item) {
    const name = whom(item.owner_id);
    if (window.confirm(`Delete "${item.name}" for ${name}?`)) {
      await remove('packing_items', item);
      setDeletingGroup(null);
    }
  }

  // Delete grouped item for everyone
  async function handleDeleteEveryone(group) {
    if (window.confirm(`Delete "${group.name}" for EVERYONE?`)) {
      for (const item of group.items) {
        await remove('packing_items', item, { allowUndo: false });
      }
      setDeletingGroup(null);
      toast(`Deleted "${group.name}" for everyone.`);
    }
  }

  // Delete a packing category and all items inside it
  async function handleDeleteCategory(cat) {
    const catItems = data.packing_items.filter(i => i.category_id === cat.id);
    const msg = catItems.length > 0
      ? `Delete category "${cat.name}" and all ${catItems.length} item(s) in it?`
      : `Delete category "${cat.name}"?`;

    if (window.confirm(msg)) {
      for (const item of catItems) {
        await remove('packing_items', item, { allowUndo: false });
      }
      const ok = await remove('packing_categories', cat);
      if (ok) toast(`Category "${cat.name}" deleted.`);
    }
  }

  // Rename a packing category
  async function handleRenameCategory(catIdToRename, newName) {
    if (!newName.trim()) return;
    const cat = cats.find(c => c.id === catIdToRename);
    if (!cat || cat.name === newName.trim()) return;
    const ok = await save('packing_categories', { name: newName.trim(), position: cat.position }, cat.id);
    if (ok) {
      setEditingCatId(null);
      toast('Category renamed.');
    }
  }

  // Toggle selection for traveler chips in Add Modal
  function toggleTravelerChip(tId) {
    if (selectedTravelers.includes(tId)) {
      setSelectedTravelers(selectedTravelers.filter(id => id !== tId));
    } else {
      setSelectedTravelers([...selectedTravelers, tId]);
    }
  }

  async function createCategory() {
    if (!categoryName.trim()) return;
    const ok = await save('packing_categories', { name: categoryName.trim(), position: cats.length });
    if (ok) { setCategoryName(''); toast('Category added.'); }
  }

  return (
    <div className="stack spacious">
      <SectionTitle
        title="Packing List"
        sub="Organise items by traveler or shared trip essentials"
        action={
          <Btn kind="primary" onClick={openAddModal}>
            <Plus size={16} /> Add Item
          </Btn>
        }
      />

      {/* Filter Pill Row & Manage Categories Button */}
      <div className="row wrap between align-center">
        <div className="filter-pills-bar" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', WebkitOverflowScrolling: 'touch', flex: 1 }}>
          <button
            type="button"
            className={`pill-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '0.84rem',
              fontWeight: '600',
              border: filter === 'all' ? '1px solid #2e5b97' : '1px solid #dfe5ed',
              background: filter === 'all' ? '#eaf2fd' : '#ffffff',
              color: filter === 'all' ? '#2e5b97' : '#475569',
              cursor: 'pointer'
            }}
          >
            All Family
          </button>
          <button
            type="button"
            className={`pill-btn ${filter === 'shared' ? 'active' : ''}`}
            onClick={() => setFilter('shared')}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '0.84rem',
              fontWeight: '600',
              border: filter === 'shared' ? '1px solid #2e5b97' : '1px solid #dfe5ed',
              background: filter === 'shared' ? '#eaf2fd' : '#ffffff',
              color: filter === 'shared' ? '#2e5b97' : '#475569',
              cursor: 'pointer'
            }}
          >
            Shared
          </button>
          {travelers.map(t => (
            <button
              key={t.id}
              type="button"
              className={`pill-btn ${filter === t.id ? 'active' : ''}`}
              onClick={() => setFilter(t.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '0.84rem',
                fontWeight: '600',
                border: filter === t.id ? '1px solid #2e5b97' : '1px solid #dfe5ed',
                background: filter === t.id ? '#eaf2fd' : '#ffffff',
                color: filter === t.id ? '#2e5b97' : '#475569',
                cursor: 'pointer'
              }}
            >
              {t.name}
            </button>
          ))}
        </div>

        <Btn onClick={() => setManageCatsOpen(true)} style={{ fontSize: '0.8rem' }}>
          <FolderPlus size={15} /> Categories
        </Btn>
      </div>

      {/* Progress Header Card */}
      <div className="card stack compact">
        <div className="row between">
          <strong>{filter === 'all' ? 'All Family Items' : filter === 'shared' ? 'Shared Trip Essentials' : `${whom(filter)}'s Checklist`}</strong>
          <span className="muted tiny">{packedCount} of {trackedAll.length} packed</span>
        </div>
        <Progress done={packedCount} total={trackedAll.length} />
      </div>

      {/* Shared Responsibilities for Individual Traveler View */}
      {filter !== 'all' && filter !== 'shared' && sharedForPerson.length > 0 && (
        <section className="card stack compact" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <div className="row align-center" style={{ gap: '6px' }}>
            <UserCheck size={18} style={{ color: '#2e5b97' }} />
            <strong style={{ fontSize: '0.92rem', color: '#1e293b' }}>Shared Responsibilities</strong>
          </div>
          <p className="muted tiny">Items assigned to {whom(filter)} to bring for the whole group.</p>

          <div className="stack compact" style={{ paddingTop: '4px' }}>
            {sharedForPerson.map(item => (
              <div key={item.id} className="pack-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0' }}>
                <label className="check-with-content" style={{ flex: 1, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={item.packed}
                    onChange={e => save('packing_items', { packed: e.target.checked }, item.id)}
                  />
                  <span className={item.packed ? 'strike' : ''} style={{ fontWeight: 600 }}>{item.name}</span>
                </label>
                <Btn kind="ghost" onClick={() => remove('packing_items', item)} aria-label="Delete item">
                  <Trash2 size={16} />
                </Btn>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Categories & Items Checklist */}
      <div className="stack compact">
        {cats.map(cat => {
          const catItems = items.filter(i => i.category_id === cat.id);
          const isOpen = openCats[cat.id] !== false;

          // If filtering for a single person / shared and there are no items in this category, hide empty ones
          if (filter !== 'all' && catItems.length === 0) return null;

          // Group identical item names for "All Family" view
          const groupedMap = new Map();
          catItems.forEach(item => {
            const key = item.name.trim().toLowerCase();
            if (!groupedMap.has(key)) {
              groupedMap.set(key, { name: item.name, items: [item] });
            } else {
              groupedMap.get(key).items.push(item);
            }
          });
          const groups = Array.from(groupedMap.values());

          return (
            <section className="card pack-category" key={cat.id}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                  className="category-toggle"
                  onClick={() => setOpenCats(prev => ({ ...prev, [cat.id]: !isOpen }))}
                  style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <span>
                    <strong>{cat.name}</strong>
                    <small className="muted" style={{ marginLeft: '8px' }}>{catItems.filter(i => i.packed).length}/{catItems.length} packed</small>
                  </span>
                  {isOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                </button>

                <Btn
                  kind="ghost"
                  onClick={e => { e.stopPropagation(); handleDeleteCategory(cat); }}
                  title={`Delete category "${cat.name}"`}
                  aria-label="Delete category"
                  style={{ padding: '6px', color: '#94a3b8' }}
                >
                  <Trash2 size={16} />
                </Btn>
              </div>

              {isOpen && (
                <div className="pack-items">
                  {groups.map(group => {
                    // Single item view (Individual traveler / Shared tab)
                    if (group.items.length === 1) {
                      const item = group.items[0];
                      return (
                        <div className="pack-row" key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                          <label className="check-with-content" style={{ flex: 1, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={item.packed}
                              onChange={e => save('packing_items', { packed: e.target.checked }, item.id)}
                            />
                            <span>
                              <span className={item.packed ? 'strike' : ''} style={{ fontWeight: 500 }}>{item.name}</span>
                              {filter === 'shared' && item.responsible_id && (
                                <small className="muted"> · {whom(item.responsible_id)} responsible</small>
                              )}
                              {item.notes && <small className="muted clamp">{item.notes}</small>}
                            </span>
                          </label>
                          <Btn kind="ghost" onClick={() => remove('packing_items', item)} aria-label="Delete item">
                            <Trash2 size={16} />
                          </Btn>
                        </div>
                      );
                    }

                    // Grouped view for "All Family" tab with 1-tap person badges
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
                        <Btn kind="ghost" onClick={() => setDeletingGroup(group)} aria-label="Delete options">
                          <Trash2 size={16} />
                        </Btn>
                      </div>
                    );
                  })}

                  {catItems.length === 0 && (
                    <div className="muted tiny" style={{ padding: '8px 0', fontStyle: 'italic' }}>
                      No items in this category yet.
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}

        {!cats.length && <Empty text="No packing categories found." />}
      </div>

      {/* --- MODAL: ADD PACKING ITEM --- */}
      {addModalOpen && (
        <Modal title="Add Packing Item" onClose={() => setAddModalOpen(false)}>
          <form className="stack" onSubmit={handleCreateItem}>
            <Field label="Item Name">
              <input
                autoFocus
                placeholder="e.g. Winter Jacket, Toothbrush, Power Bank"
                value={itemName}
                onChange={e => setItemName(e.target.value)}
                required
              />
            </Field>

            <div className="form-grid">
              <Field label="Category">
                <select value={catId} onChange={e => setCatId(e.target.value)} required>
                  {cats.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Type">
                <select value={isShared ? 'shared' : 'personal'} onChange={e => setIsShared(e.target.value === 'shared')}>
                  <option value="personal">Personal Item(s)</option>
                  <option value="shared">Shared Trip Essential</option>
                </select>
              </Field>
            </div>

            {/* Traveler Chip Picker for Personal Items */}
            {!isShared ? (
              <Field label="Who needs this item?">
                <div className="stack compact" style={{ paddingTop: '4px' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedTravelers(travelers.map(t => t.id))}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        border: '1px solid #2e5b97',
                        background: '#eaf2fd',
                        color: '#2e5b97',
                        cursor: 'pointer'
                      }}
                    >
                      Select All Family
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTravelers([])}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#64748b',
                        cursor: 'pointer'
                      }}
                    >
                      Clear
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '6px' }}>
                    {travelers.map(t => {
                      const isSel = selectedTravelers.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleTravelerChip(t.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 14px',
                            borderRadius: '16px',
                            fontSize: '0.84rem',
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
              <Field label="Responsible for Packing (Optional)">
                <select value={responsibleId} onChange={e => setResponsibleId(e.target.value)}>
                  <option value="">Unassigned</option>
                  {travelers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Notes (Optional)">
              <input placeholder="e.g. Pack in carry-on" value={notes} onChange={e => setNotes(e.target.value)} />
            </Field>

            <div className="row end" style={{ paddingTop: '8px' }}>
              <Btn onClick={() => setAddModalOpen(false)}>Cancel</Btn>
              <Btn kind="primary" type="submit" disabled={!itemName.trim() || !catId || (!isShared && selectedTravelers.length === 0)}>
                Add to Packing List
              </Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* --- MODAL: TARGETED DELETION --- */}
      {deletingGroup && (
        <Modal title={`Delete "${deletingGroup.name}"`} onClose={() => setDeletingGroup(null)}>
          <div className="stack">
            <p className="muted" style={{ fontSize: '0.9rem' }}>Choose who to remove this item for:</p>

            <div className="stack compact">
              {deletingGroup.items.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleDeleteSingle(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    cursor: 'pointer',
                    fontWeight: '600',
                    color: '#334155'
                  }}
                >
                  <span>Remove for {whom(item.owner_id)}</span>
                  <Trash2 size={16} style={{ color: '#ef4444' }} />
                </button>
              ))}
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }} className="row between">
              <Btn kind="danger-button" onClick={() => handleDeleteEveryone(deletingGroup)}>
                <Trash2 size={16} /> Delete for Everyone
              </Btn>
              <Btn onClick={() => setDeletingGroup(null)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* --- MODAL: MANAGE CATEGORIES --- */}
      {manageCatsOpen && (
        <Modal title="Manage Packing Categories" onClose={() => setManageCatsOpen(false)}>
          <div className="stack">
            <div className="stack compact">
              {cats.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff' }}>
                  {editingCatId === c.id ? (
                    <div style={{ display: 'flex', gap: '6px', flex: 1, marginRight: '8px' }}>
                      <input
                        value={editingCatName}
                        onChange={e => setEditingCatName(e.target.value)}
                        style={{ fontSize: '14px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #94a3b8', flex: 1 }}
                        autoFocus
                      />
                      <Btn kind="primary" onClick={() => handleRenameCategory(c.id, editingCatName)} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>Save</Btn>
                      <Btn onClick={() => setEditingCatId(null)} style={{ padding: '4px 8px', fontSize: '0.8rem' }}>Cancel</Btn>
                    </div>
                  ) : (
                    <span style={{ fontWeight: 600, color: '#334155' }}>{c.name}</span>
                  )}

                  {editingCatId !== c.id && (
                    <div className="row compact">
                      <Btn kind="ghost" onClick={() => { setEditingCatId(c.id); setEditingCatName(c.name); }} aria-label="Rename category">
                        <Pencil size={15} />
                      </Btn>
                      <Btn kind="ghost" onClick={() => handleDeleteCategory(c)} aria-label="Delete category">
                        <Trash2 size={15} style={{ color: '#ef4444' }} />
                      </Btn>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }} className="stack compact">
              <strong style={{ fontSize: '0.88rem', color: '#334155' }}>Add New Category</strong>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  placeholder="e.g. Swimwear, Baby Gear..."
                  value={categoryName}
                  onChange={e => setCategoryName(e.target.value)}
                  style={{ fontSize: '14px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', flex: 1 }}
                />
                <Btn kind="primary" disabled={!categoryName.trim()} onClick={createCategory}>
                  <Plus size={16} /> Add
                </Btn>
              </div>
            </div>

            <div className="row end" style={{ paddingTop: '8px' }}>
              <Btn onClick={() => setManageCatsOpen(false)}>Done</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
