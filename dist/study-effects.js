/* Short-lived teaching overlays; board snapshots remain the source of truth. */
(function(root){
 const point=i=>[50+i%9*100,50+Math.floor(i/9)*100];
 function route(from,to,piece){
  const a=point(from),b=point(to),points=[a];
  if(piece?.[1]==='N')points.push(Math.abs(b[0]-a[0])===200?[a[0]+Math.sign(b[0]-a[0])*100,a[1]]:[a[0],a[1]+Math.sign(b[1]-a[1])*100]);
  return [...points,b];
 }
 function describe(E,before,after,move,focus){
  const side=E.side(before[move.from]),enemy=E.other(side),king=after.indexOf(enemy+'K'),check=E.check(after,enemy);
  const arrows=(focus?.arrows||[]).map(([x,y,X,Y,kind])=>({from:y*9+x,to:Y*9+X,kind}));
  if(check)for(let i=0;i<90;i++)if(E.side(after[i])===side&&E.pseudo(after,i,king)&&!arrows.some(a=>a.from===i&&a.to===king))arrows.push({from:i,to:king,kind:'attack'});
  const capture=before[move.to],mate=check&&!E.moves(after,enemy).length;
  return {arrows,marks:focus?.marks||[],capture,check,mate,king,path:route(move.from,move.to,before[move.from]),label:mate?'将杀':check&&capture?'吃'+E.labels[capture]+' · 将军':check?'将军':capture?'吃'+E.labels[capture]:''};
 }
 let timer=null,host=null,animations=[];
 function clear(){clearTimeout(timer);timer=null;for(const a of animations)a.cancel();animations=[];host?.replaceChildren()}
 function show(E,before,after,move,focus,title){
  clear();const board=document.querySelector('#studyBoard');if(!host){host=document.createElement('div');host.id='studyEffects';host.setAttribute('aria-hidden','true');board.append(host)}
  const info=describe(E,before,after,move,focus),reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 900 1000');svg.classList.add('tactic-overlay');host.append(svg);
  function node(tag,attrs,parent=svg){const el=document.createElementNS(svg.namespaceURI,tag);for(const[k,v]of Object.entries(attrs))el.setAttribute(k,String(v));parent.append(el);return el}
  const defs=node('defs',{});for(const kind of ['move','attack','control']){const marker=node('marker',{id:'study-arrow-'+kind,viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:3.5,markerHeight:3.5,orient:'auto'},defs);node('path',{d:'M0 0 L10 5 L0 10 Z',class:'arrow-head '+kind},marker)}
  function arrow(points,kind){node('polyline',{points:points.map(p=>p.join(',')).join(' '),class:'tactic-route '+kind,'marker-end':'url(#study-arrow-'+kind+')'})}
  arrow(info.path,'move');
  for(const a of info.arrows)arrow(route(a.from,a.to,after[a.from]),a.kind);
  for(const[x,y,label]of info.marks){node('circle',{cx:50+x*100,cy:50+y*100,r:45,class:'tactic-focus'});const t=node('text',{x:50+x*100,y:115+y*100,class:'tactic-mark'});t.textContent=label}
  const moved=board.querySelector('[data-square="'+move.to+'"]'),rect=board.getBoundingClientRect(),end=info.path.at(-1);
  if(!reduced&&moved){moved.style.zIndex='5';animations.push(moved.animate(info.path.map(([x,y])=>({transform:`translate(-50%,-50%) translate(${(x-end[0])*rect.width/900}px,${(y-end[1])*rect.height/1000}px)`})),{duration:500,easing:'cubic-bezier(.2,.7,.25,1)'}))}
  if(info.capture){
   const ghost=document.createElement('span');ghost.className='piece '+E.side(info.capture)+' tactic-ghost';ghost.style.left=((move.to%9+.5)*100/9)+'%';ghost.style.top=((Math.floor(move.to/9)+.5)*10)+'%';ghost.textContent=E.labels[info.capture];host.append(ghost);
   node('circle',{cx:end[0],cy:end[1],r:48,class:'tactic-impact'});
  }
  if(info.label){const badge=document.createElement('div');badge.className='tactic-badge';const strong=document.createElement('strong');strong.textContent=info.label;const small=document.createElement('small');small.textContent=info.mate?title:info.capture?'被吃棋子：'+(E.side(info.capture)==='r'?'红':'黑')+E.labels[info.capture]:'注意将帅安全';badge.append(strong,small);host.append(badge)}
  timer=setTimeout(clear,1800);
 }
 const api={route,describe,clear,show};root.StudyEffects=api;if(typeof module!=='undefined')module.exports=api;
})(typeof self!=='undefined'?self:globalThis);
