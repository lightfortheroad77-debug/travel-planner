import React,{useCallback,useEffect,useRef,useState} from 'react';
import { CalendarDays,Lightbulb,ClipboardList,Luggage,Gift,Wallet,Settings2,LogOut,Plus,Plane,Menu,ChevronLeft,CheckCircle2 } from 'lucide-react';
import { enabled,supabase,tables,defaultExpenseCats,defaultPackingCats,todayIndex,currencies,zones } from './lib.js';
import { Btn,Field,Modal } from './ui.jsx';
import { Overview,DayView,Ideas } from './itinerary.jsx';
import { TripInfo } from './tripinfo.jsx';
import { Todos } from './todos.jsx';
import { Packing } from './packing.jsx';
import { Souvenirs } from './souvenirs.jsx';
import { Expenses } from './expenses.jsx';

const nav=[{id:'overview',label:'Overview',Icon:CalendarDays},{id:'ideas',label:'Ideas',Icon:Lightbulb},{id:'todos',label:'To-dos',Icon:ClipboardList},{id:'packing',label:'Packing',Icon:Luggage},{id:'souvenirs',label:'Souvenirs',Icon:Gift},{id:'expenses',label:'Expenses',Icon:Wallet},{id:'info',label:'Trip Info',Icon:Settings2}];
const blank=Object.fromEntries(tables.map(t=>[t,[]]));

function Auth(){
  const [mode,setMode]=useState('login'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function submit(e){
    e.preventDefault();setBusy(true);setMessage('');
    try{
      const {data,error}=mode==='login'?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+window.location.pathname}});
      if(error)throw error;
      if(mode==='signup'&&!data.session)setMessage('Check your email for a confirmation link, then sign in.');
    }catch(e){setMessage(e.message)}finally{setBusy(false)}
  }
  return <div className="auth-wrap"><div className="auth-card"><div className="brand large"><Plane/> Travel Dashboard</div><p className="muted">Private trip planning, packing, spending and checklists — saved to your account.</p><h2>{mode==='login'?'Sign in':'Create account'}</h2><form onSubmit={submit} className="stack"><Field label="Email"><input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></Field><Field label="Password"><input type="password" minLength={6} autoComplete={mode==='login'?'current-password':'new-password'} required value={password} onChange={e=>setPassword(e.target.value)}/></Field><button className="btn primary" type="submit" disabled={busy}>{busy?'Working...':mode==='login'?'Sign in':'Create account'}</button></form>{message&&<p className="notice">{message}</p>}<button className="text-button" onClick={()=>{setMode(m=>m==='login'?'signup':'login');setMessage('')}}>{mode==='login'?'New here? Create account':'Have an account? Sign in'}</button></div></div>
}

