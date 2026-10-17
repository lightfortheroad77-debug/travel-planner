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
    const ok = await save('activities', {
      ...blankActivity,
      title: title.trim(),
      day_number: isIdea ? null : n,
      start_time: isIdea ? null : time,
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
      
      {/* Start time rendered first for scheduled day activities */}
      {!isIdea && (
        <Field label="Start time (optional)">
          <TimeEntry value={time} onChange={setTime} />
        </Field>
      )}

      <Field label="Activity name">
        <input autoFocus={isIdea} value={title} onChange={e => setTitle(e.target.value)} placeholder="Place or activity" />
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
        <textarea rows="2" value={notes} onChange={e => setNotes(e.target.value)} />
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
