const assert=require('node:assert/strict'),E=require('../dist/engine');
function board(ps){const b=Array(90).fill(null);for(const [x,y,p]of ps)b[y*9+x]=p;return b}
const trap=board([[3,0,'bK'],[4,9,'rK'],[4,4,'rR'],[4,3,'bP'],[4,1,'bR']]);
for(const [b,s,poison]of [[trap,'r',{from:40,to:31}],[trap.slice().reverse().map(p=>p?(p[0]==='r'?'b':'r')+p[1]:null),'b',{from:49,to:58}]]){
 const original=b.slice(),r=E.best(b,s,3,700);
 assert(E.legal(b,r.move.from,r.move.to));assert.notDeepEqual(r.move,poison,'Avoid the pawn defended by a rook');assert.deepEqual(b,original);
}
console.log('✓ 双方均避开吃卒丢车的诱饵；搜索不修改输入棋局');
const mate=board([[4,0,'bK'],[4,9,'rK'],[4,4,'rP'],[0,2,'rR'],[8,3,'rR']]);
assert(!E.moves(mate,'r').some(m=>!E.moves(E.apply(mate,m),'b').length),'Fixture is not mate in one');
const result=E.best(mate,'r',3,1000),after=E.apply(mate,result.move),replies=E.moves(after,'b');
assert(replies.length);for(const reply of replies){const next=E.apply(after,reply);assert(E.moves(next,'r').some(m=>{const end=E.apply(next,m);return E.check(end,'b')&&!E.moves(end,'b').length}),'Every reply permits mate');}
console.log('✓ 找到两步将杀，并逐一验证对手全部应手');
const init=E.initial(),snapshot=init.slice(),short=E.best(init,'r',3,1);
assert(E.legal(init,short.move.from,short.move.to));assert.deepEqual(init,snapshot);assert(short.elapsedMs<1000);
console.log('✓ 超时保留合法候选，不污染棋盘');
assert.equal(E.best(Array(90).fill(null),'r',3,100).move,null);
for(const level of [1,2,3]){const r=E.best(init,'r',level);assert(E.legal(init,r.move.from,r.move.to));assert(r.elapsedMs<5000);console.log(`✓ 档位 ${level}: 完成 ${r.depth} 层，${r.elapsedMs} ms，复用 ${r.ttHits} 次`)}
