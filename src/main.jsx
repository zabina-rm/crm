import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { supabase, isDemoMode } from './supabase'
import './styles.css'

const STAGES = ['New Lead','Contacted','Nurturing','Active','Under Contract','Closed','Lost']
const ACTIVE_STAGES = ['Active','Under Contract']
const INTERACTION_TYPES = ['Call','Email','Text','Meeting','Showing','Offer','Note']
const money = n => new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(Number(n || 0))
const today = () => new Date().toISOString().slice(0,10)
const uid = () => crypto.randomUUID()
const fmtDateTime = value => value ? new Intl.DateTimeFormat('en-CA',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)) : '—'
const fmtDate = value => value ? new Intl.DateTimeFormat('en-CA',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(`${value}T12:00:00Z`)) : '—'
const datePlus = days => { const d = new Date(); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10) }
const dayDiff = value => { if(!value) return null; const a=new Date(`${today()}T12:00:00`); const b=new Date(`${value}T12:00:00`); return Math.round((b-a)/86400000) }

const seed = {
  contacts: [{id:'demo-contact-1',first_name:'Alex',last_name:'Martin',phone:'416-555-0184',email:'alex@example.com',type:'Buyer',stage:'Active',budget:850000,lead_source:'Referral',property_notes:'3 bed home in west end',notes:'Pre-approved and wants to buy within 60 days.',next_follow_up:today(),preferred_areas:'High Park, Roncesvalles',property_type:'Detached / semi',bedrooms_min:3,bathrooms_min:2,timeline:'Within 60 days',created_at:new Date().toISOString()}],
  deals: [{id:'demo-deal-1',contact_id:'demo-contact-1',title:'West End Purchase',property_address:'TBD',status:'Active',price:850000,expected_commission:21250,closing_date:'',created_at:new Date().toISOString()}],
  tasks: [{id:'demo-task-1',contact_id:'demo-contact-1',title:'Call Alex about new listings',due_date:today(),completed:false,created_at:new Date().toISOString()}],
  interactions: [{id:'demo-interaction-1',contact_id:'demo-contact-1',type:'Call',summary:'Discussed mortgage pre-approval and preferred west-end neighbourhoods.',occurred_at:new Date().toISOString(),created_at:new Date().toISOString()}]
}

function loadDemo(){
  const raw = localStorage.getItem('homebase_crm_v4')
  if (raw) return JSON.parse(raw)
  const old = localStorage.getItem('homebase_crm_v3') || localStorage.getItem('homebase_crm_v2')
  const initial = old ? {...JSON.parse(old), interactions: JSON.parse(old).interactions || []} : seed
  localStorage.setItem('homebase_crm_v4', JSON.stringify(initial))
  return structuredClone(initial)
}
function saveDemo(data){ localStorage.setItem('homebase_crm_v4', JSON.stringify(data)) }

function Auth({onSession}){
  const [mode,setMode]=useState('signin'); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [msg,setMsg]=useState(''); const [busy,setBusy]=useState(false)
  async function submit(e){
    e.preventDefault(); setBusy(true); setMsg('')
    const action = mode==='signin' ? supabase.auth.signInWithPassword({email,password}) : supabase.auth.signUp({email,password})
    const {data,error}=await action; setBusy(false)
    if(error) return setMsg(error.message)
    if(data.session) onSession(data.session); else setMsg('Account created. Check your email if confirmation is enabled.')
  }
  return <div className="authShell"><div className="authCard"><div className="logo">⌂ HomeBase CRM</div><h1>{mode==='signin'?'Sign in':'Create account'}</h1><p className="muted">Private access to your real-estate client database.</p><form onSubmit={submit}><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label><label>Password<input type="password" minLength="6" value={password} onChange={e=>setPassword(e.target.value)} required /></label>{msg&&<div className="notice">{msg}</div>}<button className="btn primary wide" disabled={busy}>{busy?'Working…':mode==='signin'?'Sign in':'Create account'}</button></form><button className="link" onClick={()=>setMode(mode==='signin'?'signup':'signin')}>{mode==='signin'?'Need an account? Create one':'Already have an account? Sign in'}</button></div></div>
}

function Modal({title,onClose,children}){ return <div className="modal" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className="modalBox"><div className="modalHead"><h2>{title}</h2><button className="iconBtn" onClick={onClose}>×</button></div>{children}</div></div> }

