const assert=require('node:assert/strict'),E=require('../dist/engine'),lessons=require('../dist/kills-data');
assert.equal(lessons.length,37);assert.equal(new Set(lessons.map(l=>l.id)).size,lessons.length);
for(const l of lessons){
 const b=Array(90).fill(null),counts={};for(const [x,y,p]of l.pieces){assert(x>=0&&x<=8&&y>=0&&y<=9);assert.equal(b[y*9+x],null);assert(E.labels[p]);b[y*9+x]=p;counts[p]=(counts[p]||0)+1;
  if(p[1]==='K'||p[1]==='A')assert(x>=3&&x<=5&&(p[0]==='r'?y>=7:y<=2));
  if(p[1]==='A')assert([[3,0],[5,0],[4,1],[3,2],[5,2]].some(([X,Y])=>x===X&&(p[0]==='r'?9-y:y)===Y));
  if(p[1]==='B')assert([[2,0],[6,0],[0,2],[4,2],[8,2],[2,4],[6,4]].some(([X,Y])=>x===X&&(p[0]==='r'?9-y:y)===Y));
 }
 for(const [p,n]of Object.entries(counts))assert(n<=({K:1,A:2,B:2,N:2,R:2,C:2,P:5}[p[1]]));
 assert.equal(counts.rK,1);assert.equal(counts.bK,1);assert(!E.check(b,'r'));assert(!E.check(b,'b'));assert(E.moves(b,'b').length);
 const source=JSON.stringify(l),line=require('../dist/study-line').build(E,l);
 assert.deepEqual(line.frames[0],b);assert.equal(line.frames.length,line.steps.length+1);
 for(let i=0;i<line.steps.length;i++){
  const step=line.steps[i],before=line.frames[i],after=line.frames[i+1];
  assert.equal(step.side,i%2?'b':'r');assert(E.legal(before,step.move.from,step.move.to));
  if(!l.goal&&i%2===1)assert.deepEqual(E.moves(before,'b'),[step.move],l.name+'所有防守分支均已覆盖');
  else if(!l.goal&&i%2===0)assert(E.check(after,'b'),l.name+'每次红着均将军');
  if(i<line.steps.length-1)assert(E.moves(after,E.other(step.side)).length,l.name+'不得提前结束');
 }
 const final=line.frames.at(-1);
 if(l.goal==='capture-rook'){
  assert.equal(line.steps.at(-1).captured,'bR');assert(!final.includes('bR'));assert(E.moves(final,'b').length,'得子不等于将死');
  for(const response of E.moves(line.frames[1],'b')){
   const reply=E.apply(line.frames[1],response),rook=reply.indexOf('bR');
   const safeCaptures=E.moves(reply,'r').filter(m=>m.to===rook).filter(m=>!E.moves(E.apply(reply,m),'b').some(r=>r.to===m.to));
   assert(safeCaptures.length,l.name+'应对 '+E.notation(line.frames[1],response)+' 后仍能安全吃车');
  }
 }else {assert(E.check(final,'b'));assert.equal(E.moves(final,'b').length,0,l.name+'最终将杀')}
 assert.equal(JSON.stringify(l),source);assert.deepEqual(line.frames[0],b,'回到初始局面保留原棋子');
 console.log('✓ '+l.name+'：'+line.steps.length+' 手，'+(l.goal?'安全得车':'合法将杀'));
}
console.log(`${lessons.length} lessons passed`);
assert.equal(lessons.find(l=>l.id==='high').name,'高钓马');
assert(lessons.find(l=>l.id==='high').alias.includes('侧面虎'));
assert(lessons.find(l=>l.id==='return-palace').stage);
assert(lessons.find(l=>l.id==='sandwich').stage);

const ranked=lessons.find(l=>l.id==='ranked-horse-rook');
assert.equal(ranked.name,'列马车');
assert(ranked.alias.includes('立马车')&&ranked.alias.includes('勒马车'));
// Removing the supporting horse must allow the general to capture the rook.
const rankedBoard=Array(90).fill(null);for(const [x,y,p]of ranked.pieces)rankedBoard[y*9+x]=p;
const rankedEnd=E.apply(rankedBoard,{from:40,to:4});
assert(!E.legal(rankedEnd,5,4));rankedEnd[21]=null;assert(E.legal(rankedEnd,5,4));
assert.equal(lessons.find(l=>l.id==='cannon-sweeps').stage,'收官一着');

assert.equal(lessons.filter(l=>l.sequence?.length>1&&!l.goal).length,5);
assert(lessons.some(l=>l.sequence?.length===5));

const FX=require('../dist/study-effects');
assert.deepEqual(FX.route(18,11,'rN'),[[50,250],[150,250],[250,150]],'马先走马腿再到落点');
for(const id of ['smothered','iron','groove','fork-rook','trapped-rook']){
 const l=lessons.find(l=>l.id===id),line=require('../dist/study-line').build(E,l);
 for(let i=0;i<line.steps.length;i++){
  const step=line.steps[i],info=FX.describe(E,line.frames[i],line.frames[i+1],step.move,step.focus);
  assert(info.arrows.length||info.capture,id+'有战术标注或吃子反馈');
  assert.equal(info.capture,step.captured);
  if(info.check)assert(info.arrows.some(a=>a.to===info.king&&a.kind==='attack'));
 }
}
assert.equal(lessons.filter(l=>l.goal==='capture-rook').length,2);
console.log('✓ 关键战术动画数据、全部防守分支的安全得车已验证');
