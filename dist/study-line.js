(function(root){
 function build(E,lesson){
  const initial=Array(90).fill(null);for(const[x,y,p]of lesson.pieces)initial[y*9+x]=p;
  const frames=[initial],steps=[];
  for(const [i,entry]of (lesson.sequence||[{move:lesson.move,note:lesson.explanation}]).entries()){
   const [x,y,X,Y]=entry.move,move={from:y*9+x,to:Y*9+X},side=i%2?'b':'r',before=frames[i];
   if(E.side(before[move.from])!==side||!E.legal(before,move.from,move.to))throw new Error(lesson.id+': illegal study move '+i);
   steps.push({move,side,notation:E.notation(before,move),note:entry.note,focus:entry.focus||lesson.focus,captured:before[move.to]});
   frames.push(E.apply(before,move));
  }
  return {frames,steps};
 }
 root.XQStudy={build};if(typeof module!=='undefined')module.exports={build};
})(typeof self!=='undefined'?self:globalThis);
