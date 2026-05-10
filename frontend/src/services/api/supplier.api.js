import { apiClient } from "./client";
const CACHE_KEY="ll_supplier_cache"; const TTL=5*60*1000;
function rc(){try{const r=localStorage.getItem(CACHE_KEY);if(!r)return null;const{data,ts}=JSON.parse(r);return Date.now()-ts>TTL?null:data;}catch{return null;}}
function wc(d){try{localStorage.setItem(CACHE_KEY,JSON.stringify({data:d,ts:Date.now()}));}catch{}}
function cc(){try{localStorage.removeItem(CACHE_KEY);}catch{}}
export const supplierApi = {
  list: async()=>{try{const d=await apiClient.get("/suppliers");wc(d);return d;}catch(e){const c=rc();if(c){console.warn("Offline: cached suppliers");return c;}throw e;}},
  getById: (id)=>apiClient.get(`/suppliers/${id}`),
  create: async(p)=>{const r=await apiClient.post("/suppliers",p);cc();return r;},
  update: async(id,p)=>{const r=await apiClient.put(`/suppliers/${id}`,p);cc();return r;},
  remove: async(id)=>{const r=await apiClient.delete(`/suppliers/${id}`);cc();return r;},
};
