const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],E=XQ;
const puzzles=[
{name:'车马饮泉',tag:'一着制胜',desc:'车借马力，一击定乾坤。',pieces:[[4,0,'bK'],[4,9,'rK'],[4,2,'rP'],[3,1,'rN'],[5,3,'rR']]},
{name:'双车错落',tag:'一着制胜',desc:'双车呼应，封锁九宫。',pieces:[[4,0,'bK'],[4,9,'rK'],[4,2,'rP'],[0,1,'rR'],[5,3,'rR']]},
{name:'炮镇中宫',tag:'一着制胜',desc:'借子为架，发现炮的力量。',pieces:[[4,0,'bK'],[3,9,'rK'],[3,2,'rR'],[5,2,'rR'],[4,2,'bP'],[0,4,'rC']]},
{name:'马去车来',tag:'一着制胜',desc:'移马开线，体会闪将的妙处。',pieces:[[4,0,'bK'],[5,0,'rN'],[7,0,'rR'],[3,4,'rR'],[4,5,'rP'],[4,9,'rK']]}
];
function puzzleBoard(n){let b=Array(90).fill(null);for(let[x,y,p]of puzzles[n].pieces)b[E.idx(x,y)]=p;return b}
let state={board:E.initial(),turn:'r',mode:'ai',level:3,human:'r',flipped:false,history:[],result:null,puzzle:0,sound:false,completed:[]};
try{let saved=JSON.parse(localStorage.getItem('yijing-v1'));if(saved&&saved.board?.length===90&&saved.board.every(p=>p===null||Object.hasOwn(E.labels,p))&&['ai','local','puzzle'].includes(saved.mode)&&['r','b'].includes(saved.turn)&&Array.isArray(saved.history)){state={...state,...saved};state.completed=Array.isArray(state.completed)?state.completed:[]}}catch{}
let selected=null,targets=[],hintMove=null,busy=false,worker=null,job=0,toastTimer,audioCtx;
let animating=false,feedbackTimers=[],feedbackEpoch=0,trailUntil=0;
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2600)}
function save(){try{localStorage.setItem('yijing-v1',JSON.stringify(state));$('#saveStatus').textContent='本机自动保存'}catch{$('#saveStatus').textContent='浏览器未允许保存'}}
function pos(i){if(state.flipped)i=89-i;return{left:((i%9*100+50)/9)+'%',top:(((i/9|0)*100+50)/10)+'%'}}
function at(el,i){Object.assign(el.style,pos(i))}
function pieceName(p){return (E.side(p)==='r'?'红':'黑')+E.labels[p]}
function clearMoveEffects(){
 feedbackEpoch++;for(const timer of feedbackTimers)clearTimeout(timer);feedbackTimers=[];animating=false;trailUntil=0;
 $('#moveTrail').replaceChildren();
 $('#moveEffects').replaceChildren();$('#boardAlert').hidden=true;$('#boardAlert').replaceChildren();
}
function afterFeedback(fn,delay){const epoch=feedbackEpoch;feedbackTimers.push(setTimeout(()=>{if(epoch===feedbackEpoch)fn()},delay))}
function drawMoveTrail(){
 const h=state.history.at(-1),svg=$('#moveTrail'),feedback=$('#moveFeedback');svg.replaceChildren();
 const checked=E.check(state.board,state.turn)&&!state.result;
 feedback.className='move-feedback'+(checked?' in-check':'');
 if(!h){feedback.textContent='点击棋子，绿色圆点为可落位置';return}
 const capture=h.board[h.move.to],mover=h.board[h.move.from];
 svg.classList.toggle('is-fading',performance.now()>=trailUntil-400);
 if(performance.now()<trailUntil){
 const point=i=>{if(state.flipped)i=89-i;return {x:i%9*100+50,y:(i/9|0)*100+50}};
 const a=point(h.move.from),b=point(h.move.to),distance=Math.hypot(b.x-a.x,b.y-a.y);
 const end={x:b.x-(b.x-a.x)*48/distance,y:b.y-(b.y-a.y)*48/distance};
 svg.classList.toggle('capture-trail',!!capture);
 svg.innerHTML=`<defs><marker id="moveArrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="currentColor"/></marker></defs><path class="trail-halo" d="M${a.x} ${a.y}L${end.x} ${end.y}"/><path class="trail-line" d="M${a.x} ${a.y}L${end.x} ${end.y}" marker-end="url(#moveArrow)"/><circle cx="${a.x}" cy="${a.y}" r="15" class="trail-origin"/>`;
 }
 feedback.textContent=(capture?pieceName(mover)+' 吃掉 '+pieceName(capture):pieceName(mover)+' · '+h.notation)+(checked?'　·　将军！'+(state.turn==='r'?'红方':'黑方')+'须应将':capture?' · '+h.notation:'');
 feedback.classList.toggle('is-capture',!!capture);
}
function playMoveFeedback(m,mover,captured,checked){
 afterFeedback(()=>$('#moveTrail').classList.add('is-fading'),1000);
 afterFeedback(()=>{trailUntil=0;$('#moveTrail').replaceChildren()},1400);
 if(captured){
  const ghost=document.createElement('div');ghost.className='piece captured-ghost '+E.side(captured);ghost.textContent=E.labels[captured];at(ghost,m.to);$('#moveEffects').append(ghost);
  const ring=document.createElement('div');ring.className='capture-ring';at(ring,m.to);$('#moveEffects').append(ring);
  const label=document.createElement('div');label.className='capture-label';label.textContent='吃 '+E.labels[captured];at(label,m.to);$('#moveEffects').append(label);
 }
 const alert=$('#boardAlert');
 if(checked||captured){
  alert.className='board-alert '+(checked?'check-alert':'capture-alert');
  const title=document.createElement('strong');title.textContent=checked?(state.result?.winner?'将 杀':'将 军'):'吃 子';
  const detail=document.createElement('span');detail.textContent=checked?(state.result?'胜负已定':(state.turn==='r'?'红方帅':'黑方将')+'受到威胁，请应将'):(pieceName(mover)+' 吃掉 '+pieceName(captured));
  alert.replaceChildren(title,detail);alert.hidden=false;
  afterFeedback(()=>{alert.hidden=true},checked?2000:1600);
 }
 afterFeedback(()=>{sound(!!captured);if(checked&&state.sound)afterFeedback(()=>sound(true),180)},captured?420:100);
 afterFeedback(()=>$('#moveEffects').replaceChildren(),1450);
 afterFeedback(()=>{animating=false;render();if(state.result)showResult();else computer()},checked?1500:captured?1000:460);
}
function drawGrid(){let lines='';for(let y=0;y<10;y++)lines+=`<path d="M50 ${50+y*100}H850"/>`;for(let x=0;x<9;x++){let X=50+x*100;lines+=x===0||x===8?`<path d="M${X} 50V950"/>`:`<path d="M${X} 50V450M${X} 550V950"/>`}
lines+='<path d="M350 50L550 250M550 50L350 250M350 750L550 950M550 750L350 950"/>';
for(let[x,y]of[[1,2],[7,2],[1,7],[7,7],...[0,2,4,6,8].flatMap(x=>[[x,3],[x,6]])]){let X=x*100+50,Y=y*100+50;for(let sx of [-1,1])for(let sy of[-1,1])if(x+sx>=0&&x+sx<=8)lines+=`<path d="M${X+sx*10} ${Y+sy*26}V${Y+sy*10}H${X+sx*26}"/>`}
$('#grid').innerHTML=`<g fill="none" stroke="#947b55" stroke-width="1.8" opacity=".85">${lines}<rect x="40" y="40" width="820" height="920" stroke-width="2.5"/></g><g fill="#8a7655" font-family="Songti SC,STSong,serif" font-size="39" letter-spacing="19"><text x="180" y="514">楚河</text><text x="585" y="514">汉界</text></g>`}
let squareNodes=[],pieceNodes=new Map(),boardCache=[];
function renderBoard(){
 const host=$('#pieces');$('#targets').replaceChildren();
 if(!squareNodes.length){
  for(let i=0;i<90;i++){
   const sq=document.createElement('button');sq.className='square';sq.dataset.index=i;
   sq.onclick=()=>clickSquare(i);
   sq.onkeydown=e=>{const d={ArrowLeft:-1,ArrowRight:1,ArrowUp:-9,ArrowDown:9}[e.key];if(d){e.preventDefault();const next=i+(state.flipped?-d:d);if(next>=0&&next<90)squareNodes[next].focus()}};
   host.append(sq);squareNodes.push(sq);
  }
 }
 const changed=state.board.map((p,i)=>p!==boardCache[i]?i:-1).filter(i=>i>=0);
 const from=changed.find(i=>boardCache[i]&&!state.board[i]);
 const to=changed.find(i=>i!==from&&state.board[i]===boardCache[from]);
 const moving=changed.length===2&&from!==undefined&&to!==undefined?pieceNodes.get(from):null;
 const nextNodes=new Map();
 const checkedKing=E.check(state.board,state.turn)?state.board.indexOf(state.turn+'K'):-1;
 for(let i=0;i<90;i++){
  const sq=squareNodes[i];at(sq,i);
  sq.setAttribute('aria-label',`${i%9+1}路${(i/9|0)+1}行${state.board[i]?'，'+(E.side(state.board[i])==='r'?'红':'黑')+E.labels[state.board[i]]:''}`);
  if(!state.board[i])continue;
  let p=i===to&&moving?moving:boardCache[i]===state.board[i]?pieceNodes.get(i):null;
  if(!p){p=document.createElement('button');p.tabIndex=-1;host.append(p)}
  p.className='piece '+E.side(state.board[i])+(selected===i?' selected':'')+(state.history.at(-1)?.move.to===i?' last':'')+(hintMove?.from===i?' hinted':'')+(checkedKing===i?' checked-king':'');
  p.textContent=E.labels[state.board[i]];p.setAttribute('aria-label',(E.side(state.board[i])==='r'?'红方':'黑方')+p.textContent);
  p.onclick=()=>clickSquare(i);at(p,i);nextNodes.set(i,p);
 }
 const retained=new Set(nextNodes.values());for(const p of pieceNodes.values())if(!retained.has(p))p.remove();
 pieceNodes=nextNodes;boardCache=state.board.slice();
 for(const t of targets){const dot=document.createElement('div');dot.className='target'+(state.board[t]?' capture':'');at(dot,t);$('#targets').append(dot)}
 if(state.history.length){const d=document.createElement('div');d.className='last-dot';at(d,state.history.at(-1).move.from);$('#targets').append(d)}
 if(hintMove){const d=document.createElement('div');d.className='target';at(d,hintMove.to);$('#targets').append(d)}
 drawMoveTrail();
}

