import React,{useEffect,useRef,useState} from 'react';
import { ChevronDown, MoreHorizontal, MapPin, Route, Pencil, Plus, Trash2, ArrowRight, X, Check } from 'lucide-react';
import { mapHref, clock, parseTime, shortDate } from './lib.js';

export function Field({label,children,help}){return <label className="field"><span>{label}</span>{children}{help&&<small className="muted">{help}</small>}</label>}
export function Btn({children,kind='outline',className='',...rest}){return <button type="button" className={`btn ${kind} ${className}`} {...rest}>{children}</button>}
export function SectionTitle({title,sub,action}){return <div className="section-title"><div><h2>{title}</h2>{sub&&<p className="muted tiny">{sub}</p>}</div>{action}</div>}
export function Select({value,onChange,options,...rest}){return <select value={value??''} onChange={e=>onChange(e.target.value)} {...rest}>{options.map((o,i)=><option value={o.value} key={i}>{o.label}</option>)}</select>}
export function Choice({value,onChange,list,placeholder='Select...'}){return <Select value={value||''} onChange={onChange} options={[{value:'',label:placeholder},...list.map(x=>({value:x.id,label:x.name}))]}/>}

export function TimeEntry({value,onChange}){
  const [raw,setRaw]=useState(value&&value!==false?clock(value):'');
  const focused=useRef(false);

  useEffect(()=>{
    if(!focused.current) setRaw(value&&value!==false?clock(value):'');
  },[value]);

  const fmt=parseTime(raw);

  return (
    <div>
      <input 
        inputMode="numeric" 
        placeholder="930 → 09:30, blank = TBD" 
        value={raw} 
        onFocus={()=>{focused.current=true}} 
        onChange={e=>{
          setRaw(e.target.value);
          onChange(parseTime(e.target.value));
        }} 
        onBlur={()=>{
          focused.current=false;
          if(fmt!==false) setRaw(fmt||'');
        }}
      />
      {fmt === false && <small className="danger">Invalid time</small>}
      {fmt !== false && raw.trim() !== '' && raw !== fmt && <small className="muted">→ {fmt}</small>}
    </div>
  );
}

export function Status({activity}){return <span className="status-line">{activity.reservation_status==='reserved'&&<span className="flag good">Reserved</span>}{activity.reservation_status==='to_reserve'&&<span className="flag warning">To reserve</span>}{activity.action_needed&&<span className="flag warning">Action needed</span>}</span>}
export function MapButton({activity}){const href=mapHref(activity);if(!href)return null;return <a className="icon-button" href={href} target="_blank" rel="noopener noreferrer" aria-label="Open Google Maps" title="Google Maps">{activity.kind==='transport'?<Route size={18}/>:<MapPin size={18}/>}</a>}
export function ActionMenu({items}){const [open,setOpen]=useState(false);const ref=useRef(null);useEffect(()=>{if(!open)return;const close=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close)},[open]);return <div className="menu-anchor" ref={ref}><button type="button" className="icon-button" aria-label="More actions" aria-expanded={open} onClick={()=>setOpen(v=>!v)}><MoreHorizontal size={21}/></button>{open&&<div className="floating-menu" role="menu">{items.map((i,k)=><button type="button" role="menuitem" className={i.danger?'danger':''} key={k} onClick={()=>{setOpen(false);i.onClick()}}>{i.icon}{i.label}</button>)}</div>}</div>}
export function DayPicker({trip,selected,onChange,dayTitle}){const {dayCount,shortDate,offsetDate}=dayTitle;return <Select value={String(selected)} onChange={v=>onChange(Number(v))} options={Array.from({length:dayCount(trip)},(_,i)=>({value:String(i+1),label:`Day ${i+1} · ${shortDate(offsetDate(trip.start_date,i))}${dayTitle.title?` · ${dayTitle.title(i+1)}`:''}`}))}/>}
export function Modal({title,children,onClose,wide=false}){const ref=useRef(null);useEffect(()=>{const esc=e=>{if(e.key==='Escape')onClose()};document.addEventListener('keydown',esc);return()=>document.removeEventListener('keydown',esc)},[onClose]);return <div className="modal-backdrop" onPointerDown={e=>{if(e.target===e.currentTarget)onClose()}}><div ref={ref} className={`modal ${wide?'modal-wide':''}`} role="dialog" aria-modal="true" aria-label={title}><header><h3>{title}</h3><Btn kind="ghost" aria-label="Close" onClick={onClose}><X size={19}/></Btn></header>{children}</div></div>}
export function Empty({text,action}){return <div className="empty"><p>{text}</p>{action}</div>}
export function ConfirmDelete({name,onConfirm,onCancel}){return <div className="confirm"><strong>Delete {name}?</strong><p className="muted">This cannot be undone unless an Undo option is available.</p><div className="row end"><Btn onClick={onCancel}>Cancel</Btn><Btn kind="danger-button" onClick={onConfirm}>Delete</Btn></div></div>}
export function Progress({done,total}){return <div className="progress"><div style={{width:`${total?Math.min(100,done/total*100):0}%`}}/></div>}
export function ToolbarCount({done,total}){return <span className="muted tiny">{done} / {total}</span>}
export function Icons(){return null}