function NewTrip({session,onCreate,onCancel}){
  const [name,setName]=useState(''),[country,setCountry]=useState(''),[start,setStart]=useState(''),[end,setEnd]=useState(''),[currency,setCurrency]=useState('SGD'),[timezone,setTimezone]=useState('Asia/Singapore'),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function submit(e){
    e.preventDefault();if(!start||!end||end<start||!(/^[A-Z]{3}$/).test(currency))return;setBusy(true);setMessage('');
    try{
      const {data,error}=await supabase.from('trips').insert({owner_id:session.user.id,name:name.trim(),country:country.trim(),start_date:start,end_date:end,budget_currency:currency,timezone}).select('*').single();
      if(error)throw error;
      const [c,p,s]=await Promise.all([supabase.from('expense_categories').insert(defaultExpenseCats.map((n,i)=>({trip_id:data.id,name:n,position:i}))),supabase.from('packing_categories').insert(defaultPackingCats.map((n,i)=>({trip_id:data.id,name:n,position:i}))),supabase.from('souvenir_groups').insert([{trip_id:data.id,name:'Family',position:0},{trip_id:data.id,name:'Church',position:1}])]);
      const bad=[c,p,s].find(x=>x.error);
      if(bad)throw new Error('Trip created, but a default category failed. You can add missing categories from its page. '+bad.error.message);
      await onCreate(data);
    }catch(e){setMessage(e.message)}finally{setBusy(false)}
  }
  return <form className="stack" onSubmit={submit}><Field label="Trip name"><input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Japan Family Trip" required/></Field><Field label="Destination"><input value={country} onChange={e=>setCountry(e.target.value)} placeholder="Country or region"/></Field><div className="form-grid"><Field label="Start date"><input required type="date" value={start} onChange={e=>setStart(e.target.value)}/></Field><Field label="End date"><input required type="date" min={start} value={end} onChange={e=>setEnd(e.target.value)}/></Field></div><Field label="Budget currency"><input list="trip-new-currencies" maxLength={3} value={currency} onChange={e=>setCurrency(e.target.value.toUpperCase())}/><datalist id="trip-new-currencies">{currencies.map(c=><option key={c} value={c}/>)}</datalist></Field><Field label="Destination time zone"><select value={timezone} onChange={e=>setTimezone(e.target.value)}>{zones.map(z=><option key={z}>{z}</option>)}</select></Field><div className="row end"><Btn onClick={onCancel}>Cancel</Btn><button className="btn primary" disabled={busy||!name.trim()||!start||!end||end<start||!(/^[A-Z]{3}$/).test(currency)} type="submit">{busy?'Creating...':'Create trip'}</button></div>{message&&<p className="notice danger">{message}</p>}</form>
}