function ContactForm({contact,onSave,onClose}){
  const [f,setF]=useState(contact||{first_name:'',last_name:'',phone:'',email:'',type:'Buyer',stage:'New Lead',budget:'',lead_source:'',property_notes:'',notes:'',next_follow_up:'',preferred_areas:'',property_type:'',bedrooms_min:'',bathrooms_min:'',timeline:''})
  const set=(k,v)=>setF({...f,[k]:v})
  return <form onSubmit={e=>{e.preventDefault();onSave(f)}}><div className="formGrid"><label>First name<input value={f.first_name||''} onChange={e=>set('first_name',e.target.value)} required /></label><label>Last name<input value={f.last_name||''} onChange={e=>set('last_name',e.target.value)} required /></label><label>Phone<input value={f.phone||''} onChange={e=>set('phone',e.target.value)} /></label><label>Email<input type="email" value={f.email||''} onChange={e=>set('email',e.target.value)} /></label><label>Client type<select value={f.type} onChange={e=>set('type',e.target.value)}><option>Buyer</option><option>Seller</option><option>Investor</option><option>Landlord</option><option>Tenant</option><option>Past Client</option></select></label><label>Pipeline stage<select value={f.stage} onChange={e=>set('stage',e.target.value)}>{STAGES.map(s=><option key={s}>{s}</option>)}</select></label><label>Budget / value<input type="number" value={f.budget||''} onChange={e=>set('budget',e.target.value)} /></label><label>Next follow-up<input type="date" value={f.next_follow_up||''} onChange={e=>set('next_follow_up',e.target.value)} /></label><label>Lead source<input value={f.lead_source||''} onChange={e=>set('lead_source',e.target.value)} placeholder="Referral, open house…" /></label><label>Timeline<input value={f.timeline||''} onChange={e=>set('timeline',e.target.value)} placeholder="Within 90 days" /></label><label>Preferred areas<input value={f.preferred_areas||''} onChange={e=>set('preferred_areas',e.target.value)} /></label><label>Property type<input value={f.property_type||''} onChange={e=>set('property_type',e.target.value)} placeholder="Condo, detached…" /></label><label>Minimum bedrooms<input type="number" min="0" value={f.bedrooms_min||''} onChange={e=>set('bedrooms_min',e.target.value)} /></label><label>Minimum bathrooms<input type="number" min="0" step="0.5" value={f.bathrooms_min||''} onChange={e=>set('bathrooms_min',e.target.value)} /></label><label className="full">Property needs / address<input value={f.property_notes||''} onChange={e=>set('property_notes',e.target.value)} /></label><label className="full">General notes<textarea value={f.notes||''} onChange={e=>set('notes',e.target.value)} /></label></div><div className="modalActions"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn primary">Save contact</button></div></form>
}

