(() => {
 const E=XQ,lessons=XQ_KILLS,$=s=>document.querySelector(s);
 let completed=new Set(),storageOK=true;
 try{const saved=JSON.parse(localStorage.getItem('yijing-kills-v1')||'[]');if(Array.isArray(saved))completed=new Set(saved.filter(id=>lessons.some(l=>l.id===id)))}catch{storageOK=false}
 let lesson=lessons.find(l=>l.id===location.hash.slice(1))||lessons[0],board,selected=null,targets=[],solved=false,assisted=false,demoTimer=null,locked=false,category='全部',query='',kindFilter='all',line,ply=0,demoMode=false,playing=false,timerEpoch=0;
 const isCaptureLesson=()=>lesson.goal==='capture-rook';
 const solution=()=>line.steps[ply]?.move;
 function message(text,type=''){$('#studyMessage').textContent=text;$('#studyMessage').className='study-message '+type}
 function saveProgress(){try{localStorage.setItem('yijing-kills-v1',JSON.stringify([...completed]));storageOK=true}catch{storageOK=false}}
 function progress(){const n=completed.size;$('#progressNumber').innerHTML=String(n).padStart(2,'0')+' <span>/ '+lessons.length+'</span>';$('#studyProgress').max=lessons.length;$('#studyProgress').value=n;$('#lessonTotal').textContent=lessons.length}
 function filtered(){return lessons.filter(l=>(category==='全部'||l.category===category)&&(kindFilter==='all'||(kindFilter==='tactic'?l.goal==='capture-rook':kindFilter==='multi'?!!l.sequence&&!l.goal:!l.sequence))&&(l.name+l.alias+l.summary+l.category).includes(query))}
 function renderCatalog(){
  const list=$('#lessonList'),items=filtered();list.replaceChildren();$('#resultCount').textContent=items.length+' / '+lessons.length+' 式';$('#noResults').hidden=!!items.length;$('#clearSearch').hidden=!!items.length;
  for(const l of items){
   const card=document.createElement('button');card.className='lesson-card'+(l.id===lesson.id?' active':'');card.setAttribute('aria-label',l.name+(completed.has(l.id)?'，已独立解出':''));card.setAttribute('aria-pressed',String(l.id===lesson.id));
   const number=document.createElement('span');number.className='catalog-number';number.textContent=String(lessons.indexOf(l)+1).padStart(2,'0');
   const info=document.createElement('span'),title=document.createElement('strong'),meta=document.createElement('small');title.textContent=l.name;meta.textContent=l.category+' · '+(l.goal?'2步得子':l.sequence?Math.ceil(l.sequence.length/2)+'步连杀':l.level);info.append(title,meta);card.append(number,info);
   if(completed.has(l.id)){const mark=document.createElement('span');mark.className='solved-mark';mark.textContent='✓';mark.setAttribute('aria-hidden','true');card.append(mark)}
   card.onclick=()=>selectLesson(l,true);list.append(card);
  }
 }
 function selectLesson(next,scroll=false){
  lesson=next;history.replaceState(null,'',location.pathname+location.search+'#'+lesson.id);reset();renderCatalog();
  if(scroll&&matchMedia('(max-width:760px)').matches)$('#lessonDetail').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});
 }
 function stopTimers(){StudyEffects.clear();timerEpoch++;clearTimeout(demoTimer);demoTimer=null;playing=false;locked=false}
 function later(fn,delay){const epoch=timerEpoch;demoTimer=setTimeout(()=>{demoTimer=null;if(epoch===timerEpoch)fn()},delay)}
 function reset(){
  stopTimers();solved=false;assisted=false;demoMode=false;ply=0;selected=null;targets=[];line=XQStudy.build(E,lesson);board=line.frames[0].slice();
  $('#lessonCategory').textContent=lesson.category+' / '+lesson.level+' / '+lesson.alias;$('#lessonName').textContent=lesson.name;$('#lessonSummary').textContent=lesson.summary;
  $('#lessonPrinciple').textContent='红方子力：'+[...new Set(lesson.pieces.filter(p=>p[2][0]==='r').map(p=>E.labels[p[2]]))].join('、')+'。'+(line.steps.length>1?'你走红方，黑方会自动应对。按顺序完成本课的战术。':'先找能将军的棋子，再看其他子力如何封住黑将的去路。');
  $('#studyTip').textContent=isCaptureLesson()?'先制造威胁，再检查对方的逃法。看过提示或演示后，可重试独立解题。':'先找将军的子，再数黑将的逃格。看过提示或演示后，可重试独立解题。';
  $('#lessonExplanation').textContent=lesson.explanation;$('#lessonPitfall').textContent=lesson.pitfall;$('#hintText').textContent=lesson.hint;
  $('#solutionNotation').textContent=line.steps.map(step=>(step.side==='r'?'红 ':'黑 ')+step.notation).join(' → ')+(isCaptureLesson()?' · 得车':' · 将杀');$('#answerDetails').open=false;$('#hintNote').hidden=true;
  $('#lessonBadge').textContent=completed.has(lesson.id)?'✓ 已独立解出':lesson.stage||'自编教学局';$('#lessonIndex').textContent=String(lessons.indexOf(lesson)+1).padStart(2,'0')+' / '+lessons.length;
  $('#studyGoal').textContent=isCaptureLesson()?'红先 · 2步得车 / 双方共3手':line.steps.length>1?'红先 · '+Math.ceil(line.steps.length/2)+'步连杀 / 双方共'+line.steps.length+'手':'红先 · 一着将杀';
  $('#previousLesson').disabled=lessons.indexOf(lesson)===0;$('#nextLesson').disabled=lessons.indexOf(lesson)===lessons.length-1;
  message(isCaptureLesson()?'你执红方，先制造威胁，再完成吃车。黑方自动走演示应着。':line.steps.length>1?'你执红方，走出第一步将军。黑方会自动应将。':'点击红方棋子，走出最后一击。');renderBoard();renderLine();
 }
 function renderLine(){
  $('#lineMode').textContent=demoMode?'演示模式':locked?'黑方应对中':solved?'练习完成':'练习模式 · 你执红';
  $('#plyCounter').textContent=ply+' / '+line.steps.length+' 手';
  $('#stepNote').textContent=ply?((line.steps[ply-1].side==='r'?'红方':'黑方')+' · '+line.steps[ply-1].notation+'：'+line.steps[ply-1].note):'起始局面。逐步演示会显示每一手的走法与原因。';
  $('#plyPrevious').disabled=ply===0;$('#plyNext').disabled=ply===line.steps.length;
  $('#playLine').textContent=playing?'暂停演示':'自动播放';$('#playLine').setAttribute('aria-pressed',String(playing));
  $('#replayStep').disabled=ply===0;$('#lessonHint').disabled=demoMode||locked||solved;$('#lessonDemo').disabled=false;
  const list=$('#lineMoves');list.replaceChildren();
  for(let i=0;i<(demoMode?line.steps.length:ply);i++){
   const step=line.steps[i],button=document.createElement('button');button.className='line-move'+(ply===i+1?' current':'');button.textContent=(i+1)+'. '+(step.side==='r'?'红 ':'黑 ')+step.notation;button.setAttribute('aria-label','查看第'+(i+1)+'手 '+button.textContent);button.setAttribute('aria-current',ply===i+1?'step':'false');
   button.onclick=()=>{enterDemo();showPly(i+1)};list.append(button);
  }
 }
 function enterDemo(){stopTimers();demoMode=true;assisted=true;selected=null;targets=[]}
 function showPly(index,animate=false){
  ply=Math.max(0,Math.min(index,line.steps.length));board=line.frames[ply].slice();selected=null;targets=[];solved=ply===line.steps.length;
  renderBoard(animate&&ply?line.steps[ply-1].move:undefined,ply?line.frames[ply-1]:undefined);renderLine();
  message(solved?(isCaptureLesson()?'演示完成：成功吃车，对局尚未结束。可后退复盘，或从头练习。':'演示完成：黑方已无合法应着。可后退复盘，或从头练习。'):ply?'当前展示第 '+ply+' 手，'+(ply%2?'接下来黑方应对。':'接下来红方进攻。'):'演示从起始局面开始，可逐手前进或自动播放。',solved?'success':'');
 }
 function startPlayback(){
  enterDemo();if(ply===line.steps.length)showPly(0);playing=true;renderLine();
  function tick(){showPly(ply+1,true);if(ply<line.steps.length)later(tick,2200);else{playing=false;renderLine()}}
  later(tick,800);
 }
 function finishPractice(notation){
  const outcome=isCaptureLesson()?'吃车目标完成，对局尚未结束。':'将杀成立。';
  solved=true;locked=false;selected=null;targets=[];
  if(!assisted){completed.add(lesson.id);saveProgress();progress();renderCatalog();$('#lessonBadge').textContent='✓ 已独立解出';message('妙手！'+notation+'，'+outcome+(storageOK?'已记录独立解题进度。':'本次已解出，浏览器未允许保存进度。'),'success')}
  else message('正确：'+notation+'，'+outcome+'可重试独立完成整条战术。','success');
  renderLine();
 }
 function renderBoard(animatedMove,before){
  StudyEffects.clear();
  const host=$('#studyPieces'),dots=$('#studyTargets'),focusedIndex=document.activeElement?.dataset.square;host.replaceChildren();dots.replaceChildren();
  for(let i=0;i<90;i++){
   const p=board[i],cell=document.createElement('button');cell.dataset.square=i;cell.className=p?'piece '+E.side(p)+(selected===i?' selected':'')+(p==='bK'&&E.check(board,'b')?' solved-king':''):'square';
   cell.style.left=((i%9+.5)*100/9)+'%';cell.style.top=((Math.floor(i/9)+.5)*10)+'%';cell.textContent=p?E.labels[p]:'';
   cell.setAttribute('aria-label',`${i%9+1}路${Math.floor(i/9)+1}行${p?'，'+(E.side(p)==='r'?'红':'黑')+E.labels[p]:''}`);cell.tabIndex=i===(selected??81)?0:-1;cell.onclick=()=>clickSquare(i);
   cell.onkeydown=e=>{const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-9,ArrowDown:9}[e.key];if(delta){e.preventDefault();const j=i+delta;if(j>=0&&j<90){host.querySelectorAll('button').forEach(n=>n.tabIndex=-1);const next=host.querySelector(`[data-square="${j}"]`);next.tabIndex=0;next.focus()}}};
   host.append(cell);

  }
  if(animatedMove&&before){const step=line.steps[ply-1],onLine=step?.move.from===animatedMove.from&&step?.move.to===animatedMove.to;StudyEffects.show(E,before,board,animatedMove,onLine?step.focus:undefined,lesson.name)}
  if(focusedIndex!==undefined)host.querySelector(`[data-square="${focusedIndex}"]`)?.focus({preventScroll:true});
  for(const i of targets){const dot=document.createElement('div');dot.className='target'+(board[i]?' capture':'');dot.style.left=((i%9+.5)*100/9)+'%';dot.style.top=((Math.floor(i/9)+.5)*10)+'%';dots.append(dot)}
 }
 function clickSquare(i){
  if(demoMode){message('当前为演示模式。点击“从头练习”即可自己落子。');return}if(locked||solved)return;
  if(E.side(board[i])==='r'){selected=i;targets=E.moves(board,'r').filter(m=>m.from===i).map(m=>m.to);renderBoard();return}
  if(selected===null){message('先选一枚红方棋子，再点击绿色落点。');return}
  if(!targets.includes(i)){message('这里不能落子，请选择绿色标记的位置。','error');return}
  attempt({from:selected,to:i});
 }
 function attempt(m){
  if(!E.legal(board,m.from,m.to))return;
  const next=E.apply(board,m),replies=E.moves(next,'b'),isMate=E.check(next,'b')&&!replies.length,expected=solution(),onLine=m.from===expected?.from&&m.to===expected?.to;
  if(!(isMate&&!isCaptureLesson())&&!onLine){
   message(line.steps.length>1?'这手不在本课的战术主线上，棋子已留在原位。可以继续尝试，或查看提示与演示。':E.check(next,'b')?'已经将军，但黑方还能走「'+E.notation(next,replies[0])+'」。棋子已留在原位，再找一找。':'这一手还没有形成将杀。棋子已留在原位，再检查黑将的逃路。','error');selected=null;targets=[];renderBoard();return;
  }
  const notation=E.notation(board,m),before=board;board=next;ply++;selected=null;targets=[];renderBoard(m,before);
  if(isMate||isCaptureLesson()&&ply===line.steps.length&&before[m.to]==='bR'){finishPractice(notation);return}
  locked=true;renderLine();message('红方 '+notation+'。黑方正在应对…');
  later(()=>{
   const reply=line.steps[ply],before=board;board=E.apply(board,reply.move);ply++;locked=false;renderBoard(reply.move,before);renderLine();message('黑方 '+reply.notation+'。轮到红方，请继续完成战术。');
  },2000);
 }
 function drawGrid(){
  let lines='';for(let y=0;y<10;y++)lines+=`<path d="M50 ${50+y*100}H850"/>`;
  for(let x=0;x<9;x++){const X=50+x*100;lines+=x===0||x===8?`<path d="M${X} 50V950"/>`:`<path d="M${X} 50V450M${X} 550V950"/>`}
  lines+='<path d="M350 50L550 250M550 50L350 250M350 750L550 950M550 750L350 950"/>';
  $('#studyGrid').innerHTML=`<g fill="none" stroke="#947b55" stroke-width="1.8" opacity=".85">${lines}<rect x="40" y="40" width="820" height="920" stroke-width="2.5"/></g><g fill="#8a7655" font-family="Songti SC,STSong,serif" font-size="39" letter-spacing="19"><text x="180" y="514">楚河</text><text x="585" y="514">汉界</text></g>`;
 }
 for(const name of ['全部',...new Set(lessons.map(l=>l.category))]){const button=document.createElement('button');button.textContent=name;button.className=name==='全部'?'active':'';button.setAttribute('aria-pressed',String(name==='全部'));button.onclick=()=>{category=name;$('#categoryFilters').querySelectorAll('button').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button))});renderCatalog()};$('#categoryFilters').append(button)}
 $('#lessonSearch').oninput=e=>{query=e.target.value.trim();renderCatalog()};
 $('#clearSearch').onclick=()=>{$('#lessonSearch').value='';query='';kindFilter='all';$('#lessonKind').value='all';$('#categoryFilters button').click()};
 $('#lessonKind').onchange=e=>{kindFilter=e.target.value;renderCatalog()};
 $('#lessonHint').onclick=()=>{if(locked||solved||demoMode)return;assisted=true;const note=line.steps.length>1?line.steps[ply].note:lesson.hint;$('#hintText').textContent=note;$('#hintNote').hidden=false;selected=solution().from;targets=E.moves(board,'r').filter(m=>m.from===selected).map(m=>m.to);renderBoard();message(note)};
 $('#lessonDemo').onclick=()=>{enterDemo();showPly(0);startPlayback()};
 $('#plyPrevious').onclick=()=>{enterDemo();showPly(ply-1)};
 $('#plyNext').onclick=()=>{enterDemo();showPly(ply+1,true)};
 $('#playLine').onclick=()=>{if(playing){stopTimers();renderLine();message('演示已暂停，可继续播放或逐手查看。')}else startPlayback()};
 $('#replayStep').onclick=()=>{if(!ply)return;enterDemo();showPly(ply,true)};
 $('#practiceLine').onclick=reset;
 $('#answerDetails').ontoggle=()=>{if($('#answerDetails').open)assisted=true};
 $('#lessonReset').onclick=reset;
 $('#previousLesson').onclick=()=>selectLesson(lessons[lessons.indexOf(lesson)-1]);$('#nextLesson').onclick=()=>selectLesson(lessons[lessons.indexOf(lesson)+1]);
 window.addEventListener('hashchange',()=>{const l=lessons.find(l=>l.id===location.hash.slice(1));if(l)selectLesson(l)});
 drawGrid();progress();renderCatalog();reset();
})();
