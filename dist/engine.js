(function(root){
const RED='r',BLACK='b',other=s=>s==='r'?'b':'r',side=p=>p?.[0],kind=p=>p?.[1],idx=(x,y)=>y*9+x;
function initial(){let b=Array(90).fill(null);for(let x=0;x<9;x++){b[x]='b'+'RNBAKABNR'[x];b[81+x]='r'+'RNBAKABNR'[x]}for(let x of [1,7]){b[idx(x,2)]='bC';b[idx(x,7)]='rC'}for(let x of [0,2,4,6,8]){b[idx(x,3)]='bP';b[idx(x,6)]='rP'}return b}
function pseudo(b,f,t){if(f===t||!b[f]||side(b[f])===side(b[t]))return false;let x=f%9,y=f/9|0,X=t%9,Y=t/9|0,dx=X-x,dy=Y-y,ax=Math.abs(dx),ay=Math.abs(dy),s=side(b[f]);let palace=X>=3&&X<=5&&(s==='r'?Y>=7:Y<=2);let count=0;if(dx===0||dy===0){let step=dx===0?Math.sign(dy)*9:Math.sign(dx);for(let i=f+step;i!==t;i+=step)if(b[i])count++}
switch(kind(b[f])){case'R':return (dx===0||dy===0)&&count===0;case'C':return(dx===0||dy===0)&&count===(b[t]?1:0);case'N':return ax===2&&ay===1?!b[idx(x+Math.sign(dx),y)]:ax===1&&ay===2?!b[idx(x,y+Math.sign(dy))]:false;case'B':return ax===2&&ay===2&&(s==='r'?Y>=5:Y<=4)&&!b[idx(x+dx/2,y+dy/2)];case'A':return ax===1&&ay===1&&palace;case'K':if(kind(b[t])==='K'&&dx===0&&count===0)return true;return ax+ay===1&&palace;case'P':return dx===0&&dy===(s==='r'?-1:1)||(s==='r'?y<=4:y>=5)&&ay===0&&ax===1;}return false}
function apply(b,m){let c=b.slice();c[m.to]=c[m.from];c[m.from]=null;return c}
function check(b,s){let k=b.indexOf(s+'K');if(k<0)return true;for(let f=0;f<90;f++)if(side(b[f])===other(s)&&pseudo(b,f,k))return true;return false}
function legal(b,f,t){return pseudo(b,f,t)&&!check(apply(b,{from:f,to:t}),side(b[f]))}
// Geometry is invariant across positions: only test squares this piece can reach.
const candidateSquares={};
for(const s of ['r','b'])for(const k of 'RNBAKCP'){
 candidateSquares[s+k]=Array.from({length:90},(_,f)=>{
  const x=f%9,y=f/9|0,a=[];
  for(let t=0;t<90;t++){
   const X=t%9,Y=t/9|0,dx=X-x,dy=Y-y,ax=Math.abs(dx),ay=Math.abs(dy);
   if(t===f)continue;
   const palace=X>=3&&X<=5&&(s==='r'?Y>=7:Y<=2);
   let ok=false;
   switch(k){
    case 'R':case 'C':ok=dx===0||dy===0;break;
    case 'N':ok=ax*ay===2;break;
    case 'B':ok=ax===2&&ay===2&&(s==='r'?Y>=5:Y<=4);break;
    case 'A':ok=ax===1&&ay===1&&palace;break;
    case 'K':ok=dx===0||ax+ay===1&&palace;break;
    case 'P':ok=dx===0&&dy===(s==='r'?-1:1)||(s==='r'?y<=4:y>=5)&&ay===0&&ax===1;break;
   }
   if(ok)a.push(t);
  }
  return a;
 });
}
function moves(b,s){const a=[];for(let f=0;f<90;f++)if(side(b[f])===s)for(const t of candidateSquares[b[f]][f])if(legal(b,f,t))a.push({from:f,to:t});return a}

const val={K:100000,R:900,C:450,N:430,B:200,A:200,P:100};
function evaluate(b,s){
 let score=0,heavy=0;for(const p of b)if(p&&'RCN'.includes(kind(p)))heavy++;
 for(let i=0;i<90;i++){
  const p=b[i];if(!p)continue;
  const team=side(p),k=kind(p),x=i%9,y=i/9|0,advance=team==='r'?9-y:y,center=4-Math.abs(x-4);
  let value=val[k];
  if(k==='P')value+=advance<5?advance*7:65+center*10+Math.min(advance,8)*9-(advance===9?25:0);
  if(k==='N'){
   value+=center*10+Math.min(advance,6)*5+(heavy<=6?25:0);
   for(const t of candidateSquares[p][i])if(pseudo(b,i,t))value+=7;
  }
  if(k==='R'||k==='C'){
   value+=center*3+(k==='C'&&heavy<=6?-30:0);
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    for(let X=x+dx,Y=y+dy;X>=0&&X<9&&Y>=0&&Y<10;X+=dx,Y+=dy){if(b[idx(X,Y)])break;value+=k==='R'?3:2}
   }
  }
  if(k==='A'||k==='B')value+=heavy>=8?12:-15;
  if(k==='K')value+=heavy>6?(advance===0?15:-advance*12):0;
  score+=team===s?value:-value;
 }
 return score;
}
function best(position,team,level=2,budget){
 level=Math.max(1,Math.min(3,level|0));
 const started=Date.now(),deadline=started+(budget??[400,1800,3500][level-1]);
 const TIMEOUT=Symbol('timeout'),MATE=1000000,table=new Map(),killers=[],history=new Int32Array(2*8100),path=new Set();
 let nodes=0,ttHits=0,depthDone=0,scoreDone=null;
 const b=position.slice(),key=s=>s+b.map(p=>p||'').join(','),same=(a,z)=>a&&z&&a.from===z.from&&a.to===z.to;
 function tick(){nodes++;if((nodes&63)===0&&Date.now()>=deadline)throw TIMEOUT}
 // Reuse the search board while generating and exploring moves; always undo it.
 function generate(s,capturesOnly=false,firstOnly=false){
  const list=[];
  for(let from=0;from<90;from++)if(side(b[from])===s){
   const piece=b[from];
   for(const to of candidateSquares[piece][from]){
    if(capturesOnly&&!b[to]||!pseudo(b,from,to))continue;
    const captured=b[to];b[to]=piece;b[from]=null;
    const valid=!check(b,s);b[from]=piece;b[to]=captured;
    if(valid){list.push({from,to});if(firstOnly)return list}
   }
  }
  return list;
 }
 function visit(m,fn){const p=b[m.from],c=b[m.to];b[m.to]=p;b[m.from]=null;try{return fn()}finally{b[m.from]=p;b[m.to]=c}}
 function order(ms,s,ply,preferred){
  const offset=s==='r'?0:8100;
  const rank=m=>same(m,preferred)?10000000:b[m.to]?1000000+16*val[kind(b[m.to])]-val[kind(b[m.from])]:same(m,killers[ply]?.[0])?900000:same(m,killers[ply]?.[1])?800000:history[offset+m.from*90+m.to];
  return ms.map(m=>({m,rank:rank(m)})).sort((a,z)=>z.rank-a.rank).map(x=>x.m);
 }
 function quiesce(s,alpha,beta,ply,qdepth){
  tick();if(!b.includes(s+'K'))return -MATE+ply;
  const checked=check(b,s),ms=generate(s,!checked);
  if(!ms.length&&(checked||!generate(s,false,true).length))return -MATE+ply;
  // Never stand pat while in check: search every legal evasion.
  if(ply>=64)return evaluate(b,s);
  if(!checked){const stand=evaluate(b,s);if(stand>=beta)return stand;alpha=Math.max(alpha,stand);if(qdepth>=8)return alpha}
  for(const m of order(ms,s,ply)){
   const value=visit(m,()=>-quiesce(other(s),-beta,-alpha,ply+1,qdepth+1));
   if(value>=beta)return value;alpha=Math.max(alpha,value);
  }
  return alpha;
 }
 function search(s,depth,alpha,beta,ply){
  if(depth<=0)return quiesce(s,alpha,beta,ply,0);
  tick();if(!b.includes(s+'K'))return -MATE+ply;
  const hash=key(s);if(path.has(hash))return 0;
  const originalAlpha=alpha,entry=table.get(hash);
  const unpack=v=>v>900000?v-ply:v< -900000?v+ply:v;
  if(entry&&entry.depth>=depth){
   const value=unpack(entry.score);ttHits++;
   if(entry.bound==='exact'||entry.bound==='lower'&&value>=beta||entry.bound==='upper'&&value<=alpha)return value;
  }
  const ms=order(generate(s),s,ply,entry?.move);if(!ms.length)return -MATE+ply;
  const checked=check(b,s);
  let value=-Infinity,choice=ms[0];path.add(hash);
  try{
   for(let n=0;n<ms.length;n++){
    const m=ms[n],quiet=!b[m.to];
    let v=visit(m,()=>{
     if(n===0)return -search(other(s),depth-1,-beta,-alpha,ply+1);
     // Reduce late quiet moves, then verify at full depth if they improve alpha.
     const reduction=depth>=3&&n>=4&&quiet&&!checked&&!check(b,other(s))?1:0;
     let z=-search(other(s),depth-1-reduction,-alpha-1,-alpha,ply+1);
     if(reduction&&z>alpha)z=-search(other(s),depth-1,-alpha-1,-alpha,ply+1);
     return z>alpha&&z<beta?-search(other(s),depth-1,-beta,-alpha,ply+1):z;
    });
    if(v>value){value=v;choice=m}alpha=Math.max(alpha,v);
    if(alpha>=beta){
     if(!b[m.to]){killers[ply]=[m,killers[ply]?.[0]];history[(s==='r'?0:8100)+m.from*90+m.to]+=depth*depth}
     break;
    }
   }
  }finally{path.delete(hash)}
  if(table.size>100000)table.clear();
  table.set(hash,{depth,move:choice,score:value>900000?value+ply:value< -900000?value-ply:value,bound:value<=originalAlpha?'upper':value>=beta?'lower':'exact'});
  return value;
 }
 let top=order(generate(team),team,0),choice=top[0];
 if(!top.length)return {move:null,depth:0,nodes,score:-MATE,elapsedMs:Date.now()-started,ttHits};
 for(let depth=1;depth<=[3,7,10][level-1];depth++){
  try{
   if(Date.now()>=deadline)break;
   const score=search(team,depth,-Infinity,Infinity,0);
   choice=table.get(key(team)).move;scoreDone=score;depthDone=depth;
   if(Math.abs(score)>900000)break;
  }catch(error){if(error!==TIMEOUT)throw error;break}
 }
 return {move:choice,depth:depthDone,nodes,score:scoreDone,elapsedMs:Date.now()-started,ttHits};
}
const labels={rK:'帅',rA:'仕',rB:'相',rN:'马',rR:'车',rC:'炮',rP:'兵',bK:'将',bA:'士',bB:'象',bN:'马',bR:'车',bC:'炮',bP:'卒'};
function notation(b,m){let p=b[m.from],s=side(p),x=m.from%9,y=m.from/9|0,X=m.to%9,Y=m.to/9|0,num=n=>s==='r'?'一二三四五六七八九'[n-1]:String(n),file=x=>s==='r'?9-x:x+1;return labels[p]+num(file(x))+(Y===y?'平':(s==='r'?Y<y:Y>y)?'进':'退')+num(Y===y||'NAB'.includes(kind(p))?file(X):Math.abs(Y-y))}
root.XQ={initial,side,kind,other,idx,pseudo,check,legal,moves,apply,evaluate,best,labels,notation};if(typeof module!=='undefined')module.exports=root.XQ;
})(typeof self!=='undefined'?self:globalThis);