function DealForm({contacts,onSave,onClose,contactId=''}){
  const [f,setF]=useState({contact_id:contactId||contacts[0]?.id||'',title:'',property_address:'',status:'Active',price:'',expected_commission:'',closing_date:''}); const set=(k,v)=>setF({...f,[k]:v})
  return <form onSubmit={e=>{e.preventDefault();onSave(f)}}><div className="formGrid"><label>Client<select value={f.contact_id} onChange={e=>set('contact_id',e.target.value)} required>{contacts.map(c=><option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}</select></label><label>Deal name<input value={f.title} onChange={e=>set('title',e.target.value)} required /></label><label className="full">Property address<input value={f.property_address} onChange={e=>set('property_address',e.target.value)} /></label><label>Status<select value={f.status} onChange={e=>set('status',e.target.value)}><option>Active</option><option>Conditional</option><option>Firm</option><option>Closed</option><option>Lost</option></select></label><label>Price<input type="number" value={f.price} onChange={e=>set('price',e.target.value)} /></label><label>Expected commission<input type="number" value={f.expected_commission} onChange={e=>set('expected_commission',e.target.value)} /></label><label>Closing date<input type="date" value={f.closing_date} onChange={e=>set('closing_date',e.target.value)} /></label></div><div className="modalActions"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn primary">Save deal</button></div></form>
}

function TaskForm({contacts,onSave,onClose,contactId=''}){
  const [f,setF]=useState({contact_id:contactId||contacts[0]?.id||'',title:'',due_date:today(),completed:false}); const set=(k,v)=>setF({...f,[k]:v})
  return <form onSubmit={e=>{e.preventDefault();onSave(f)}}><div className="formGrid"><label>Client<select value={f.contact_id} onChange={e=>set('contact_id',e.target.value)}><option value="">No client</option>{contacts.map(c=><option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}</select></label><label>Due date<input type="date" value={f.due_date} onChange={e=>set('due_date',e.target.value)} required /></label><label className="full">Task<input value={f.title} onChange={e=>set('title',e.target.value)} required /></label></div><div className="modalActions"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn primary">Save task</button></div></form>
}

function InteractionForm({contactId,onSave,onClose}){
  const [f,setF]=useState({contact_id:contactId,type:'Call',summary:'',occurred_at:new Date().toISOString().slice(0,16)})
  const set=(k,v)=>setF({...f,[k]:v})
  return <form onSubmit={e=>{e.preventDefault();onSave({...f,occurred_at:new Date(f.occurred_at).toISOString()})}}><div className="formGrid"><label>Interaction type<select value={f.type} onChange={e=>set('type',e.target.value)}>{INTERACTION_TYPES.map(x=><option key={x}>{x}</option>)}</select></label><label>Date & time<input type="datetime-local" value={f.occurred_at} onChange={e=>set('occurred_at',e.target.value)} required /></label><label className="full">What happened?<textarea value={f.summary} onChange={e=>set('summary',e.target.value)} placeholder="Discussed new listings, showing feedback, offer details…" required /></label></div><div className="modalActions"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn primary">Add to timeline</button></div></form>
}

function ClientDetail({contact,data,onBack,onEdit,onAddInteraction,onAddTask,onAddDeal,toggleTask,onRescheduleFollowUp}){
  const interactions = data.interactions.filter(x=>x.contact_id===contact.id).sort((a,b)=>new Date(b.occurred_at)-new Date(a.occurred_at))
  const tasks = data.tasks.filter(x=>x.contact_id===contact.id)
  const deals = data.deals.filter(x=>x.contact_id===contact.id)
  return <>
    <div className="detailTop"><button className="backBtn" onClick={onBack}>← Contacts</button><div className="detailActions"><button className="btn" onClick={onEdit}>Edit client</button><button className="btn" onClick={onAddTask}>+ Task</button><button className="btn" onClick={onAddDeal}>+ Deal</button><button className="btn primary" onClick={onAddInteraction}>+ Log interaction</button></div></div>
    <div className="profileHero"><div className="avatar">{contact.first_name?.[0]}{contact.last_name?.[0]}</div><div><h1>{contact.first_name} {contact.last_name}</h1><div className="profileMeta"><Pill text={contact.stage}/><span>{contact.type}</span>{contact.phone&&<span>{contact.phone}</span>}{contact.email&&<span>{contact.email}</span>}</div></div></div>
    <div className="detailGrid">
      <section className="card detailCard"><h2>Client snapshot</h2><dl className="facts"><div><dt>Budget / value</dt><dd>{money(contact.budget)}</dd></div><div><dt>Lead source</dt><dd>{contact.lead_source||'—'}</dd></div><div><dt>Next follow-up</dt><dd>{fmtDate(contact.next_follow_up)}</dd></div><div><dt>Timeline</dt><dd>{contact.timeline||'—'}</dd></div></dl>{contact.next_follow_up&&<div className="quickRow"><button className="miniBtn" onClick={()=>onRescheduleFollowUp(contact,datePlus(1))}>Tomorrow</button><button className="miniBtn" onClick={()=>onRescheduleFollowUp(contact,datePlus(7))}>+ 1 week</button><button className="miniBtn doneBtn" onClick={()=>onRescheduleFollowUp(contact,null)}>Done</button></div>}</section>
      <section className="card detailCard"><h2>Property criteria</h2><dl className="facts"><div><dt>Preferred areas</dt><dd>{contact.preferred_areas||'—'}</dd></div><div><dt>Property type</dt><dd>{contact.property_type||'—'}</dd></div><div><dt>Bedrooms</dt><dd>{contact.bedrooms_min||'—'}</dd></div><div><dt>Bathrooms</dt><dd>{contact.bathrooms_min||'—'}</dd></div></dl>{contact.property_notes&&<p className="detailNote">{contact.property_notes}</p>}</section>
    </div>
    {contact.notes&&<section className="card detailCard"><h2>General notes</h2><p className="detailNote">{contact.notes}</p></section>}
    <div className="detailGrid lower">
      <section><div className="sectionTitleRow"><h2>Timeline</h2><button className="link" onClick={onAddInteraction}>+ Add interaction</button></div><div className="timeline">{interactions.length?interactions.map(x=><div className="timelineItem" key={x.id}><div className="timelineDot"></div><div className="timelineContent"><div className="timelineHead"><strong>{x.type}</strong><span>{fmtDateTime(x.occurred_at)}</span></div><p>{x.summary}</p></div></div>):<div className="emptyCard">No interactions logged yet.</div>}</div></section>
      <section><h2>Open tasks</h2><div className="stackList">{tasks.length?tasks.map(t=><label className="stackItem" key={t.id}><input type="checkbox" checked={t.completed} onChange={()=>toggleTask(t)}/><div><strong className={t.completed?'done':''}>{t.title}</strong><small>Due {fmtDate(t.due_date)}</small></div></label>):<div className="emptyCard">No tasks for this client.</div>}</div><h2 className="spaced">Deals</h2><div className="stackList">{deals.length?deals.map(d=><div className="stackItem" key={d.id}><div className="dealIcon">$</div><div><strong>{d.title}</strong><small>{d.property_address||'Address TBD'} · {money(d.price)} · {d.status}</small></div></div>):<div className="emptyCard">No deals for this client.</div>}</div></section>
    </div>
  </>
}

function FollowUpCard({contact,onOpen,onSetDate}){
  const diff=dayDiff(contact.next_follow_up)
  const label=diff<0?`${Math.abs(diff)} day${Math.abs(diff)===1?'':'s'} overdue`:diff===0?'Due today':diff===1?'Due tomorrow':`Due in ${diff} days`
  return <div className={`followCard ${diff<0?'overdue':diff===0?'todayDue':''}`}><div className="followMain"><div className="avatar small">{contact.first_name?.[0]}{contact.last_name?.[0]}</div><div><button className="nameBtn big" onClick={onOpen}>{contact.first_name} {contact.last_name}</button><div className="followMeta"><span>{contact.type}</span><span>•</span><span>{contact.stage}</span>{contact.phone&&<><span>•</span><span>{contact.phone}</span></>}</div><div className="dueLabel">{label} · {fmtDate(contact.next_follow_up)}</div></div></div><div className="quickActions"><button className="miniBtn" onClick={()=>onSetDate(contact,datePlus(1))}>Tomorrow</button><button className="miniBtn" onClick={()=>onSetDate(contact,datePlus(7))}>+ 1 week</button><button className="miniBtn doneBtn" onClick={()=>onSetDate(contact,null)}>Done</button></div></div>
}

function TaskRow({task,clientName,onToggle,onReschedule}){
  const diff=dayDiff(task.due_date)
  return <div className={`todayTask ${diff<0?'overdue':''}`}><label className="todayTaskMain"><input type="checkbox" checked={task.completed} onChange={()=>onToggle(task)}/><div><strong>{task.title}</strong><span>{clientName}</span></div></label><div className="taskRight"><span className="dueLabel">{diff<0?`${Math.abs(diff)}d overdue`:diff===0?'Today':fmtDate(task.due_date)}</span><button className="miniBtn" onClick={()=>onReschedule(task,datePlus(1))}>Tomorrow</button><button className="miniBtn" onClick={()=>onReschedule(task,datePlus(7))}>+ 1 week</button></div></div>
}

function App(){
  const [session,setSession]=useState(null); const [loading,setLoading]=useState(!isDemoMode); const [view,setView]=useState('today'); const [data,setData]=useState(()=>isDemoMode?loadDemo():{contacts:[],deals:[],tasks:[],interactions:[]}); const [modal,setModal]=useState(null); const [selected,setSelected]=useState(null); const [detailId,setDetailId]=useState(null); const [search,setSearch]=useState(''); const [error,setError]=useState('')
  useEffect(()=>{ if(isDemoMode)return; supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)}); const {data:sub}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s)); return()=>sub.subscription.unsubscribe() },[])
  useEffect(()=>{ if(!isDemoMode && session) refresh() },[session])
  async function refresh(){
    setError('')
    const [c,d,t,i]=await Promise.all([supabase.from('contacts').select('*').order('created_at',{ascending:false}),supabase.from('deals').select('*').order('created_at',{ascending:false}),supabase.from('tasks').select('*').order('due_date',{ascending:true}),supabase.from('interactions').select('*').order('occurred_at',{ascending:false})])
    const firstError = c.error||d.error||t.error||i.error
    if(firstError) setError(firstError.message)
    setData({contacts:c.data||[],deals:d.data||[],tasks:t.data||[],interactions:i.data||[]})
  }
  function setDemo(next){ setData(next); saveDemo(next) }
  async function saveContact(f){
const numeric={
  budget:Number(f.budget||0),
  bedrooms_min:f.bedrooms_min===''?null:Number(f.bedrooms_min),
  bathrooms_min:f.bathrooms_min===''?null:Number(f.bathrooms_min),
  next_follow_up:f.next_follow_up||null
}
    if(isDemoMode){ const now=new Date().toISOString(); const obj={...f,...numeric,id:f.id||uid(),created_at:f.created_at||now}; const next=data.contacts.some(c=>c.id===obj.id)?data.contacts.map(c=>c.id===obj.id?obj:c):[obj,...data.contacts]; setDemo({...data,contacts:next}); }
    else { const payload={
  ...f,
  ...numeric,
  next_follow_up:f.next_follow_up || null,
  user_id:session.user.id
}; const {error}=f.id?await supabase.from('contacts').update(payload).eq('id',f.id):await supabase.from('contacts').insert(payload); if(error){setError(error.message);return} await refresh() }
    setModal(null); setSelected(null)
  }
  async function saveDeal(f){ if(isDemoMode){setDemo({...data,deals:[{...f,id:uid(),price:Number(f.price||0),expected_commission:Number(f.expected_commission||0),created_at:new Date().toISOString()},...data.deals]})}else{const {error}=await supabase.from('deals').insert({...f,price:Number(f.price||0),expected_commission:Number(f.expected_commission||0),user_id:session.user.id});if(error){setError(error.message);return}await refresh()} setModal(null) }
  async function saveTask(f){ if(isDemoMode){setDemo({...data,tasks:[{...f,id:uid(),completed:false,created_at:new Date().toISOString()},...data.tasks]})}else{const {error}=await supabase.from('tasks').insert({...f,user_id:session.user.id});if(error){setError(error.message);return}await refresh()} setModal(null) }
  async function saveInteraction(f){ if(isDemoMode){setDemo({...data,interactions:[{...f,id:uid(),created_at:new Date().toISOString()},...data.interactions]})}else{const {error}=await supabase.from('interactions').insert({...f,user_id:session.user.id});if(error){setError(error.message);return}await refresh()} setModal(null) }
  async function toggleTask(task){ if(isDemoMode){setDemo({...data,tasks:data.tasks.map(t=>t.id===task.id?{...t,completed:!t.completed}:t)})}else{const {error}=await supabase.from('tasks').update({completed:!task.completed}).eq('id',task.id);if(error){setError(error.message);return}await refresh()} }
  async function rescheduleTask(task,due_date){ if(isDemoMode){setDemo({...data,tasks:data.tasks.map(t=>t.id===task.id?{...t,due_date}:t)})}else{const {error}=await supabase.from('tasks').update({due_date}).eq('id',task.id);if(error){setError(error.message);return}await refresh()} }
  async function rescheduleFollowUp(contact,next_follow_up){ if(isDemoMode){setDemo({...data,contacts:data.contacts.map(c=>c.id===contact.id?{...c,next_follow_up}:c)})}else{const {error}=await supabase.from('contacts').update({next_follow_up}).eq('id',contact.id);if(error){setError(error.message);return}await refresh()} }

  const contactName=id=>{const c=data.contacts.find(x=>x.id===id);return c?`${c.first_name} ${c.last_name}`:'—'}
  const dueTasks=data.tasks.filter(t=>!t.completed&&t.due_date<=today())
  const followUpsDue=data.contacts.filter(c=>c.next_follow_up&&c.next_follow_up<=today()).sort((a,b)=>a.next_follow_up.localeCompare(b.next_follow_up))
  const upcomingFollowUps=data.contacts.filter(c=>c.next_follow_up&&c.next_follow_up>today()&&c.next_follow_up<=datePlus(7)).sort((a,b)=>a.next_follow_up.localeCompare(b.next_follow_up))
  const pipelineCommission=data.deals.filter(d=>!['Closed','Lost'].includes(d.status)).reduce((s,d)=>s+Number(d.expected_commission||0),0)
  const filtered=data.contacts.filter(c=>`${c.first_name} ${c.last_name} ${c.email||''} ${c.phone||''}`.toLowerCase().includes(search.toLowerCase()))
  const detailContact=data.contacts.find(c=>c.id===detailId)
  const todayCount=followUpsDue.length+dueTasks.length
  if(loading)return <div className="center">Loading…</div>; if(!isDemoMode&&!session)return <Auth onSession={setSession}/>
  const nav=['today','dashboard','contacts','pipeline','deals','tasks']
  return <div className="app"><aside><div className="logo">⌂ HomeBase CRM</div><nav>{nav.map(v=><button key={v} className={view===v&&!detailId?'active':''} onClick={()=>{setView(v);setDetailId(null)}}>{v==='today'?<>Today {todayCount>0&&<span className="navBadge">{todayCount}</span>}</>:v[0].toUpperCase()+v.slice(1)}</button>)}</nav><div className="asideBottom"><div className="mode">{isDemoMode?'Demo mode':'Supabase connected'}</div>{!isDemoMode&&<button className="link light" onClick={()=>supabase.auth.signOut()}>Sign out</button>}</div></aside><main>
    {isDemoMode&&<div className="banner"><strong>Demo mode:</strong> data is saved in this browser. Add your Supabase keys to enable login + cloud storage.</div>}
    {error&&<div className="errorBanner"><strong>Database:</strong> {error}</div>}
    {detailContact?<ClientDetail contact={detailContact} data={data} onBack={()=>setDetailId(null)} onEdit={()=>{setSelected(detailContact);setModal('contact')}} onAddInteraction={()=>setModal('interaction')} onAddTask={()=>setModal('task')} onAddDeal={()=>setModal('deal')} toggleTask={toggleTask} onRescheduleFollowUp={rescheduleFollowUp}/>:<>
    {view==='today'&&<><Header title="Today" subtitle="Your daily real-estate follow-up list." action="+ Add task" onAction={()=>setModal('task')}/><div className="metrics"><Metric label="Follow-ups due" value={followUpsDue.length}/><Metric label="Tasks due" value={dueTasks.length}/><Metric label="Next 7 days" value={upcomingFollowUps.length}/><Metric label="Active clients" value={data.contacts.filter(c=>ACTIVE_STAGES.includes(c.stage)).length}/></div>
      <Section title="Client follow-ups"><div className="todayList">{followUpsDue.length?followUpsDue.map(c=><FollowUpCard key={c.id} contact={c} onOpen={()=>setDetailId(c.id)} onSetDate={rescheduleFollowUp}/>):<div className="emptyCard successEmpty">✓ No client follow-ups are overdue or due today.</div>}</div></Section>
      <Section title="Tasks due"><div className="todayList">{dueTasks.length?dueTasks.map(t=><TaskRow key={t.id} task={t} clientName={contactName(t.contact_id)} onToggle={toggleTask} onReschedule={rescheduleTask}/>):<div className="emptyCard successEmpty">✓ No outstanding tasks are due today.</div>}</div></Section>
      <Section title="Coming up in the next 7 days"><div className="upcomingGrid">{upcomingFollowUps.length?upcomingFollowUps.map(c=><button className="upcomingCard" key={c.id} onClick={()=>setDetailId(c.id)}><strong>{c.first_name} {c.last_name}</strong><span>{fmtDate(c.next_follow_up)}</span><small>{c.type} · {c.stage}</small></button>):<div className="emptyCard">No scheduled client follow-ups in the next 7 days.</div>}</div></Section></>}
    {view==='dashboard'&&<><Header title="Dashboard" action="+ Add contact" onAction={()=>setModal('contact')}/><div className="metrics"><Metric label="Contacts" value={data.contacts.length}/><Metric label="Active clients" value={data.contacts.filter(c=>ACTIVE_STAGES.includes(c.stage)).length}/><Metric label="Items due today" value={todayCount}/><Metric label="Pipeline commission" value={money(pipelineCommission)}/></div><Section title="Follow-ups needing attention"><Table heads={['Client','Type','Stage','Follow-up']} rows={followUpsDue.slice(0,8).map(c=>[<button className="nameBtn" onClick={()=>setDetailId(c.id)}>{c.first_name} {c.last_name}</button>,c.type,<Pill text={c.stage}/>,fmtDate(c.next_follow_up)])} empty="No client follow-ups due."/></Section><Section title="Active deals"><Table heads={['Deal','Client','Status','Price','Commission']} rows={data.deals.filter(d=>!['Closed','Lost'].includes(d.status)).slice(0,8).map(d=>[d.title,contactName(d.contact_id),<Pill text={d.status}/>,money(d.price),money(d.expected_commission)])} empty="No active deals yet."/></Section></>}
    {view==='contacts'&&<><Header title="Contacts" action="+ Add contact" onAction={()=>setModal('contact')}/><div className="toolbar"><input placeholder="Search contacts…" value={search} onChange={e=>setSearch(e.target.value)}/></div><Table heads={['Name','Contact','Type','Stage','Follow-up','Budget']} rows={filtered.map(c=>[<button className="nameBtn" onClick={()=>setDetailId(c.id)}>{c.first_name} {c.last_name}</button>,c.phone||c.email||'—',c.type,<Pill text={c.stage}/>,fmtDate(c.next_follow_up),money(c.budget)])} empty="No contacts found."/></>}
    {view==='pipeline'&&<><Header title="Pipeline" action="+ Add contact" onAction={()=>setModal('contact')}/><div className="kanban">{STAGES.slice(0,5).map(stage=><div className="column" key={stage}><h3>{stage} <span>{data.contacts.filter(c=>c.stage===stage).length}</span></h3>{data.contacts.filter(c=>c.stage===stage).map(c=><div className="lead" key={c.id} onClick={()=>setDetailId(c.id)}><strong>{c.first_name} {c.last_name}</strong><small>{c.type} · {money(c.budget)}</small><small>{c.next_follow_up?`Follow up ${fmtDate(c.next_follow_up)}`:'No follow-up set'}</small></div>)}</div>)}</div></>}
    {view==='deals'&&<><Header title="Deals" action="+ Add deal" onAction={()=>setModal('deal')}/><Table heads={['Deal','Client','Property','Status','Price','Commission','Closing']} rows={data.deals.map(d=>[d.title,contactName(d.contact_id),d.property_address||'—',<Pill text={d.status}/>,money(d.price),money(d.expected_commission),fmtDate(d.closing_date)])} empty="No deals yet."/></>}
    {view==='tasks'&&<><Header title="Tasks" action="+ Add task" onAction={()=>setModal('task')}/><Table heads={['Done','Task','Client','Due']} rows={data.tasks.map(t=>[<input type="checkbox" checked={t.completed} onChange={()=>toggleTask(t)}/>,<span className={t.completed?'done':''}>{t.title}</span>,contactName(t.contact_id),fmtDate(t.due_date)])} empty="No tasks yet."/></>}
    </>}
  </main>{modal==='contact'&&<Modal title={selected?'Edit contact':'Add contact'} onClose={()=>{setModal(null);setSelected(null)}}><ContactForm contact={selected} onSave={saveContact} onClose={()=>{setModal(null);setSelected(null)}}/></Modal>}{modal==='deal'&&<Modal title="Add deal" onClose={()=>setModal(null)}><DealForm contacts={data.contacts} contactId={detailId||''} onSave={saveDeal} onClose={()=>setModal(null)}/></Modal>}{modal==='task'&&<Modal title="Add task" onClose={()=>setModal(null)}><TaskForm contacts={data.contacts} contactId={detailId||''} onSave={saveTask} onClose={()=>setModal(null)}/></Modal>}{modal==='interaction'&&detailId&&<Modal title="Log interaction" onClose={()=>setModal(null)}><InteractionForm contactId={detailId} onSave={saveInteraction} onClose={()=>setModal(null)}/></Modal>}</div>
}

function Header({title,subtitle='Keep every client, follow-up, and transaction moving.',action,onAction}){return <div className="header"><div><h1>{title}</h1><p>{subtitle}</p></div><button className="btn primary" onClick={onAction}>{action}</button></div>}
function Metric({label,value}){return <div className="card metric"><span>{label}</span><strong>{value}</strong></div>}
function Section({title,children}){return <section><h2>{title}</h2>{children}</section>}
function Pill({text}){return <span className={`pill ${String(text).toLowerCase().replaceAll(' ','-')}`}>{text}</span>}
function Table({heads,rows,empty}){return <div className="tableWrap"><table><thead><tr>{heads.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.length?rows.map((r,i)=><tr key={i}>{r.map((x,j)=><td key={j}>{x}</td>)}</tr>):<tr><td colSpan={heads.length} className="empty">{empty}</td></tr>}</tbody></table></div>}

createRoot(document.getElementById('root')).render(<App />)
