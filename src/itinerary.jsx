import React, { useEffect, useRef, useState } from 'react';
import { 
  Plus, Palette, Pencil, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, 
  ArrowLeft, MoreHorizontal, MapPin, Route, CalendarPlus, Copy, Trash2, 
  Lightbulb, Clock3, LocateFixed 
} from 'lucide-react';
import { 
  supabase, blankActivity, clock, dayBase, dayCount, dayTitle, eventSort, 
  mapHref, offsetDate, parseTime, shortDate, todayIndex, tripDays 
} from './lib.js';
import { ActionMenu, Btn, Field, MapButton, Modal, Select, Status, TimeEntry, SectionTitle, Empty } from './ui.jsx';

const toneColors = { none: '', blue: 'tone-blue', green: 'tone-green', pink: 'tone-pink', amber: 'tone-amber', purple: 'tone-purple' };
const reservationOptions = [{ value: 'none', label: 'Not needed' }, { value: 'to_reserve', label: 'To reserve' }, { value: 'reserved', label: 'Reserved' }];
const typeOptions = [{ value: 'activity', label: 'Activity' }, { value: 'food', label: 'Food' }, { value: 'transport', label: 'Transport' }, { value: 'other', label: 'Other' }];

const cityNames = rows => Array.from(new Set([...rows.activities.map(a => a.city_area), ...rows.stays.map(s => s.base_city)].filter(Boolean))).sort();
const activityList = (rows, n) => rows.activities.filter(a => a.day_number === n).sort(eventSort);

// Subtle helper to detect transport items
function isTransportEvent(e) {
  if (e.kind === 'transport') return true;
  const title = (e.title || '').trim().toLowerCase();
  return /^(head|transfer|drive|flight|train|bus|ferry|walk|ride|shinkansen|express)\b/i.test(title);
}

