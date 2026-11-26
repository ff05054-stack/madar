import {db, F} from "./firebase.js";
export const ctx = {uid:null, tenant:null};
const need = () => { if(!ctx.tenant) throw new Error("اختر منشأة أولاً"); };
const col = t => F.collection(db,"tenants",ctx.tenant,t);
const ref = (t,id) => F.doc(db,"tenants",ctx.tenant,t,id);

export async function list(type){
  need();
  const s = await F.getDocs(col(type));
  return s.docs.map(d => ({id:d.id, ...d.data()}));
}
export async function add(type,data){
  need();
  return F.addDoc(col(type),{...data, createdAt:F.serverTimestamp(), createdBy:ctx.uid});
}
export async function update(type,id,data){
  need();
  return F.updateDoc(ref(type,id),{...data, updatedAt:F.serverTimestamp()});
}
export async function remove(type,id){
  need();
  return F.deleteDoc(ref(type,id));
}
