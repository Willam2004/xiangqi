importScripts('engine.js');onmessage=e=>{let {board,side,level,id,budget}=e.data;postMessage({...XQ.best(board,side,level,budget),id})};