function render(){renderBoard();$$('nav button').forEach(b=>b.classList.toggle('active',b.dataset.mode===state.mode));$$('[data-level]').forEach(b=>b.classList.toggle('active',+b.dataset.level===state.level));$$('[data-side]').forEach(b=>b.classList.toggle('active',b.dataset.side===state.human));$('#difficultyHint').textContent=['入门 · 更稳健的基础攻防','进阶 · 深入计算，约 2 秒应手','高手 · 加强战术搜索，约 3–4 秒应手'][state.level-1];$('#aiOptions').hidden=state.mode!=='ai';$('#puzzleOptions').hidden=state.mode!=='puzzle';$('#modeTitle').textContent={ai:'与弈境，切磋一局',local:'对坐成局，以棋会友',puzzle:'方寸残局，别有洞天'}[state.mode];$('#modeDesc').textContent={ai:'棋逢对手，落子间亦是修行。',local:'同屏双人轮流执子，红方先行。',puzzle:'红方先行，寻找一着将杀的妙手。'}[state.mode];$('#newGame span').textContent=state.mode==='puzzle'?'重试此局':'开启新局';$('#puzzleOptions').innerHTML=puzzles.map((p,i)=>`<button class="puzzle-card ${state.puzzle===i?'active':''}" data-puzzle="${i}"><strong>${String(i+1).padStart(2,'0')} · ${p.name}</strong><small>${state.completed.includes(i)?'✓ 已解':p.tag}</small><p>${p.desc}</p></button>`).join('');$$('[data-puzzle]').forEach(b=>b.onclick=()=>askReset(()=>{state.puzzle=+b.dataset.puzzle;newGame()}));let top=state.flipped?'r':'b',bottom=E.other(top);for(let[loc,s]of[['top',top],['bottom',bottom]]){let isAI=state.mode==='ai'?s!==state.human:state.mode==='puzzle'?s==='b':false;$('#'+loc+'Avatar').className='avatar '+(s==='r'?'red':'dark');$('#'+loc+'Avatar').textContent=s==='r'?'帅':'将';$('#'+loc+'Name').textContent=isAI?(state.mode==='puzzle'?'残局守方':'弈境棋友 · '+['入门','进阶','高手'][state.level-1]):state.mode==='local'?(s==='r'?'红方棋友':'黑方棋友'):'闲坐执'+(s==='r'?'红':'黑');$('#'+loc+'Sub').textContent='执'+(s==='r'?'红':'黑')+' · '+(s==='r'?'先行一步':'从容应战');$('#'+loc+'Turn').textContent=state.result?'本局已结束':state.turn===s?(isAI?'正在思考':'请落子'):'等待落子';$('#'+loc+'Turn').classList.toggle('current',!state.result&&state.turn===s)}
const checked=E.check(state.board,state.turn)&&!state.result;$('#status').classList.toggle('check-status',checked);$('#status').textContent=state.result?.text||(checked?((state.turn==='r'?'红方':'黑方')+'被将军！'+(busy?'正在思考应将…':'请先解除将军')):busy?'弈境正在思考，请稍候…':(state.turn==='r'?'红方':'黑方')+'行棋'+(state.mode==='puzzle'?' · 寻找制胜一着':'，请落子'));$('.live-dot').textContent=state.result?'已结束':'进行中';$('#moveCount').textContent='第 '+String(Math.floor(state.history.length/2)+1).padStart(2,'0')+' 回合';$('#undo').disabled=!state.history.length;$('#hint').disabled=busy||animating||!!state.result;$('#flip').disabled=animating;$('#sound').classList.toggle('on',state.sound);$('#sound').setAttribute('aria-pressed',String(state.sound));renderCaptured();renderRecords()}
// Derive captures from played moves, so puzzle setup and undone moves never count.
function renderCaptured(){
 const captures={r:[],b:[]};
 for(const h of state.history){const piece=h.board[h.move.to];if(piece)captures[h.turn].push(piece)}
 for(const [loc,side] of [['top',state.flipped?'r':'b'],['bottom',state.flipped?'b':'r']]){
  const tray=$('#'+loc+'Captured'),pieces=captures[side],name=side==='r'?'红方':'黑方';
  tray.replaceChildren();tray.setAttribute('aria-label',name+'已吃棋子，共'+pieces.length+'枚');
  const heading=document.createElement('div');heading.className='captured-heading';
  const title=document.createElement('strong');title.textContent=name+'已吃';
  const total=document.createElement('span');total.textContent=pieces.length+' 枚';heading.append(title,total);tray.append(heading);
  const list=document.createElement('div');list.className='captured-list';tray.append(list);
  if(!pieces.length){const empty=document.createElement('span');empty.className='captured-empty';empty.textContent='尚未吃子';list.append(empty);continue}
  const counts=new Map();for(const p of pieces)counts.set(p,(counts.get(p)||0)+1);
  for(const [piece,count] of counts){
   const item=document.createElement('span');item.className='captured-item';item.setAttribute('aria-label',pieceName(piece)+' '+count+'枚');item.title='吃掉'+pieceName(piece)+' '+count+'枚';
   const token=document.createElement('span');token.className='captured-token '+E.side(piece);token.textContent=E.labels[piece];token.setAttribute('aria-hidden','true');item.append(token);
   const amount=document.createElement('span');amount.className='captured-amount';amount.textContent='×'+count;amount.setAttribute('aria-hidden','true');item.append(amount);list.append(item);
  }
 }
}
function renderRecords(){
 const el=$('#records');
 if(!state.history.length){el.innerHTML='<div class="empty-record"><span>谱</span><p>一局新棋，静待第一步</p><small>每一步，都值得回味</small></div>';return}
 el.replaceChildren();
 for(let i=0;i<state.history.length;i+=2){
  const row=document.createElement('div');row.className='record-row';
  const number=document.createElement('span');number.textContent=String(i/2+1).padStart(2,'0');row.append(number);
  for(const h of [state.history[i],state.history[i+1]]){
   const entry=document.createElement('span');entry.textContent=h?.notation||'—';
   const captured=h?.board[h.move.to];
   if(captured){const badge=document.createElement('small');badge.className='capture-note';badge.textContent='吃'+E.labels[captured];badge.title='吃掉'+pieceName(captured);entry.append(badge)}
   row.append(entry);
  }
  el.append(row);
 }
 el.scrollTop=el.scrollHeight;
}