function TitleTimeEditor({ n, ctx, onClose }) {
  const { data, trip, refresh, toast } = ctx;
  const list = activityList(data, n);
  const [title, setTitle] = useState(dayTitle(data, n));
  const [time, setTime] = useState(Object.fromEntries(list.map(a => [a.id, clock(a.start_time) === 'TBD' ? '' : clock(a.start_time)])));
  const [saving, setSaving] = useState(false);

  async function commit() {
    const changes = list.map(a => ({ id: a.id, time: parseTime(time[a.id] || '') }));
    if (changes.some(c => c.time === false)) {
      toast('Correct the invalid time before saving.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.rpc('save_day_quick_edit', {
        p_trip_id: trip.id,
        p_day_number: n,
        p_title: title.trim(),
        p_changes: changes.map(c => ({ id: c.id, time: c.time || '' }))
      });
      if (error) throw error;
      await refresh();
      onClose();
      toast('Day title and times saved together.');
    } catch (e) {
      toast(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="inline-editor stack">
      <h4>Quick Edit · Day {n}</h4>
      <Field label="Day title">
        <input value={title} onChange={e => setTitle(e.target.value)} />
      </Field>
      {list.length > 0 && (
        <div className="stack compact">
          <label className="small-heading">Start times</label>
          {list.map(e => (
            <div className="time-edit-row" key={e.id}>
              <input aria-label={`Time for ${e.title}`} inputMode="numeric" placeholder="TBD" value={time[e.id] ?? ''} onChange={x => setTime(p => ({ ...p, [e.id]: x.target.value }))} />
              <span>{e.title}</span>
              {parseTime(time[e.id] || '') === false && <small className="danger">Invalid</small>}
            </div>
          ))}
        </div>
      )}
      <small className="muted">Type 930 for 09:30. Blank = TBD.</small>
      <div className="row end">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn kind="primary" disabled={saving || !title.trim() || list.some(e => parseTime(time[e.id] || '') === false)} onClick={commit}>
          {saving ? 'Saving...' : 'Save changes'}
        </Btn>
      </div>
    </div>
  );
}

function QuickAdd({ n, ctx, onClose, isIdea = false }) {
  const { save, toast } = ctx;
  const [title, setTitle] = useState('');
  const [time, setTime] = useState(null);
  const [notes, setNotes] = useState('');
  const [city, setCity] = useState('');
  const [place, setPlace] = useState('');
  const [saving, setSaving] = useState(false);

  async function commit() {
    if (!title.trim() || time === false) return;
    setSaving(true);
    const isTrans = isTransportEvent({ title });
    
    const ok = await save('activities', {
      ...blankActivity,
      title: title.trim(),
      kind: isTrans ? 'transport' : 'activity',
      day_number: isIdea ? null : n,
      start_time: time,
      notes,
      city_area: city,
      place
    });
    setSaving(false);
    if (ok) {
      toast(isIdea ? 'Idea saved.' : `Activity added to Day ${n}.`);
      onClose();
    }
  }

  return (
    <div className="inline-editor stack">
      <h4>{isIdea ? 'Add idea' : `Quick Add · Day ${n}`}</h4>
      
      <Field label="Start time (optional)">
        <TimeEntry value={time} onChange={setTime} />
      </Field>

      <Field label="Activity name">
        <input autoFocus={isIdea} value={title} onChange={e => setTitle(e.target.value)} placeholder="Place or activity (e.g. Head to Enoshima)" />
      </Field>

      {isIdea && (
        <>
          <Field label="City / Area (optional)">
            <input list="known-cities" value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Kyoto" />
          </Field>
          <Field label="Place / address (optional)">
            <input value={place} onChange={e => setPlace(e.target.value)} />
          </Field>
        </>
      )}

      <Field label="Notes (optional)">
        <textarea rows="3" style={{ minHeight: '90px', resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes..." />
      </Field>

      <div className="row end">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn kind="primary" disabled={saving || !title.trim() || time === false} onClick={commit}>
          Add {isIdea ? 'idea' : 'activity'}
        </Btn>
      </div>
    </div>
  );
}

function ActivityEditor({ ctx, activity, onClose }) {
  const { save, remove, toast, trip } = ctx;
  const [v, setV] = useState({ 
    ...blankActivity, 
    ...activity, 
    day_number: (activity.day_number === null || activity.day_number === undefined) ? 'ideas' : String(activity.day_number),
    start_time: activity.start_time ? clock(activity.start_time) : null 
  });
  const [saving, setSaving] = useState(false);
  const update = (k, value) => setV(p => ({ ...p, [k]: value }));

  async function commit() {
    if (!v.title.trim() || v.start_time === false) return;
    setSaving(true);
    const targetDay = (v.day_number === 'ideas' || !v.day_number) ? null : Number(v.day_number);

    const ok = await save('activities', {
      title: v.title.trim(),
      day_number: targetDay,
      start_time: v.start_time,
      city_area: v.city_area || '',
      kind: v.kind,
      place: v.place || '',
      origin: v.origin || '',
      destination: v.destination || '',
      maps_url: v.maps_url || '',
      reservation_status: v.reservation_status,
      action_needed: v.action_needed,
      notes: v.notes || ''
    }, activity.id);

    setSaving(false);
    if (ok) {
      onClose();
      toast('Activity updated.');
    }
  }

  async function del() {
    if (window.confirm(`Delete "${v.title}"?`)) {
      const ok = await remove('activities', activity);
      if (ok) onClose();
    }
  }

  const dayOptions = [
    { value: 'ideas', label: 'Unscheduled (Ideas Inbox)' },
    ...tripDays(trip).map(d => ({ value: String(d.n), label: `Day ${d.n} · ${dayTitle(ctx.data, d.n)}` }))
  ];

  return (
    <div className="inline-editor stack">
      <h4>Edit activity</h4>
      <Field label="Name"><input value={v.title} onChange={e => update('title', e.target.value)} /></Field>
      
      <div className="form-grid">
        <Field label="Assigned Day">
          <Select value={v.day_number === null || v.day_number === 'ideas' ? 'ideas' : String(v.day_number)} onChange={x => update('day_number', x)} options={dayOptions} />
        </Field>
        <Field label="Start time (optional)">
          <TimeEntry value={v.start_time} onChange={x => update('start_time', x)} />
        </Field>
      </div>

      <div className="form-grid">
        <Field label="Type"><Select value={v.kind} onChange={x => update('kind', x)} options={typeOptions} /></Field>
        <Field label="City / Area"><input list="known-cities" value={v.city_area} onChange={e => update('city_area', e.target.value)} placeholder="Optional" /></Field>
      </div>

      {v.kind === 'transport' ? (
        <div className="form-grid">
          <Field label="From (Origin)"><input value={v.origin} onChange={e => update('origin', e.target.value)} placeholder="e.g. Tokyo Station" /></Field>
          <Field label="To (Destination)"><input value={v.destination} onChange={e => update('destination', e.target.value)} placeholder="e.g. Kyoto Station" /></Field>
        </div>
      ) : (
        <Field label="Place / address"><input value={v.place} onChange={e => update('place', e.target.value)} /></Field>
      )}

      <Field label="Google Maps URL (optional)">
        <input type="url" value={v.maps_url} onChange={e => update('maps_url', e.target.value)} placeholder="https://maps.app.goo.gl/..." />
      </Field>

      <Field label="Reservation status">
        <Select value={v.reservation_status} onChange={x => update('reservation_status', x)} options={reservationOptions} />
      </Field>

      <label className="check-row">
        <input type="checkbox" checked={v.action_needed} onChange={e => update('action_needed', e.target.checked)} /> Action needed
      </label>

      <Field label="Notes">
        <textarea rows="4" style={{ minHeight: '100px', resize: 'vertical' }} value={v.notes} onChange={e => update('notes', e.target.value)} />
      </Field>

      <div className="row between align-center">
        <Btn kind="danger-button" onClick={del} type="button">
          <Trash2 size={15} /> Delete
        </Btn>
        <div className="row">
          <Btn onClick={onClose} type="button">Cancel</Btn>
          <Btn kind="primary" onClick={commit} disabled={saving || !v.title.trim() || v.start_time === false}>
            {saving ? 'Saving...' : 'Save changes'}
          </Btn>
        </div>
      </div>
    </div>
  );
}

export function Overview(ctx) {
  const { trip, data, focused, setFocused, goDay, refresh, toast } = ctx;
  const [expanded, setExpanded] = useState({});
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(null);
  const [palette, setPalette] = useState(null);

  const today = todayIndex(trip);
  const days = tripDays(trip);

  const groups = [];
  for (const d of days) {
    const base = dayBase(trip, data, d.n);
    const last = groups[groups.length - 1];
    if (last && last.name === base) last.days.push(d);
    else groups.push({ key: `${base}-${d.n}`, name: base, days: [d] });
  }

  async function setColor(n, color) {
    const old = data.trip_days.find(d => d.day_number === n);
    const { error } = await supabase.from('trip_days').upsert({
      trip_id: trip.id,
      day_number: n,
      title: old?.title || '',
      notes: old?.notes || '',
      base_city_override: old?.base_city_override || '',
      color
    }, { onConflict: 'trip_id,day_number' });

    if (error) toast(error.message);
    else await refresh();
    setPalette(null);
  }

  return (
    <div className="stack spacious">
      <SectionTitle title="Trip overview" sub="Overnight cities · Tap a day title to open its itinerary" />

      {/* Horizontal Card Day Jumper Bar */}
      <div className="day-jumper-bar" role="navigation" aria-label="Day quick jump">
        {days.map(d => {
          const isToday = today === d.n;
          const isFocused = focused === d.n;
          return (
            <button
              key={d.n}
              className={isFocused ? 'active' : ''}
              onClick={() => goDay(d.n)}
            >
              <strong>Day {d.n}</strong>
              <span>{shortDate(d.date)}</span>
            </button>
          );
        })}
      </div>

      {groups.map(group => (
        <section className="city-section" key={group.key}>
          <div className="group-heading">
            <h3>{group.name}</h3>
            <span className="muted tiny">{group.days.length} {group.days.length === 1 ? 'day' : 'days'}</span>
          </div>

          <div className="overview-grid">
            {group.days.map(d => {
              const n = d.n;
              const meta = data.trip_days.find(x => x.day_number === n);
              const list = activityList(data, n);

              const isPast = today ? n < today : false;
              const isCardExpanded = expanded[n] ?? !isPast;

              const areas = [...new Set(list.map(a => a.city_area).filter(c => c && c.toLowerCase() !== group.name.toLowerCase()))];

              return (
                <article
                  id={`overview-day-${n}`}
                  key={n}
                  className={`day-card ${toneColors[meta?.color || 'none']} ${focused === n ? 'focused' : ''} ${!isCardExpanded ? 'collapsed' : ''}`}
                >
                  <div className="day-top">
                    <button className="day-title-button" onClick={() => goDay(n)}>
                      <span className="muted tiny">
                        Day {n} · {shortDate(d.date)}
                        {today === n && <span className="today-label">Today</span>}
                        {isPast && <span className="past-label">Passed</span>}
                      </span>
                      <strong>{dayTitle(data, n)}</strong>
                    </button>

                    <div className="day-icons">
                      <button className="icon-button" title="Card colour" aria-label="Change colour" onClick={() => { setPalette(p => p === n ? null : n); setEditing(null); setAdding(null); }}>
                        <Palette size={17} />
                      </button>
                      <button className="icon-button" title="Edit title and times" aria-label="Edit title and times" onClick={() => { setEditing(p => p === n ? null : n); setAdding(null); setPalette(null); }}>
                        <Pencil size={17} />
                      </button>
                      <button className="icon-button" title="Add activity" aria-label="Add activity" onClick={() => { setAdding(p => p === n ? null : n); setEditing(null); setPalette(null); }}>
                        <Plus size={19} />
                      </button>
                      <button className="icon-button collapse-toggle" title={isCardExpanded ? "Collapse day" : "Expand day"} onClick={() => setExpanded(p => ({ ...p, [n]: !isCardExpanded }))}>
                        {isCardExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                  </div>

                  {isCardExpanded && (
                    <>
                      {areas.length > 0 && (
                        <div className="tags">
                          {areas.map(a => <span key={a} className="tag">{a}</span>)}
                        </div>
                      )}

                      {palette === n && (
                        <div className="palette-row">
                          {Object.keys(toneColors).map(color => (
                            <button className={`palette ${toneColors[color]}`} title={color} aria-label={`Set ${color} colour`} key={color} onClick={() => setColor(n, color)}>
                              {color === 'none' ? '×' : ''}
                            </button>
                          ))}
                        </div>
                      )}

                      {editing === n && <TitleTimeEditor n={n} ctx={ctx} onClose={() => setEditing(null)} />}

                      <div className="overview-events">
                        {list.map(e => {
                          const isTrans = isTransportEvent(e);

                          return (
                            <div className="overview-event" key={e.id}>
                              <span className="event-time" style={isTrans ? { color: '#64748b' } : {}}>
                                {clock(e.start_time)}
                              </span>
                              <div className="event-text">
                                <span style={isTrans ? { color: '#475569', fontStyle: 'italic', fontWeight: '400' } : { fontWeight: '600' }}>
                                  {e.title}
                                </span>
                                <Status activity={e} />
                              </div>
                              <MapButton activity={e} />
                            </div>
                          );
                        })}
                        {list.length === 0 && <span className="muted tiny">No activities yet</span>}
                      </div>

                      {adding === n && <QuickAdd n={n} ctx={ctx} onClose={() => setAdding(null)} />}
                    </>
                  )}

                  {!isCardExpanded && (
                    <div className="day-collapsed-summary" onClick={() => setExpanded(p => ({ ...p, [n]: true }))}>
                      <span className="muted tiny">{list.length} {list.length === 1 ? 'activity' : 'activities'}</span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function EventCard({ ctx, event }) {
  const { trip, save, remove, toast } = ctx;
  const [editor, setEditor] = useState(false);
  const isTrans = isTransportEvent(event);

  async function sendIdea() {
    await save('activities', { day_number: null }, event.id);
  }

  async function duplicate() {
    const { id, created_at, trip_id, ...copy } = event;
    const ok = await ctx.saveMany('activities', [{ ...copy, reservation_status: event.reservation_status === 'reserved' ? 'none' : event.reservation_status }]);
    if (ok) toast(`Duplicated "${event.title}".`);
  }

  async function del() {
    if (window.confirm(`Delete "${event.title}"?`)) await remove('activities', event);
  }

  return (
    <article className="event-card">
      <div className="event-main">
        <div className="event-time strong" style={isTrans ? { color: '#64748b' } : {}}>
          {clock(event.start_time)}
        </div>
        
        {/* Tapping Title Opens Edit Mode Directly */}
        <button className="event-name-area" onClick={() => setEditor(v => !v)} title="Tap to edit activity">
          <strong style={isTrans ? { color: '#475569', fontStyle: 'italic', fontWeight: '500' } : {}}>{event.title}</strong>
          {event.city_area && <span className="muted tiny">{event.city_area}</span>}
          <Status activity={event} />
          {event.notes && <span className="event-notes">{event.notes}</span>}
        </button>

        <div className="event-actions">
          <MapButton activity={event} />
          <ActionMenu items={[
            { label: 'Duplicate', icon: <Copy size={15} />, onClick: duplicate },
            { label: 'Send to Ideas', icon: <Lightbulb size={15} />, onClick: sendIdea },
            { label: 'Delete', icon: <Trash2 size={15} />, danger: true, onClick: del }
          ]} />
        </div>
      </div>

      {isTrans && !editor && (event.origin || event.destination) && (
        <div className="event-route muted tiny" style={{ marginTop: '2px', color: '#64748b' }}>
          {event.origin || 'Origin TBD'} → {event.destination || 'Destination TBD'}
        </div>
      )}

      {editor && <ActivityEditor key={event.id} ctx={ctx} activity={event} onClose={() => setEditor(false)} />}
    </article>
  );
}

export function DayView(ctx) {
  const { trip, data, day, setDay, save, refresh, toast, setPage } = ctx;
  const [adding, setAdding] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [note, setNote] = useState('');

  const days = tripDays(trip);
  const n = Math.min(Math.max(1, day), dayCount(trip));
  const current = data.trip_days.find(d => d.day_number === n);
  const list = activityList(data, n);

  useEffect(() => { setAdding(false); setEditingNote(false); }, [n]);

  async function saveNote() {
    const { error } = await supabase.from('trip_days').upsert({
      trip_id: trip.id,
      day_number: n,
      title: current?.title || '',
      notes: note,
      base_city_override: current?.base_city_override || '',
      color: current?.color || 'none'
    }, { onConflict: 'trip_id,day_number' });

    if (error) toast(error.message);
    else { await refresh(); setEditingNote(false); }
  }

  return (
    <div className="stack spacious">
      {/* Top Header Controls: Overview Back Button + Prev / Next Arrows */}
      <div className="row between">
        <Btn onClick={() => setPage('overview')}>
          <ArrowLeft size={16} /> Overview
        </Btn>
        <div className="row">
          <Btn disabled={n === 1} onClick={() => setDay(n - 1)}>
            <ChevronLeft size={17} /> Prev
          </Btn>
          <Btn disabled={n === dayCount(trip)} onClick={() => setDay(n + 1)}>
            Next <ChevronRight size={17} />
          </Btn>
        </div>
      </div>

      {/* Horizontally Scrollable Day Strip */}
      <div className="day-strip">
        {days.map(d => (
          <button key={d.n} className={n === d.n ? 'active' : ''} onClick={() => setDay(d.n)}>
            <strong>Day {d.n}</strong>
            <span>{shortDate(d.date)}</span>
          </button>
        ))}
      </div>

      <div className="day-page-title">
        <span className="eyebrow">Day {n} · {shortDate(offsetDate(trip.start_date, n - 1))}</span>
        <h1>{dayTitle(data, n)}</h1>
      </div>

      {(current?.notes || editingNote) && (
        <div className="note-box">
          <div className="row between">
            <strong>Day notes</strong>
            <Btn onClick={() => { setEditingNote(v => !v); setNote(current?.notes || ''); }}><Pencil size={14} /> Edit</Btn>
          </div>
          {editingNote ? (
            <div className="stack">
              <textarea value={note} onChange={e => setNote(e.target.value)} rows="4" style={{ minHeight: '100px', resize: 'vertical' }} />
              <div className="row end">
                <Btn onClick={() => setEditingNote(false)}>Cancel</Btn>
                <Btn kind="primary" onClick={saveNote}>Save</Btn>
              </div>
            </div>
          ) : <p>{current?.notes}</p>}
        </div>
      )}

      <div className="section-title">
        <h2>Timeline</h2>
        <Btn kind="primary" onClick={() => setAdding(v => !v)}><Plus size={16} /> Add activity</Btn>
      </div>

      {adding && <QuickAdd n={n} ctx={ctx} onClose={() => setAdding(false)} />}

      <div className="stack compact">
        {list.map(e => <EventCard key={e.id} ctx={ctx} event={e} />)}
        {list.length === 0 && <Empty text="No activities planned yet. Add one above, or plan something from Ideas." />}
      </div>

      {!current?.notes && !editingNote && (
        <Btn className="subtle-action" onClick={() => { setEditingNote(true); setNote(''); }}>+ Add day notes</Btn>
      )}
    </div>
  );
}

export function Ideas(ctx) {
  const { data, trip, save, remove, toast, goDay } = ctx;
  const [city, setCity] = useState('all');
  const [search, setSearch] = useState('');
  const [quick, setQuick] = useState(false);
  const [editor, setEditor] = useState(null);
  const [planning, setPlanning] = useState(null);
  const [dest, setDest] = useState(1);
  const [time, setTime] = useState(null);

  const ideas = data.activities.filter(a => a.day_number === null);
  const cities = cityNames(data);
  const filtered = ideas.filter(a => (city === 'all' || (city === 'unsorted' && !a.city_area) || a.city_area === city) && [a.title, a.city_area, a.notes, a.place].join(' ').toLowerCase().includes(search.toLowerCase()));

  async function plan(a) {
    if (time === false) return;
    const ok = await save('activities', { day_number: dest, start_time: time }, a.id);
    if (ok) { setPlanning(null); toast(`${a.title} scheduled for Day ${dest}.`); }
  }

  return (
    <div className="stack spacious">
      <SectionTitle title="Ideas inbox" sub={`${ideas.length} unscheduled ideas · Organise by city without choosing a day`} action={<Btn kind="primary" onClick={() => setQuick(v => !v)}><Plus size={16} /> Add idea</Btn>} />
      {quick && <QuickAdd isIdea ctx={ctx} onClose={() => setQuick(false)} />}
      <div className="row wrap">
        <input className="search-field" placeholder="Search places, notes or city..." value={search} onChange={e => setSearch(e.target.value)} />
        <Select value={city} onChange={setCity} options={[{ value: 'all', label: 'All cities' }, ...cities.map(c => ({ value: c, label: c })), { value: 'unsorted', label: 'Unsorted' }]} />
      </div>
      <div className="ideas-grid">
        {filtered.map(a => {
          const isTrans = isTransportEvent(a);
          return (
            <article key={a.id} className="card stack compact">
              <div className="row between align-start">
                <button className="event-name-area" onClick={() => setEditor(p => p === a.id ? null : a.id)} title="Tap to edit idea">
                  <div className="row compact align-center">
                    {clock(a.start_time) !== 'TBD' && <span className="muted tiny strong">{clock(a.start_time)} ·</span>}
                    <strong style={isTrans ? { color: '#475569', fontStyle: 'italic' } : {}}>{a.title}</strong>
                  </div>
                  {a.city_area && <div><span className="tag">{a.city_area}</span></div>}
                </button>
                <div className="row">
                  <MapButton activity={a} />
                  <ActionMenu items={[
                    { label: 'Delete', icon: <Trash2 size={15} />, danger: true, onClick: () => { if (window.confirm(`Delete "${a.title}"?`)) remove('activities', a); } }
                  ]} />
                </div>
              </div>
              <Status activity={a} />
              {a.notes && <p className="muted small">{a.notes}</p>}
              {editor === a.id && <ActivityEditor key={a.id} ctx={ctx} activity={a} onClose={() => setEditor(null)} />}
              {planning === a.id ? (
                <div className="inline-editor stack">
                  <strong>Plan this activity</strong>
                  <Field label="Day">
                    <Select value={String(dest)} onChange={v => setDest(Number(v))} options={tripDays(trip).map(d => ({ value: String(d.n), label: `Day ${d.n} · ${dayTitle(data, d.n)}` }))} />
                  </Field>
                  <Field label="Start time (optional)"><TimeEntry value={time} onChange={setTime} /></Field>
                  <div className="row end">
                    <Btn onClick={() => setPlanning(null)}>Cancel</Btn>
                    <Btn kind="primary" onClick={() => plan(a)}>Add to Day {dest}</Btn>
                  </div>
                </div>
              ) : (
                <div className="row end">
                  <Btn onClick={() => {
                    setPlanning(a.id);
                    setDest(Math.min(dayCount(trip), a.city_area?.toLowerCase().includes('kyoto') ? 8 : a.city_area?.toLowerCase().includes('osaka') ? 12 : 1));
                    setTime(clock(a.start_time) === 'TBD' ? null : clock(a.start_time));
                  }}>
                    <CalendarPlus size={15} /> Plan day
                  </Btn>
                </div>
              )}
            </article>
          );
        })}
        {filtered.length === 0 && <Empty text="No matching ideas. Add a place or change the filter." />}
      </div>
      <datalist id="known-cities">{cities.map(c => <option key={c} value={c}/>)}</datalist>
    </div>
  );
}
