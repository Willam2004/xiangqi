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

const val={K:100000,R:900,C:440,N:420,B:200,A:200,P:100};
function evaluate(b,s){let v=0;for(let i=0;i<90;i++)if(b[i]){let p=b[i],y=i/9|0,advance=side(p)==='r'?9-y:y;let n=val[kind(p)]+(kind(p)==='P'?advance*12+(advance>=5?65:0):kind(p)==='N'?18*(4-Math.abs(i%9-4)):0);v+=side(p)===s?n:-n}return v}
function best(b,s,level=2,budget){let deadline=Date.now()+(budget||[150,550,1400][level-1]),nodes=0,top=moves(b,s),best=top[0],depthDone=0;function order(b,ms){return ms.sort((a,z)=>(val[kind(b[z.to])]||0)-(val[kind(b[a.to])]||0))}function search(b,s,d,alpha,beta,ply){nodes++;if(nodes%64===0&&Date.now()>deadline)throw Error('time');if(!b.includes(s+'K'))return-1000000+ply;let ms=order(b,moves(b,s));if(!ms.length)return-1000000+ply;if(d<=0){let inCheck=check(b,s),stand=evaluate(b,s);if(d<=-3)return stand;if(!inCheck){if(stand>=beta)return stand;alpha=Math.max(alpha,stand);ms=ms.filter(m=>b[m.to]);if(!ms.length)return stand}}let v=d<=0&&!check(b,s)?evaluate(b,s):-Infinity;for(let m of ms){let z=-search(apply(b,m),other(s),d-1,-beta,-alpha,ply+1);v=Math.max(v,z);alpha=Math.max(alpha,z);if(alpha>=beta)break}return v}order(b,top);for(let d=1;d<=[1,3,4][level-1];d++){try{let score=-Infinity,choice=top[0];for(let m of top){let v=-search(apply(b,m),other(s),d-1,-Infinity,-score,1);if(v>score){score=v;choice=m}}best=choice;depthDone=d;top=[best,...top.filter(m=>m!==best)];if(score>900000)break}catch{break}}return{move:best,depth:depthDone,nodes}}
const labels={rK:'帅',rA:'仕',rB:'相',rN:'马',rR:'车',rC:'炮',rP:'兵',bK:'将',bA:'士',bB:'象',bN:'马',bR:'车',bC:'炮',bP:'卒'};
function notation(b,m){let p=b[m.from],s=side(p),x=m.from%9,y=m.from/9|0,X=m.to%9,Y=m.to/9|0,num=n=>s==='r'?'一二三四五六七八九'[n-1]:String(n),file=x=>s==='r'?9-x:x+1;return labels[p]+num(file(x))+(Y===y?'平':(s==='r'?Y<y:Y>y)?'进':'退')+num(Y===y||'NAB'.includes(kind(p))?file(X):Math.abs(Y-y))}
root.XQ={initial,side,kind,other,idx,pseudo,check,legal,moves,apply,evaluate,best,labels,notation};if(typeof module!=='undefined')module.exports=root.XQ;
})(typeof self!=='undefined'?self:globalThis);
