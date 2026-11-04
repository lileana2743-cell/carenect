'use client';
import {createContext,useContext} from 'react';
export type Role='senior'|'caregiver'|'family';
export type CareRecord={id:string;kind:string;content:any;created?:string};
export type MediaDraft={file?:File;url:string;type:string};
export type CareContextType={role:Role;screen:string;go:(screen:string)=>void;records:CareRecord[];signedIn:boolean;busy:boolean;save:(kind:string,content:any,id?:string)=>Promise<CareRecord|null>;remove:(record:CareRecord)=>Promise<boolean>;modal:(title:string,body:React.ReactNode,description?:string)=>void;close:()=>void;person:string;setPerson:(id:string)=>void;date:string;setDate:(date:string)=>void;mediaDraft:MediaDraft|null;setMediaDraft:(draft:MediaDraft|null)=>void;};
export const CareContext=createContext<CareContextType>(null!);
export const useCare=()=>useContext(CareContext);
export const asset=(name:string)=>'/original/'+name+'.webp';
export const names:Record<string,string>={liming:'Li Ming',jianguo:'Liu Jianguo',guihong:'Gu Hong',yangbin:'Yang Bin'};
export const portraits:Record<string,string>={liming:'dad',jianguo:'jianguo',guihong:'guhong',yangbin:'yangbin'};
export const roleNames:Record<Role,string>={senior:'Senior',caregiver:'Caregiver',family:'Family'};
export const dayNames=['Sat','Sun','Mon','Tue','Wed','Thu','Fri'];
export function Avatar({name,size=64,className=''}:{name:string;size?:number;className?:string}){return <img className={'portrait '+className} src={asset(portraits[name]||name)} alt={names[name]||name} width={size} height={size}/>;}
