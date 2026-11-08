const assert=require('node:assert/strict'),E=require('../dist/engine'),Study=require('../dist/study-line'),courses=require('../dist/openings-data');
assert.equal(courses.length,6);assert.equal(new Set(courses.map(c=>c.id)).size,6);
const pieces=E.initial().flatMap((p,i)=>p?[[i%9,Math.floor(i/9),p]]:[]);
for(const c of courses){
 const source=JSON.stringify(c),line=Study.build(E,{...c,pieces});assert.equal(line.steps.length,10);assert.deepEqual(line.frames[0],E.initial());
 for(let i=0;i<10;i++){const s=line.steps[i],b=line.frames[i],next=line.frames[i+1];assert.equal(E.side(b[s.move.from]),i%2?'b':'r');assert(E.legal(b,s.move.from,s.move.to),c.name+'第'+(i+1)+'手');assert(!E.check(next,s.side));assert(E.moves(next,E.other(s.side)).length);assert(s.note.length>0);assert.equal(next.filter(Boolean).length,32)}
 assert.equal(JSON.stringify(c),source);console.log('✓ '+c.name+'：5 回合 / 10 手合法、讲解齐全');
}
const line=id=>Study.build(E,{...courses.find(c=>c.id===id),pieces});
assert.equal(line('screen-horses').frames[4][20],'bN');assert.equal(line('screen-horses').frames[4][24],'bN');
assert.equal(line('same-cannon').steps[1].notation,'炮8平5');assert.equal(line('palcorner-horses').frames[6][23],'bC');
assert.equal(line('flying-elephant').steps[0].notation,'相三进五');assert.equal(line('pawn-opening').steps[1].notation,'炮2平3');assert.equal(line('horse-opening').steps[0].notation,'马二进三');
console.log('6 门开局课程通过，关键阵形与中文记谱正确');
