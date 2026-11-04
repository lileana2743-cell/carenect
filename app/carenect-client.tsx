'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Home,Heart,MessageCircle,Palette,UserRound,Send,BatteryFull,Signal,ArrowLeft,ChevronRight,LogOut} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Toaster,toast} from 'sonner';
import {CareContext,CareRecord,Role,roleNames,asset,MediaDraft} from './care-context';
import {seedRecords,today} from '@/lib/care-data';
import {SeniorScreens} from './senior-screens';
import {CaregiverScreens} from './caregiver-screens';
import {FamilyScreens,CameraScreen,ComposerScreen} from './family-screens';
import {Chats,FamilyThreads,ProfileForm} from './shared-screens';

export default function CareApp({initialRole,signedIn}:{initialRole?:Role;signedIn:boolean}){
 const role=initialRole||'senior';
 const [screen,setScreen]=useState(initialRole?'home':'welcome'),[person,setPerson]=useState('liming'),[date,setDate]=useState(today());
 const [records,setRecords]=useState<CareRecord[]>(()=>seedRecords(today()).map(r=>({...r,id:r.id}))),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(!signedIn),[error,setError]=useState('');
 const [dialog,setDialog]=useState<{title:string;body:React.ReactNode;description?:string}|null>(null);
 const [mediaDraft,setMediaDraft]=useState<MediaDraft|null>(null);
 const viewport=useRef<HTMLDivElement>(null);
 const epoch=useRef(0);
 const load=useCallback(async()=>{if(!signedIn)return;const start=epoch.current;setError('');try{const r=await fetch('/api/care');const data:any=await r.json();if(!r.ok)throw new Error(data.error);if(start===epoch.current){setRecords(data.records);setLoaded(true);}}catch(e){setError(e instanceof Error?e.message:'Could not load your care circle.');}},[signedIn]);
 useEffect(()=>{load();},[load]);
 useEffect(()=>{if(!signedIn||busy)return;const timer=setInterval(load,15000);return()=>clearInterval(timer);},[signedIn,busy,load]);
 useEffect(()=>{const read=()=>{setScreen(new URLSearchParams(location.search).get('screen')||(initialRole?'home':'welcome'));viewport.current?.scrollTo(0,0);};read();window.addEventListener('popstate',read);return()=>window.removeEventListener('popstate',read);},[initialRole]);
 const go=(next:string)=>{setScreen(next);history.pushState({},'',(initialRole?'/'+role:'/')+(next==='home'||next==='welcome'?'':'?screen='+encodeURIComponent(next)));viewport.current?.scrollTo({top:0});};
 const signin=()=>location.assign('/auth?mode=login&return_to='+encodeURIComponent('/'+role+'?screen='+screen));
 async function send(payload:any){if(!signedIn){toast('Sign in to save to your care circle.',{action:{label:'Sign in',onClick:signin}});return null;}epoch.current++;setBusy(true);try{const r=await fetch('/api/care',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data:any=await r.json();if(!r.ok)throw new Error(data.error);return data;}catch(e){toast.error(e instanceof Error?e.message:'Could not save. Please try again.');return null;}finally{setBusy(false);}}
 const save=async(kind:string,content:any,id?:string)=>{const data=await send({kind,content,id});if(!data)return null;setRecords(prev=>id?prev.map(x=>x.id===id?data.record:x):[...prev,data.record]);return data.record as CareRecord;};
 const remove=async(record:CareRecord)=>{const data=await send({id:record.id,kind:record.kind,action:'delete'});if(!data)return false;setRecords(prev=>prev.filter(x=>x.id!==record.id));return true;};
 const modelState=useRef({records,save,person,date,signedIn});modelState.current={records,save,person,date,signedIn};
 useEffect(()=>{const context=(document as any).modelContext;if(!context?.registerTool)return;const controller=new AbortController();const register=(tool:any)=>{try{Promise.resolve(context.registerTool(tool,{signal:controller.signal})).catch(()=>{});}catch{}};
 register({name:'read_care_schedule',description:'Read the selected patient’s saved care schedule.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:()=>({date:modelState.current.date,tasks:modelState.current.signedIn?modelState.current.records.filter(r=>r.kind==='task'&&r.content.date===modelState.current.date&&r.content.person===modelState.current.person).map(r=>({id:r.id,...r.content})):[]})});
 register({name:'complete_care_task',description:'Complete a saved task and update the visible schedule.',inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async(input:any)=>{if(!modelState.current.signedIn)throw new Error('Please sign in first');const r=modelState.current.records.find(r=>r.id===input?.id&&r.kind==='task');if(!r)throw new Error('Task not found');if(!await modelState.current.save('task',{...r.content,done:true},r.id))throw new Error('Could not save');return{id:r.id,done:true};}});return()=>controller.abort();},[]);
 const primary=['home','care','chats','arts','mine','share'].includes(screen);
 const nav=role==='senior'?[['home','HOME',Home],['chats','CHATS',MessageCircle],['arts','ARTS',Palette],['mine','MINE',UserRound]]:role==='caregiver'?[['home','HOME',Home],['care','CARE',Heart],['chats','CHATS',MessageCircle],['mine','MINE',UserRound]]:[['home','HOME',Home],['share','SHARE',Send],['chats','CHATS',MessageCircle],['mine','MINE',UserRound]];
 const theme=['arts','threads','share'].includes(screen)?'threads-theme':screen==='mine'?(role==='senior'?'yellow-theme':'lavender-theme'):role==='family'&&screen==='home'?'lavender-theme':screen==='plant-detail'?'lime-theme':screen==='notice'?'gray-theme':role==='senior'&&screen==='home'?'gray-theme':'';
 const context={role,screen,go,records,signedIn,busy,save,remove,modal:(title:string,body:React.ReactNode,description?:string)=>setDialog({title,body,description}),close:()=>setDialog(null),person,setPerson,date,setDate,mediaDraft,setMediaDraft};
 let content;
 if(screen==='welcome'||screen==='signup')content=<Welcome signup={screen==='signup'} signedIn={signedIn} go={go}/>;
 else if(screen==='chats'||screen.startsWith('chat-'))content=<Chats/>;
 else if(screen==='threads'||screen==='share')content=<FamilyThreads/>;
 else if(screen==='camera')content=<CameraScreen/>;
 else if(screen==='composer')content=<ComposerScreen/>;
 else if(role==='senior')content=<SeniorScreens/>;
 else if(role==='caregiver')content=<CaregiverScreens/>;
 else content=<FamilyScreens/>;
 return <CareContext.Provider value={context}>
  <div className="client-switch" aria-label="Choose your client"><a className="mini-brand" href="/">Carenect</a><div>{(['senior','caregiver','family'] as Role[]).map(r=><a key={r} aria-current={initialRole===r?'page':undefined} href={'/'+r}>{roleNames[r]}</a>)}</div><span>{signedIn?'My care circle':'Sample care circle'}</span></div>
  <div className={'phone-app '+theme+(initialRole?'':' entry-app')}>
   <div className="status-bar" aria-hidden="true"><span><Signal size={13}/> 11:30AM</span><span>80% <BatteryFull size={29}/></span></div>
   <div ref={viewport} className={'app-viewport '+(primary?'with-nav':'')}>
    {error&&<div className="load-error" role="alert">{error}<button onClick={load}>Try again</button></div>}
    {!loaded&&!error&&<p className="loading-note" role="status">Loading your care circle…</p>}
    {!primary&&!['welcome','signup','music','music-player','plant-detail','heart-detail','chat-dad','chat-care','chat-family','camera','curate','composer'].includes(screen)&&<button className="secondary-back" aria-label="Go back" onClick={()=>go(['exhibition','plants','restaurant'].includes(screen)?'arts':role==='family'?'home':'arts')}><ArrowLeft size={22}/></button>}
    {content}
   </div>
   {primary&&initialRole&&<nav className="bottom-nav" aria-label={roleNames[role]+' navigation'}>{nav.map(([id,label,Icon]:any)=><button key={id} aria-current={screen===id?'page':undefined} onClick={()=>go(id)}><Icon size={29} fill={screen===id&&id!=='share'?'currentColor':'none'} strokeWidth={1.7}/><span>{label}</span></button>)}</nav>}
   <div className="home-indicator" aria-hidden="true"/>
  </div>
  <Dialog open={!!dialog} onOpenChange={open=>!open&&setDialog(null)}><DialogContent className="care-dialog"><DialogTitle>{dialog?.title}</DialogTitle><DialogDescription>{dialog?.description||'Your care circle'}</DialogDescription>{dialog?.body}</DialogContent></Dialog>
  <Toaster position="top-center" richColors/>
 </CareContext.Provider>;
}
function Welcome({signup,signedIn,go}:{signup:boolean;signedIn:boolean;go:(s:string)=>void}){
 const [role,setRole]=useState<Role>('senior');
 if(signup)return <section className="signup-page"><button className="icon-button" aria-label="Back to welcome" onClick={()=>go('welcome')}><ArrowLeft/></button><h1>Let’s Sign you up.</h1><p>Welcome to join us!</p><ProfileForm initialRole={role} onRole={setRole}/></section>;
 return <section className="welcome-page"><div className="original-brand"><img src={asset('logo')} alt="Carenect house and heart logo"/><img src={asset('wordmark')} alt="Carenect"/></div><div className="welcome-actions"><button className="pill-button lime" onClick={()=>location.assign('/auth?mode=register')}>SIGN UP</button><a className="pill-button black" href={signedIn?'/senior':'/auth?mode=login&return_to=%2Fsenior'}>LOGIN</a><div className="client-entry"><a href="/senior">Senior</a><a href="/caregiver">Caregiver</a><a href="/family">Family</a></div></div></section>;
}