export default function App(){
  const [session,setSession]=useState(undefined),[trips,setTrips]=useState([]),[tripId,setTripId]=useState(''),[tripsLoading,setTripsLoading]=useState(true),[tripsLoadedForUser,setTripsLoadedForUser]=useState(''),[tripsError,setTripsError]=useState(''),[data,setData]=useState(blank),[page,setPage]=useState('overview'),[day,setDay]=useState(1),[focused,setFocused]=useState(1),[creating,setCreating]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState(null),[undoRecord,setUndoRecord]=useState(null);
  const activeTripRef=useRef('');
  activeTripRef.current=tripId;

  useEffect(()=>{
    if(!enabled)return;
    let mounted=true;
    supabase.auth.getSession().then(({data})=>{if(mounted)setSession(data.session||null)});
    const {data:sub}=supabase.auth.onAuthStateChange((_event,s)=>setSession(s||null));
    return()=>{mounted=false;sub.subscription.unsubscribe()}
  },[]);

  const loadTrips=useCallback(async()=>{
    if(!session)return [];
    const fetchTrips=async()=>{
      const {data,error}=await supabase.from('trips').select('*').order('created_at',{ascending:false});
      if(error)throw error;
      return data||[];
    };
    let list=await fetchTrips();
    if(list.length===0){
      await new Promise(resolve=>window.setTimeout(resolve,700));
      const {data:authData,error:authError}=await supabase.auth.getSession();
      if(authError)throw authError;
      if(authData.session?.user?.id!==session.user.id)return [];
      list=await fetchTrips();
    }
    setTrips(list);
    return list;
  },[session]);

  useEffect(()=>{
    let cancelled=false;
    if(session===undefined){setTripsLoading(true);return()=>{cancelled=true};}
    if(!session){setTrips([]);setTripId('');setTripsLoadedForUser('');setTripsError('');setTripsLoading(false);return()=>{cancelled=true};}
    setTripsLoading(true);setTripsError('');
    loadTrips().then(list=>{
      if(cancelled)return;
      setTripId(prev=>list.some(t=>t.id===prev)?prev:list[0]?.id||'');
      setTripsLoadedForUser(session.user.id)
    }).catch(e=>{
      if(cancelled)return;
      setTripsError(e.message||'Unable to load trips.');
      setNotice({message:e.message||'Unable to load trips.'})
    }).finally(()=>{if(!cancelled)setTripsLoading(false)});
    return()=>{cancelled=true}
  },[session,loadTrips]);

  // Fast targeted refresh: If singleTable is passed, only re-fetch that 1 table
  const refresh=useCallback(async(singleTable=null)=>{
    if(!tripId)return;
    if(singleTable){
      const {data:tableData,error}=await supabase.from(singleTable).select('*').eq('trip_id',tripId);
      if(error)throw error;
      if(activeTripRef.current!==tripId)return;
      setData(prev=>({...prev,[singleTable]:tableData||[]}));
      return;
    }
    const result=await Promise.all(tables.map(t=>supabase.from(t).select('*').eq('trip_id',tripId)));
    const error=result.find(r=>r.error)?.error;
    if(error)throw error;
    if(activeTripRef.current!==tripId)return;
    setData(Object.fromEntries(tables.map((t,i)=>[t,result[i].data||[]])));
  },[tripId]);

  useEffect(()=>{
    setData(blank);
    if(tripId)refresh().catch(e=>setNotice({message:e.message}));
  },[tripId,refresh]);

  const current=trips.find(t=>t.id===tripId);

  useEffect(()=>{
    if(current){
      const n=todayIndex(current);
      setFocused(n||1);
      setDay(n||1);
    }
  },[tripId]);

  const toast=useCallback((message)=>setNotice({message}),[]);

  const save=useCallback(async(table,payload,id)=>{
    if(!tripId)throw Error('Select a trip first.');
    setBusy(true);
    try{
      const query=id?supabase.from(table).update(payload).eq('id',id).eq('trip_id',tripId):supabase.from(table).insert({trip_id:tripId,...payload});
      const {error}=await query;
      if(error)throw error;
      await refresh(table);
      return true;
    }catch(e){toast(e.message);return false}finally{setBusy(false)}
  },[tripId,refresh,toast]);

  const saveMany=useCallback(async(table,payloads)=>{
    if(!payloads.length)return true;
    setBusy(true);
    try{
      const {error}=await supabase.from(table).insert(payloads.map(p=>({trip_id:tripId,...p})));
      if(error)throw error;
      await refresh(table);
      return true;
    }catch(e){toast(e.message);return false}finally{setBusy(false)}
  },[tripId,refresh,toast]);

  const remove=useCallback(async(table,row,{allowUndo=true}={})=>{
    setBusy(true);
    try{
      const {error}=await supabase.from(table).delete().eq('id',row.id).eq('trip_id',tripId);
      if(error)throw error;
      if(allowUndo){
        const cleanRow={...row};
        if(table==='expenses')delete cleanRow.amount_base;
        setUndoRecord({table,row:cleanRow});
      }
      await refresh(table);
      return true;
    }catch(e){toast(e.message);return false}finally{setBusy(false)}
  },[tripId,refresh,toast]);

  async function undo(){
    if(!undoRecord)return;
    const {table,row}=undoRecord;
    const {error}=await supabase.from(table).insert(row);
    if(error){toast(error.message);return;}
    setUndoRecord(null);
    await refresh(table);
    toast('Deletion undone.');
  }

  const updateTrip=useCallback(async(payload)=>{
    const {error}=await supabase.from('trips').update(payload).eq('id',tripId);
    if(error){toast(error.message);return false}
    await loadTrips();
    return true
  },[tripId,loadTrips,toast]);

  const goDay=n=>{setDay(n);setFocused(n);setPage('day');window.scrollTo({top:0,behavior:'smooth'})};
  const ctx={trip:current,data,save,saveMany,remove,refresh,updateTrip,toast,goDay,busy,setPage,day,setDay,focused,setFocused,tripId};

  if(!enabled)return <div className="setup-screen"><h1>Travel Dashboard</h1><p>The app is ready for a Supabase connection.</p></div>;
  if(session===undefined)return <div className="loading">Loading account…</div>;
  if(!session)return <Auth/>;
  if(tripsLoading)return <div className="loading">Loading your trips…</div>;
  if(tripsError)return <div className="auth-wrap"><div className="auth-card"><div className="brand large"><Plane/> Travel Dashboard</div><h2>Couldn't load your trips</h2><p className="notice danger">{tripsError}</p><div className="row end"><Btn onClick={()=>supabase.auth.signOut()}><LogOut size={16}/> Sign out</Btn><button className="btn primary" onClick={()=>{setTripsLoading(true);setTripsError('');loadTrips().then(list=>setTripId(prev=>list.some(t=>t.id===prev)?prev:list[0]?.id||'')).catch(e=>setTripsError(e.message||'Unable to load trips.')).finally(()=>setTripsLoading(false))}}>Retry</button></div></div></div>;
  if(tripsLoadedForUser!==session.user.id)return <div className="loading">Restoring your trip workspace…</div>;
  if(!current)return <div className="auth-wrap"><div className="auth-card"><div className="brand large"><Plane/> Travel Dashboard</div><p className="muted">Welcome. Create your first trip to begin.</p><Btn onClick={()=>setCreating(true)} kind="primary"><Plus size={17}/> New trip</Btn><Btn onClick={()=>supabase.auth.signOut()}><LogOut size={16}/> Sign out</Btn>{creating&&<Modal title="Create trip" onClose={()=>setCreating(false)}><NewTrip session={session} onCreate={async t=>{await loadTrips();setTripId(t.id);setCreating(false)}} onCancel={()=>setCreating(false)}/></Modal>}</div></div>;

  return <div className="app-shell"><aside className="sidebar"><div className="brand"><Plane size={22}/> Travel Dashboard</div><nav aria-label="Primary navigation">{nav.map(n=><button key={n.id} className={page===n.id||page==='day'&&n.id==='overview'?'nav-active':''} onClick={()=>setPage(n.id)}><n.Icon size={18}/><span>{n.label}</span></button>)}</nav><div className="sidebar-footer"><span className="muted tiny">Private trip workspace</span><button onClick={()=>supabase.auth.signOut()}><LogOut size={16}/> Sign out</button></div></aside><div className="main-shell"><header className="topbar"><div className="trip-header"><div><div className="eyebrow">YOUR TRIP</div><select aria-label="Choose trip" className="trip-switch" value={tripId} onChange={e=>{setTripId(e.target.value);setPage('overview')}}>{trips.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div><Btn title="Create another trip" onClick={()=>setCreating(true)}><Plus size={16}/> <span className="hide-mobile">New trip</span></Btn></div><div className="topbar-actions"><span className="muted tiny hide-mobile">{session.user.email}</span><Btn onClick={()=>supabase.auth.signOut()} title="Sign out"><LogOut size={16}/></Btn></div></header><nav className="mobile-nav" aria-label="Main sections">{nav.map(n=><button key={n.id} className={page===n.id||page==='day'&&n.id==='overview'?'active':''} onClick={()=>setPage(n.id)}><n.Icon size={16}/>{n.label}</button>)}</nav><main className="content" key={tripId}>{notice&&<div className="toast"><CheckCircle2 size={17}/><span>{notice.message}</span><button onClick={()=>setNotice(null)} aria-label="Dismiss">×</button></div>}{undoRecord&&<div className="undo-bar"><span>Item deleted.</span><Btn onClick={undo}>Undo</Btn><button className="icon-button" onClick={()=>setUndoRecord(null)} aria-label="Dismiss undo">×</button></div>}{page==='overview'&&<Overview {...ctx}/>} {page==='day'&&<DayView {...ctx}/>} {page==='ideas'&&<Ideas {...ctx}/>} {page==='todos'&&<Todos {...ctx}/>} {page==='packing'&&<Packing {...ctx}/>} {page==='souvenirs'&&<Souvenirs {...ctx}/>} {page==='expenses'&&<Expenses {...ctx}/>} {page==='info'&&<TripInfo {...ctx}/>}</main></div>{creating&&<Modal title="Create another trip" onClose={()=>setCreating(false)}><NewTrip session={session} onCreate={async t=>{await loadTrips();setTripId(t.id);setCreating(false);setPage('overview')}} onCancel={()=>setCreating(false)}/></Modal>}</div>;
}
