import React,{useState} from 'react';
import { Plus,Pencil,Trash2,Users,Luggage,FolderPlus,ChevronDown,ChevronRight } from 'lucide-react';
import { Btn,Field,SectionTitle,Select,Modal,Progress,Empty } from './ui.jsx';

const blank={name:'',category_id:'',owner_id:'',responsible_id:'',bag_id:'',quantity:1,packed:false,notes:''};

export function Packing(ctx){
  const {data,save,saveMany,remove,toast}=ctx;
  const [mode,setMode]=useState('people'),[owner,setOwner]=useState('all'),[bag,setBag]=useState('all'),[openCats,setOpenCats]=useState({}),[editing,setEditing]=useState(null),[v,setV]=useState(blank),[newCategory,setNewCategory]=useState(false),[categoryName,setCategoryName]=useState(''),[newBag,setNewBag]=useState(false),[bagName,setBagName]=useState('');

  const cats=[...data.packing_categories].sort((a,b)=>a.position-b.position);
  const bags=data.packing_bags;
  const travelers=data.travelers;
  const ownerOptions=[{value:'',label:'Shared'},...travelers.map(p=>({value:p.id,label:p.name}))];
  const whom=id=>travelers.find(p=>p.id===id)?.name||'Shared';
  const bagNameOf=id=>bags.find(b=>b.id===id)?.name||'Unassigned';

  const personal=mode==='people'?data.packing_items.filter(i=>owner==='all'||owner==='shared'&&!i.owner_id||i.owner_id===owner):data.packing_items.filter(i=>bag==='all'||bag==='none'&&!i.bag_id||i.bag_id===bag);
  const sharedResponsibilities=mode==='people'&&!['all','shared'].includes(owner)?data.packing_items.filter(i=>!i.owner_id&&i.responsible_id===owner):[];
  const tracked=[...sharedResponsibilities,...personal];
  const done=tracked.filter(i=>i.packed).length;
  const sortedCats=cats.filter(c=>personal.some(i=>i.category_id===c.id));

  function start(item){
    setEditing(item?.id||'new');
    setV(item?{...item}:{...blank,category_id:cats[0]?.id||'',owner_id:mode==='people'&&!['all','shared'].includes(owner)?owner:'',bag_id:mode==='bag'&&bag!=='all'&&bag!=='none'?bag:''});
  }

  async function saveItem(){
    if(!v.name.trim()||!v.category_id||!Number.isInteger(Number(v.quantity))||Number(v.quantity)<1)return;
    const payload={name:v.name.trim(),category_id:v.category_id,owner_id:v.owner_id||null,responsible_id:v.owner_id?null:v.responsible_id||null,bag_id:v.bag_id||null,quantity:Number(v.quantity),packed:!!v.packed,notes:v.notes||''};
    let ok;
    if(editing==='new'&&v.owner_id==='everyone'){
      const variants=travelers.map(p=>({...payload,owner_id:p.id,responsible_id:null}));
      ok=await saveMany('packing_items',variants);
    }else ok=await save('packing_items',payload,editing==='new'?null:editing);
    if(ok)setEditing(null);
  }

  async function addCategory(){
    if(!categoryName.trim())return;
    const ok=await save('packing_categories',{name:categoryName.trim(),position:cats.length});
    if(ok){setNewCategory(false);setCategoryName('');}
  }

  async function addBag(){
    if(!bagName.trim())return;
    const ok=await save('packing_bags',{name:bagName.trim()});
    if(ok){setNewBag(false);setBagName('');}
  }

  return (
    <div className="stack spacious">
      <SectionTitle title="Packing List" sub="Personal lists, shared responsibilities and bag contents — without duplicates" action={<Btn kind="primary" onClick={()=>start(null)}><Plus size={16}/> Add item</Btn>}/>

      {/* Mode Switcher Tabs */}
      <div className="tab-row">
        <button className={mode==='people'?'active':''} onClick={()=>setMode('people')}>By person / Shared</button>
        <button className={mode==='bags'?'active':''} onClick={()=>setMode('bags')}>By bag</button>
      </div>

      {/* Filter Pill Row & Controls */}
      <div className="stack compact">
        <div className="row between align-center wrap">
          {mode==='people' ? (
            <div className="filter-pills-bar" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', WebkitOverflowScrolling: 'touch', flex: 1 }}>
              <button type="button" className={`pill-btn ${owner==='all'?'active':''}`} onClick={()=>setOwner('all')} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '600', whiteSpace: 'nowrap', border: owner==='all'?'1px solid #2e5b97':'1px solid #dfe5ed', background: owner==='all'?'#eaf2fd':'#ffffff', color: owner==='all'?'#2e5b97':'#475569', cursor: 'pointer' }}>All</button>
              <button type="button" className={`pill-btn ${owner==='shared'?'active':''}`} onClick={()=>setOwner('shared')} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '600', whiteSpace: 'nowrap', border: owner==='shared'?'1px solid #2e5b97':'1px solid #dfe5ed', background: owner==='shared'?'#eaf2fd':'#ffffff', color: owner==='shared'?'#2e5b97':'#475569', cursor: 'pointer' }}>Shared</button>
              {travelers.map(t => (
                <button key={t.id} type="button" className={`pill-btn ${owner===t.id?'active':''}`} onClick={()=>setOwner(t.id)} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '600', whiteSpace: 'nowrap', border: owner===t.id?'1px solid #2e5b97':'1px solid #dfe5ed', background: owner===t.id?'#eaf2fd':'#ffffff', color: owner===t.id?'#2e5b97':'#475569', cursor: 'pointer' }}>{t.name}</button>
              ))}
            </div>
          ) : (
            <div className="row wrap align-center" style={{ flex: 1 }}>
              <div className="filter-pills-bar" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', WebkitOverflowScrolling: 'touch' }}>
                <button type="button" className={`pill-btn ${bag==='all'?'active':''}`} onClick={()=>setBag('all')} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '600', whiteSpace: 'nowrap', border: bag==='all'?'1px solid #2e5b97':'1px solid #dfe5ed', background: bag==='all'?'#eaf2fd':'#ffffff', color: bag==='all'?'#2e5b97':'#475569', cursor: 'pointer' }}>All bags</button>
                <button type="button" className={`pill-btn ${bag==='none'?'active':''}`} onClick={()=>setBag('none')} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '600', whiteSpace: 'nowrap', border: bag==='none'?'1px solid #2e5b97':'1px solid #dfe5ed', background: bag==='none'?'#eaf2fd':'#ffffff', color: bag==='none'?'#2e5b97':'#475569', cursor: 'pointer' }}>Unassigned</button>
                {bags.map(b => (
                  <button key={b.id} type="button" className={`pill-btn ${bag===b.id?'active':''}`} onClick={()=>setBag(b.id)} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '600', whiteSpace: 'nowrap', border: bag===b.id?'1px solid #2e5b97':'1px solid #dfe5ed', background: bag===b.id?'#eaf2fd':'#ffffff', color: bag===b.id?'#2e5b97':'#475569', cursor: 'pointer' }}>{b.name}</button>
                ))}
              </div>
              <Btn onClick={()=>setNewBag(true)}><Plus size={15}/> New bag</Btn>
            </div>
          )}
          <Btn onClick={()=>setNewCategory(true)}><FolderPlus size={16}/> Category</Btn>
        </div>
      </div>

      {/* Progress Summary */}
      <div className="card stack compact">
        <div className="row between">
          <strong>{mode==='people'?(owner==='all'?'All family items':owner==='shared'?'Shared packing':whom(owner)):(bag==='all'?'All bags':bag==='none'?'Not assigned':bagNameOf(bag))}</strong>
          <span className="muted tiny">{done} of {tracked.length} packed</span>
        </div>
        <Progress done={done} total={tracked.length}/>
      </div>

      {/* Shared Responsibilities */}
      {mode==='people'&&sharedResponsibilities.length>0&&(
        <section className="card stack compact responsibility-section">
          <div className="row"><Users size={18}/><strong>Shared responsibilities</strong></div>
          <p className="muted tiny">Shared items assigned to {whom(owner)}. Ticking them also updates Shared and By Bag.</p>
          {sharedResponsibilities.map(i => (
            <div className="pack-row" key={i.id}>
              <label className="check-with-content">
                <input type="checkbox" checked={i.packed} onChange={e=>save('packing_items',{packed:e.target.checked},i.id)}/>
                <span className={i.packed?'strike':''}>{i.name} {i.quantity>1&&<span className="muted">× {i.quantity}</span>}</span>
              </label>
              <Btn kind="ghost" aria-label="Edit item" onClick={()=>start(i)}><Pencil size={16}/></Btn>
            </div>
          ))}
        </section>
      )}

      {/* Categories & Items List */}
      <div className="stack compact">
        <div className="row between">
          <h3>{mode==='people'&&!['all','shared'].includes(owner)?'Personal packing':'Items by category'}</h3>
          <span className="muted tiny">Tap category to expand</span>
        </div>

        {sortedCats.map(c => {
          const subset = personal.filter(i => i.category_id === c.id);
          const open = openCats[c.id] !== false;

          // Group items by name when multiple entries match (e.g. Winter Clothes for each person)
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
              <button className="category-toggle" onClick={()=>setOpenCats(p=>({...p,[c.id]:!open}))}>
                <span>
                  <strong>{c.name}</strong>
                  <small className="muted">{subset.filter(i=>i.packed).length}/{subset.length} packed</small>
                </span>
                {open?<ChevronDown size={17}/>:<ChevronRight size={17}/>}
              </button>

              {open && (
                <div className="pack-items">
                  {grouped.map(group => {
                    // Single item row
                    if (group.items.length === 1) {
                      const i = group.items[0];
                      return (
                        <div className="pack-row" key={i.id}>
                          <label className="check-with-content">
                            <input type="checkbox" checked={i.packed} onChange={e=>save('packing_items',{packed:e.target.checked},i.id)}/>
                            <span>
                              <span className={i.packed?'strike':''}>{i.name} {i.quantity>1&&<span className="muted">× {i.quantity}</span>}</span>
                              {(mode==='bags'||owner==='all'||owner==='shared')&&<small className="muted">{whom(i.owner_id)}{!i.owner_id&&i.responsible_id?` · ${whom(i.responsible_id)} responsible`:''}</small>}
                              {i.notes&&<small className="muted clamp">{i.notes}</small>}
                            </span>
                          </label>
                          <Btn kind="ghost" onClick={()=>start(i)} aria-label="Edit item"><Pencil size={16}/></Btn>
                        </div>
                      );
                    }

                    // Grouped item row with person chips
                    return (
                      <div className="pack-row grouped-pack-row" key={group.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                          <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{group.name}</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {group.items.map(item => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={()=>save('packing_items',{packed:!item.packed},item.id)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 10px',
                                  borderRadius: '14px',
                                  fontSize: '0.78rem',
                                  fontWeight: '600',
                                  border: item.packed ? '1px solid #16a34a' : '1px solid #cbd5e1',
                                  backgroundColor: item.packed ? '#f0fdf4' : '#f8fafc',
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
                        <Btn kind="ghost" onClick={()=>start(group.items[0])} aria-label="Edit item"><Pencil size={16}/></Btn>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}

        {!sortedCats.length && <Empty text="No items in this view. Add an item above."/>}
      </div>

      {/* Edit Item Modal */}
      {editing && (
        <Modal title={editing==='new'?'Add packing item':'Edit packing item'} onClose={()=>setEditing(null)}>
          <div className="stack">
            <Field label="Item name"><input value={v.name} onChange={e=>setV(p=>({...p,name:e.target.value}))} placeholder="e.g. Power bank" autoFocus/></Field>
            <div className="form-grid">
              <Field label="Category"><Select value={v.category_id} onChange={x=>setV(p=>({...p,category_id:x}))} options={cats.map(c=>({value:c.id,label:c.name}))}/></Field>
              <Field label="Quantity"><input type="number" min="1" max="999" value={v.quantity} onChange={e=>setV(p=>({...p,quantity:e.target.value}))}/></Field>
            </div>
            <Field label="Belongs to">
              <Select value={v.owner_id||''} onChange={x=>setV(p=>({...p,owner_id:x,responsible_id:x?'':p.responsible_id}))} options={[...ownerOptions,...(editing==='new'&&travelers.length?[{value:'everyone',label:'Each traveller (separate entries)'}]:[])]}/>
            </Field>
            {!v.owner_id && (
              <Field label="Responsible for Shared (optional)">
                <Select value={v.responsible_id||''} onChange={x=>setV(p=>({...p,responsible_id:x}))} options={[{value:'',label:'Not assigned'},...travelers.map(t=>({value:t.id,label:t.name}))]}/>
              </Field>
            )}
            <Field label="Packed in (optional)">
              <Select value={v.bag_id||''} onChange={x=>setV(p=>({...p,bag_id:x}))} options={[{value:'',label:'No bag assigned'},...bags.map(b=>({value:b.id,label:b.name}))]}/>
            </Field>
            <Field label="Notes"><textarea rows="2" value={v.notes} onChange={e=>setV(p=>({...p,notes:e.target.value}))}/></Field>
            <div className="row between">
              <div>
                {editing!=='new' && (
                  <Btn kind="danger-button" onClick={async()=>{if(window.confirm(`Delete ${v.name}?`)){if(await remove('packing_items',v))setEditing(null);}}}><Trash2 size={16}/> Delete</Btn>
                )}
              </div>
              <div className="row">
                <Btn onClick={()=>setEditing(null)}>Cancel</Btn>
                <Btn kind="primary" disabled={!v.name.trim()||!v.category_id||Number(v.quantity)<1} onClick={saveItem}>Save</Btn>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Category Modal */}
      {newCategory && (
        <Modal title="Add packing category" onClose={()=>setNewCategory(false)}>
          <div className="stack">
            <Field label="Name"><input value={categoryName} onChange={e=>setCategoryName(e.target.value)} placeholder="e.g. Swimwear"/></Field>
            <div className="row end">
              <Btn onClick={()=>setNewCategory(false)}>Cancel</Btn>
              <Btn kind="primary" disabled={!categoryName.trim()} onClick={addCategory}>Create</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Bag Modal */}
      {newBag && (
        <Modal title="Add bag" onClose={()=>setNewBag(false)}>
          <div className="stack">
            <Field label="Bag name"><input value={bagName} onChange={e=>setBagName(e.target.value)} placeholder="e.g. Travel Day Bag"/></Field>
            <div className="row end">
              <Btn onClick={()=>setNewBag(false)}>Cancel</Btn>
              <Btn kind="primary" disabled={!bagName.trim()} onClick={addBag}>Create</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