function isComputer(){return state.mode==='ai'?state.turn!==state.human:state.mode==='puzzle'&&state.turn==='b'}
function clickSquare(i){if(state.result){toast('本局已结束，可以开启新局或悔棋复盘');return}if(animating){toast('请稍候，正在展示上一步走棋');return}if(busy||isComputer()){toast('请等待对手落子');return}hintMove=null;if(E.side(state.board[i])===state.turn){selected=i;targets=E.moves(state.board,state.turn).filter(m=>m.from===i).map(m=>m.to);renderBoard();return}if(selected!==null){if(targets.includes(i)){move({from:selected,to:i});return}toast('此处不能落子，请选择标记位置');selected=null;targets=[];renderBoard()}}
function sound(capture){if(!state.sound)return;try{audioCtx??=new(window.AudioContext||window.webkitAudioContext)();audioCtx.resume();let o=audioCtx.createOscillator(),g=audioCtx.createGain();o.connect(g);g.connect(audioCtx.destination);o.type='sine';o.frequency.setValueAtTime(capture?310:640,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(100,audioCtx.currentTime+.09);g.gain.setValueAtTime(.14,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.13);o.start();o.stop(audioCtx.currentTime+.14)}catch{}}
function move(m){if(!E.legal(state.board,m.from,m.to))return;clearMoveEffects();let mover=state.board[m.from],captured=state.board[m.to];state.history.push({board:state.board.slice(),turn:state.turn,move:m,notation:E.notation(state.board,m)});state.board=E.apply(state.board,m);state.turn=E.other(state.turn);selected=null;targets=[];hintMove=null;let ms=E.moves(state.board,state.turn);if(!ms.length){let winner=E.other(state.turn);state.result={winner,text:(winner==='r'?'红方':'黑方')+'获胜 · '+(E.check(state.board,state.turn)?'将杀':'困毙')};if(state.mode==='puzzle'&&winner==='r'){if(!state.completed.includes(state.puzzle))state.completed.push(state.puzzle);state.result.text='残局已解 · '+puzzles[state.puzzle].name}}else{let key=JSON.stringify(state.board),repeats=state.history.filter(h=>h.turn===state.turn&&JSON.stringify(h.board)===key).length;if(repeats>=2)state.result={winner:null,text:'和棋 · 局面三次重复'}}animating=true;trailUntil=performance.now()+1400;save();render();playMoveFeedback(m,mover,captured,E.check(state.board,state.turn))}
function cancel(){job++;worker?.terminate();worker=null;busy=false}
function calculate(hint=false){cancel();busy=true;render();let id=job;worker=new Worker('worker.js');worker.onmessage=e=>{if(e.data.id!==job)return;busy=false;worker.terminate();worker=null;if(hint){hintMove=e.data.move;selected=null;targets=[];render();if(hintMove)toast('建议：'+E.notation(state.board,hintMove)+' · 已标出起点与落点')}else if(e.data.move)move(e.data.move);else render()};worker.onerror=()=>{cancel();render();toast('计算暂不可用，请重试')};worker.postMessage({board:state.board,side:state.turn,level:hint?3:state.mode==='puzzle'?3:state.level,id})}
function computer(){if(!animating&&!state.result&&isComputer())calculate()}
function newGame(){clearMoveEffects();cancel();state.board=state.mode==='puzzle'?puzzleBoard(state.puzzle):E.initial();state.turn='r';state.history=[];state.result=null;selected=null;targets=[];hintMove=null;save();render();computer()}
function showModal(html){$('#modalBody').innerHTML=html;if(!$('#modal').open)$('#modal').showModal()}
function askReset(fn){if(state.history.length&&!state.result){showModal('<h2>另开一局？</h2><p>当前棋局将被重置。你可以先关闭此窗口，导出棋谱留作回味。</p><div class="dialog-actions"><button class="secondary" id="keepGame">继续此局</button><button class="primary" id="confirmReset">开启新局 ↗</button></div>');$('#keepGame').onclick=()=>$('#modal').close();$('#confirmReset').onclick=()=>{$('#modal').close();fn()}}else fn()}
function showResult(){showModal(`<div class="eyebrow">一 局 终 了 · 余 韵 悠 长</div><h2>${state.result.text}</h2><p>${state.mode==='puzzle'?'妙手已得，继续研习下一道残局，或返回棋盘回味。':'胜负之外，每一手棋都是新的领悟。共行棋 '+state.history.length+' 步。'}</p><button class="primary" id="again">${state.mode==='puzzle'?'下一道残局':'再来一局'} ↗</button><button class="secondary" id="review" style="width:100%">返回棋盘</button>`);$('#again').onclick=()=>{$('#modal').close();if(state.mode==='puzzle')state.puzzle=(state.puzzle+1)%puzzles.length;newGame()};$('#review').onclick=()=>$('#modal').close()}
$$('nav button').forEach(b=>b.onclick=()=>{if(state.mode!==b.dataset.mode)askReset(()=>{state.mode=b.dataset.mode;state.flipped=state.mode==='ai'&&state.human==='b';newGame()})});$$('[data-level]').forEach(b=>b.onclick=()=>{state.level=+b.dataset.level;save();render();if(isComputer())computer()});$$('[data-side]').forEach(b=>b.onclick=()=>{if(state.human!==b.dataset.side)askReset(()=>{state.human=b.dataset.side;state.flipped=state.human==='b';newGame()})});$('#newGame').onclick=()=>askReset(newGame);$('#flip').onclick=()=>{state.flipped=!state.flipped;save();render()};$('#sound').onclick=()=>{state.sound=!state.sound;save();render();sound(false);toast(state.sound?'落子音效已开启':'落子音效已关闭')};$('#undo').onclick=()=>{clearMoveEffects();cancel();let h=state.history.pop();if(!h)return;if(state.mode!=='local'&&h.turn!==(state.mode==='ai'?state.human:'r')&&state.history.length)h=state.history.pop();state.board=h.board;state.turn=h.turn;state.result=null;selected=null;targets=[];hintMove=null;save();render();toast('已退回上一步');computer()};$('#hint').onclick=()=>{if(isComputer()){toast('请等待对手落子');return}calculate(true)};$('#export').onclick=()=>{let lines=['弈境 · 中国象棋',new Date().toLocaleString('zh-CN'),{ai:'人机对弈',local:'双人对弈',puzzle:'残局：'+puzzles[state.puzzle].name}[state.mode],''];for(let i=0;i<state.history.length;i+=2)lines.push(`${i/2+1}. ${state.history[i].notation}  ${state.history[i+1]?.notation||''}`);if(state.result)lines.push(state.result.text);let url=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'}));let a=document.createElement('a');a.href=url;a.download='弈境棋谱.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('棋谱已导出')};$('#rules').onclick=()=>showModal('<div class="eyebrow">棋 道 入 门</div><h2>先识棋，再入境。</h2><p>红方先行，双方轮流走一子。点击己方棋子，再点击绿色落点；圈出的对方棋子可被吃掉。</p><ul><li><b>车</b>走直线，不可越子；<b>马</b>走日字，直邻有子会蹩腿。</li><li><b>炮</b>平走如车，吃子须隔一枚棋子。</li><li><b>相／象</b>走田字，不可过河，田心有子不能走。</li><li><b>仕／士</b>斜走一步；<b>帅／将</b>直走一步，均不能离开九宫。将帅不能直接照面。</li><li><b>兵／卒</b>每步前进一格，过河后可横走，不能后退。</li></ul><p>被将军时必须解将；无合法着法的一方判负（包括困毙）。本游戏三次重复局面判和，不含正式赛事的长将、长捉裁定。残局由红方先行，将杀即可过关。</p><p>双人对弈为同一设备轮流执棋。人机在浏览器本地计算；高手档增加搜索深度，适合日常切磋。</p>');$('.close').onclick=()=>$('#modal').close();$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){let r=$('#modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('#modal').close()}});
drawGrid();render();computer();
