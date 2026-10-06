// Snapshot of local capabilities.py base limits. Not a live pool capability receipt.
const H3Limits={image:9,video:3,audio:3,total:12,minClip:2,maxClip:15,totalSeconds:15};
function referenceCounts(assets){return Object.fromEntries(['image','video','audio'].map(type=>[type,assets.filter(a=>a.type===type).length]))}
function inputProblems(assets,mode,{requireReference=false,countsOnly=false}={}){
 const errors=[],counts=referenceCounts(assets);
 if(mode==='首尾帧'){
  if(assets.some(a=>a.type!=='image'||!['首帧','尾帧'].includes(a.role)))errors.push('首尾帧模式不能同时加入普通图片、视频或音频参考。');
  for(const role of ['首帧','尾帧'])if(assets.filter(a=>a.role===role).length>1)errors.push(role+'最多1张。');
 }else{
  if(assets.some(a=>['首帧','尾帧'].includes(a.role)))errors.push('全能参考模式不能同时指定首帧或尾帧。');
  for(const [type,label] of [['image','图片'],['video','视频'],['audio','音频']])if(counts[type]>H3Limits[type])errors.push(`${label}最多${H3Limits[type]}份。`);
  if(assets.length>H3Limits.total)errors.push('图片、视频和音频参考合计最多12份。');
  if(requireReference&&!assets.length)errors.push('全能参考至少需要1份素材；纯文字请选首尾帧模式。');
 }
 if(!countsOnly)for(const type of ['video','audio']){
  let total=0;for(const a of assets.filter(a=>a.type===type)){
   const duration=a.clipEnd-a.clipStart;
   if(!Number.isFinite(a.duration)||!Number.isFinite(duration)||a.clipStart<0||a.clipEnd>a.duration||duration<2-1e-6||duration>15+1e-6)errors.push(`${a.name}：请选择2–15秒的有效片段。`);
   else total+=duration;
  }
  if(total>15+1e-6)errors.push(`${type==='video'?'视频':'音频'}累计${total.toFixed(2)}秒，超过15秒，请缩短或移除片段。`);
 }
 return errors;
}
