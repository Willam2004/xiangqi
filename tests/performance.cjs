const fs=require('node:fs'),assert=require('node:assert/strict'),E=require('../dist/engine');
const positions=[];let b=E.initial(),s='r',seed=731;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
for(let n=0;n<160;n++){let ms=E.moves(b,s);if(!ms.length){b=E.initial();s='r';ms=E.moves(b,s)}positions.push({b,s});b=E.apply(b,ms[Math.floor(random()*ms.length)]);s=E.other(s)}
function exhaustive(b,s){const a=[];for(let f=0;f<90;f++)if(E.side(b[f])===s)for(let t=0;t<90;t++)if(E.legal(b,f,t))a.push({from:f,to:t});return a}
for(const {b,s}of positions)assert.deepEqual(E.moves(b,s),exhaustive(b,s));console.log('✓ 160 legal positions: candidate moves equal exhaustive enumeration');
function bench(fn){const samples=[];for(let r=0;r<7;r++){const start=performance.now();for(const{b,s}of positions)fn(b,s);samples.push(performance.now()-start)}return samples.sort((a,b)=>a-b)[3]}
const before=bench(exhaustive),after=bench(E.moves);let report={positions:positions.length,beforeMs:+before.toFixed(2),afterMs:+after.toFixed(2),speedup:+(before/after).toFixed(2),method:'median of 7 runs, same 160 positions, exhaustive vs geometry candidate enumeration'};console.log(JSON.stringify(report,null,2));fs.writeFileSync('analysis/benchmark.json',JSON.stringify(report,null,2));
