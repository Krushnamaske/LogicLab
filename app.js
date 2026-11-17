const $=id=>document.getElementById(id);
const VARS=['A','B','C','D'];let variableCount=3,format='SOP',minterms=[1,3,5,7],dontCares=[],truthRows=[];
const grayOrder=['00','01','11','10'];
function bits(n,w=variableCount){return n.toString(2).padStart(w,'0')}
function parseIndices(text,max){if(!text.trim())return[];const raw=text.split(',').map(x=>x.trim());if(raw.some(x=>!/^\d+$/.test(x)))throw Error('Use decimal indices separated by commas, for example: 1, 3, 5.');const values=[...new Set(raw.map(Number))].sort((a,b)=>a-b);if(values.some(n=>n<0||n>=max))throw Error(`For ${variableCount} variables, indices must be between 0 and ${max-1}.`);return values}
function combinePatterns(a,b){let differences=0,out='';for(let i=0;i<a.length;i++){if(a[i]===b[i])out+=a[i];else{differences++;out+='-'}}return differences===1?out:null}
function covers(pattern,binary){return [...pattern].every((ch,i)=>ch==='-'||ch===binary[i])}
function allPrimeImplicants(onSet,dcSet){
 let current=[...new Set([...onSet,...dcSet])].map(n=>({pattern:bits(n),used:false})),primes=[];
 while(current.length){const next=new Map();current.forEach(x=>x.used=false);
  for(let i=0;i<current.length;i++)for(let j=i+1;j<current.length;j++){const merged=combinePatterns(current[i].pattern,current[j].pattern);if(merged!==null){current[i].used=true;current[j].used=true;if(!next.has(merged))next.set(merged,{pattern:merged,used:false})}}
  current.filter(x=>!x.used).forEach(x=>{if(!primes.some(p=>p.pattern===x.pattern))primes.push(x)});
  current=[...next.values()];
 }
 return primes.map(p=>({...p,covered:onSet.filter(n=>covers(p.pattern,bits(n)))})).filter(p=>p.covered.length);
}
function chooseMinimumCover(onSet,dcSet){
 if(!onSet.length)return[];
 const primes=allPrimeImplicants(onSet,dcSet);
 // Enumerate all prime-implicant subsets (at most 4-variable functions have a small chart)
 // and choose the cover with fewest terms, then fewest literals.
 let best=null;
 const coversAll=chosen=>onSet.every(n=>chosen.some(p=>p.covered.includes(n)));
 const score=chosen=>[chosen.length,chosen.reduce((sum,p)=>sum+[...p.pattern].filter(c=>c!=='-').length,0)];
 function better(a,b){if(!b)return true;const x=score(a),y=score(b);return x[0]<y[0]||(x[0]===y[0]&&x[1]<y[1])}
 function visit(i,chosen){if(chosen.length>onSet.length)return;if(coversAll(chosen)){if(better(chosen,best))best=[...chosen];return}if(i>=primes.length||best&&chosen.length>best.length)return;visit(i+1,[...chosen,primes[i]]);visit(i+1,chosen)}
 visit(0,[]);return best||primes.filter(p=>p.covered.length);
}
function sopTerm(pattern){return [...pattern].map((b,i)=>b==='-'?null:b==='1'?VARS[i]:VARS[i]+"'").filter(Boolean).join('')}
function posTerm(pattern){return '('+[...pattern].map((b,i)=>b==='-'?null:b==='0'?VARS[i]:VARS[i]+"'").filter(Boolean).join(' + ')+')'}
function buildExpression(on,dc,mode){
 const total=1<<variableCount,targets=mode==='SOP'?on:Array.from({length:total},(_,i)=>i).filter(i=>!on.includes(i)&&!dc.includes(i));
 if(!targets.length)return mode==='SOP'?'0':'1';
 if(targets.length+dc.length===total)return mode==='SOP'?'1':'0';
 const groups=chooseMinimumCover(targets,dc);
 return groups.map(p=>mode==='SOP'?sopTerm(p.pattern):posTerm(p.pattern)).join(mode==='SOP'?' + ':' · ');
}
function literalCount(expr){if(expr==='0'||expr==='1')return 0;return (expr.match(/[ABCD](?:')?/g)||[]).length}
function termCount(expr){if(expr==='0'||expr==='1')return 0;return format==='SOP'?expr.split(' + ').length:expr.split(' · ').length}
function explain(expr){if(expr==='0')return 'No input combination makes the function equal to 1, so the minimized function is constant zero.';if(expr==='1')return 'Every required input combination makes the function equal to 1, so the minimized function is constant one.';return `The solver combines minterms that differ in one bit, then selects a minimum-cost cover. Variables that change within a group are removed, leaving: ${expr}.`}
function renderTruth(){
 const names=VARS.slice(0,variableCount);let html='<table><thead><tr>'+names.map(n=>`<th>${n}</th>`).join('')+'<th>Index</th><th>F</th></tr></thead><tbody>';truthRows=[];
 for(let n=0;n<(1<<variableCount);n++){const bs=bits(n),out=minterms.includes(n)?'1':dontCares.includes(n)?'X':'0';truthRows.push([...bs].map(Number).concat(n,out));html+='<tr>'+[...bs].map(b=>`<td>${b}</td>`).join('')+`<td>${n}</td><td class="${out==='1'?'out-one':out==='X'?'out-x':''}">${out}</td></tr>`}
 return html+'</tbody></table>';
}
let activeGroup=-1, currentGroups=[], currentTargets=[], currentDc=[];
function patternMembers(pattern){const total=1<<variableCount;return Array.from({length:total},(_,n)=>n).filter(n=>covers(pattern,bits(n)));}
function renderKmap(){
 const rows=variableCount===2?['0','1']:variableCount===3?['0','1']:grayOrder;
 const cols=variableCount===2?['0','1']:grayOrder;
 let html='<table class="kmap"><thead><tr><th></th>'+cols.map(c=>`<th>${c}</th>`).join('')+'</tr></thead><tbody>';
 rows.forEach(r=>{html+=`<tr><th>${r}</th>`;cols.forEach(c=>{let b=r+c,n=parseInt(b,2),v=minterms.includes(n)?'1':dontCares.includes(n)?'X':'0',cl=v==='1'?'k-one':v==='X'?'k-x':'';
  const memberships=currentGroups.map((g,i)=>covers(g.pattern,bits(n))?i:-1).filter(i=>i>=0);
  if(memberships.length){cl+=' k-group';if(activeGroup<0||memberships.includes(activeGroup))cl+=` group-${memberships[0]%6}`;if(activeGroup>=0&&!memberships.includes(activeGroup))cl+=' group-muted';if(activeGroup>=0&&memberships.includes(activeGroup))cl+=' group-active';}
  html+=`<td class="${cl.trim()}" title="Index ${n}${memberships.length?'; group '+memberships.map(i=>i+1).join(', '):''}">${v}<span class="idx">${format==='POS'?'M':'m'}${n}</span>${memberships.length?`<span class="group-mark">${memberships.map(i=>i+1).join(',')}</span>`:''}</td>`;
 });html+='</tr>'});$('kmap').innerHTML=html+'</tbody></table>';
}
function renderGroupingSteps(){
 const panel=$('groupingSteps');if(!panel)return;
 if(!currentGroups.length){panel.innerHTML='<div class="group-empty">No groups are needed for this constant function.</div>';return;}
 const names=VARS.slice(0,variableCount);
 panel.innerHTML=`<div class="group-intro">Select a step to highlight its cells in the K-map. Groups may wrap across opposite edges; every group contains a power of two cells.</div><div class="group-step-list">${currentGroups.map((g,i)=>{
  const members=patternMembers(g.pattern), term=format==='SOP'?sopTerm(g.pattern):posTerm(g.pattern);
  const changed=names.filter((_,j)=>g.pattern[j]==='-');
  const kept=names.filter((_,j)=>g.pattern[j]!=='-');
  const fixed=names.map((name,j)=>({name,bit:g.pattern[j]})).filter(x=>x.bit!=='-');
  const fixedExplanation=fixed.length?`Fixed variables: ${fixed.map(x=>`${x.name}=${x.bit} → ${format==='SOP'?(x.bit==='1'?x.name:x.name+"'"):(x.bit==='0'?x.name:x.name+"'")}`).join(', ')}.`:'All variables vary, so this group simplifies to a constant.';
  const indices=members.map(n=>`${format==='POS'?'M':'m'}${n}`).join(', ');
  const derivation=changed.length?`Variable${changed.length>1?'s':''} ${changed.join(', ')} ${changed.length>1?'change':'changes'} inside this group, so ${changed.length>1?'they are':'it is'} eliminated. ${fixedExplanation}`:fixedExplanation;
  return `<button class="group-step ${i===activeGroup?'selected':''}" data-group="${i}"><span class="group-number group-color-${i%6}">${i+1}</span><span class="group-step-main"><b>Group ${i+1} · ${members.length} cells</b><small>${indices}</small><small>${derivation}</small><strong>${escapeHtml(term||'1')}</strong></span><span class="group-arrow">↗</span></button>`;
 }).join('')}</div><div class="group-final"><span>COMBINED MINIMIZED EXPRESSION</span><strong>${escapeHtml($('equation').textContent)}</strong><p>Each selected group produces one term. Combine the terms with ${format==='SOP'?'OR (+)':'AND (·)'} to obtain the final ${format} expression.</p></div>`;
 panel.querySelectorAll('[data-group]').forEach(btn=>btn.addEventListener('click',()=>{activeGroup=Number(btn.dataset.group);renderKmap();renderGroupingSteps()}));
}
function updateFunctionInputLabels(){
 const isPOS = format === 'POS';
 const label = $('minterms')?.previousElementSibling;
 if(label) label.innerHTML = isPOS
   ? 'Maxterms <span class="label-note">where F = 0</span>'
   : 'Minterms <span class="label-note">where F = 1</span>';
 if($('minterms')) $('minterms').placeholder = isPOS ? 'Example: 0, 2, 4, 6' : 'Example: 1, 3, 5, 7';
 const metricLabel = $('metricMinterms')?.previousElementSibling;
 if(metricLabel) metricLabel.textContent = isPOS ? 'MAXTERMS' : 'MINTERMS';
 const helper = $('functionInputHelp');
 if(helper) helper.textContent = isPOS
   ? 'POS mode: enter the maxterm indices (the input combinations where F = 0).'
   : 'SOP mode: enter the minterm indices (the input combinations where F = 1).';
 const example = $('exampleOdd');
 if(example) example.textContent = isPOS ? 'Odd maxterms' : 'Odd minterms';
}

function quineMcCluskeyTrace(targets, dcSet, mode='SOP', variableNames=VARS.slice(0,variableCount), title='Quine–McCluskey walkthrough'){
 const total=1<<variableCount;
 const seed=[...new Set([...targets,...dcSet])].sort((a,b)=>a-b).map(n=>({pattern:bits(n),members:[n]}));
 let current=seed, rounds=[], primeMap=new Map(), roundNo=1;
 while(current.length){
  const buckets={};
  current.forEach(t=>{const ones=[...t.pattern].filter(c=>c==='1').length;(buckets[ones]??=[]).push(t)});
  const combined=new Set(), next=new Map(), pairs=[];
  const keys=Object.keys(buckets).map(Number).sort((a,b)=>a-b);
  for(const k of keys)for(const a of (buckets[k]||[]))for(const b of (buckets[k+1]||[])){
   const merged=combinePatterns(a.pattern,b.pattern);
   if(merged!==null){
    combined.add(a.pattern+'|'+a.members.join(','));
    combined.add(b.pattern+'|'+b.members.join(','));
    const members=[...new Set([...a.members,...b.members])].sort((x,y)=>x-y);
    if(!next.has(merged))next.set(merged,{pattern:merged,members});
    else next.get(merged).members=[...new Set([...next.get(merged).members,...members])].sort((x,y)=>x-y);
    pairs.push({a:a.pattern,b:b.pattern,result:merged});
   }
  }
  const uncombined=current.filter(t=>!combined.has(t.pattern+'|'+t.members.join(',')));
  uncombined.forEach(t=>{if(targets.some(n=>covers(t.pattern,bits(n))))primeMap.set(t.pattern,t)});
  rounds.push({number:roundNo,buckets,pairs,uncombined,next:[...next.values()]});
  current=[...next.values()];roundNo++;
 }
 const primes=[...primeMap.keys()];
 const selected=chooseMinimumCover(targets,dcSet);
 const termFor=p=>mode==='POS'?posTerm(p):sopTerm(p);
 // Derive the final expression from the same required set shown in the trace.
 // For POS, targets are maxterm (OFF-set) indices; buildExpression expects the ON-set.
 const onSetForExpression = mode==='SOP' ? targets : Array.from({length:total},(_,n)=>n).filter(n=>!targets.includes(n)&&!dcSet.includes(n));
 const finalExpression = buildExpression(onSetForExpression, dcSet, mode);
 const functionName = `F(${variableNames.join(', ')})`;
 let chart='';
 if(primes.length){
  chart='<div class="qm-chart-wrap"><table class="qm-chart"><thead><tr><th>Prime implicant</th>'+targets.map(n=>`<th>${mode==='POS'?'M':'m'}${n}</th>`).join('')+'</tr></thead><tbody>'+
   primes.map(p=>`<tr><th><code>${p}</code><small>${escapeHtml(termFor(p))}</small></th>${targets.map(n=>`<td>${covers(p,bits(n))?'✓':'·'}</td>`).join('')}</tr>`).join('')+
   '</tbody></table></div>';
 }
 return `<section class="qm-trace"><div class="qm-trace-head"><div><span class="micro-label">ALGORITHM WALKTHROUGH</span><h3>${escapeHtml(title)}</h3></div><span class="qm-pill">QUINE–MCCLUSKEY</span></div>
 <p class="subtle">This is a tabular minimization method. It combines terms that differ in exactly one bit. A dash (–) means that variable is eliminated.</p>
 <div class="qm-stage"><b>Step 1 · Initial binary terms</b><p>Convert each required ${mode==='POS'?'maxterm index (OFF-set)':'minterm index (ON-set)'} and each permitted don't-care into ${variableCount}-bit binary.</p><div class="qm-binary-list">${seed.map(t=>`<span><b>${t.members[0]}</b><code>${t.pattern}</code>${dcSet.includes(t.members[0])?'<i>DC</i>':''}</span>`).join('')||'<span>No terms supplied</span>'}</div></div>
 ${rounds.map(r=>`<div class="qm-stage"><b>Step ${r.number+1} · Combination round ${r.number}</b><p>Compare adjacent 1-count groups. Only pairs with exactly one differing bit can combine.</p><div class="qm-round-grid">${Object.keys(r.buckets).sort((a,b)=>a-b).map(k=>`<div><small>${k} ones</small>${r.buckets[k].map(t=>`<code>${t.pattern}</code>`).join('')}</div>`).join('')}</div>
 ${r.pairs.length?`<div class="qm-pairs">${r.pairs.map(p=>`<span><code>${p.a}</code> + <code>${p.b}</code> <b>→</b> <code>${p.result}</code></span>`).join('')}</div>`:'<p class="qm-muted">No further combinations are possible in this round.</p>'}
 ${r.uncombined.length?`<p class="qm-muted">Uncombined terms become prime-implicant candidates: ${r.uncombined.map(t=>`<code>${t.pattern}</code>`).join(', ')}</p>`:''}</div>`).join('')}
 <div class="qm-stage"><b>Step ${rounds.length+2} · Prime implicants</b><p>Terms that cannot be combined further and cover at least one required index are retained.</p><div class="qm-primes">${primes.map(p=>`<span><code>${p}</code><b>${escapeHtml(termFor(p))}</b></span>`).join('')||'No prime implicants required for this constant function.'}</div></div>
 <div class="qm-stage"><b>Step ${rounds.length+3} · Prime-implicant chart</b><p>Rows are prime implicants and columns are required indices. A check mark means that implicant covers that index.</p>${chart||'<p class="qm-muted">No chart is needed for a constant function.</p>'}</div>
 <div class="qm-stage"><b>Step ${rounds.length+4} · Select a minimum cover</b><p>The solver selects a cover with the fewest terms, then the fewest literals.</p><div class="qm-selected">${selected.map(p=>`<span><code>${p.pattern}</code> ${escapeHtml(termFor(p.pattern))}</span>`).join('')||'No implicants are needed for a constant function.'}</div></div>
 <div class="qm-stage qm-final-equation"><b>Step ${rounds.length+5} · Final minimized ${mode} equation</b><p>Convert the selected implicant patterns into Boolean terms and combine them using ${mode==='SOP'?'OR ( + )':'AND ( · )'}. A dash means that variable is eliminated.</p><div class="qm-final-equation-box"><span>MINIMIZED BOOLEAN FUNCTION</span><strong>${escapeHtml(functionName)} = ${escapeHtml(finalExpression)}</strong></div><p class="qm-muted">This is the final result calculated from the independent input above.</p></div>
 </section>`;
}

function solve(){
 try{
  const total = 1 << variableCount;
  const enteredIndices = parseIndices($('minterms').value,total);
  dontCares = parseIndices($('dontCares').value,total);
  if(enteredIndices.some(n=>dontCares.includes(n)))throw Error('An index cannot be both a minterm/maxterm and a don’t-care. Remove the overlap.');
  // The minimizer uses the ON-set internally. In POS mode the entered list
  // represents the OFF-set (maxterms), so derive the ON-set as its complement.
  minterms = format === 'POS'
    ? Array.from({length:total},(_,n)=>n).filter(n=>!enteredIndices.includes(n)&&!dontCares.includes(n))
    : enteredIndices;
  $('solverError').textContent='';
  const expression=buildExpression(minterms,dontCares,format);
  const totalIndices=Array.from({length:total},(_,i)=>i);
  currentTargets=format==='SOP'?minterms:totalIndices.filter(i=>!minterms.includes(i)&&!dontCares.includes(i));
  currentDc=dontCares;
  currentGroups=expression==='0'||expression==='1'?[]:chooseMinimumCover(currentTargets,dontCares);
  activeGroup=currentGroups.length?0:-1;
  const eq=`F(${VARS.slice(0,variableCount).join(', ')}) = ${expression}`;
  $('equation').textContent=eq;$('explanation').textContent=explain(expression);
  $('metricMinterms').textContent=enteredIndices.length;const enteredLabel=format==='POS'?'Entered maxterms':'Entered minterms';$('enteredTerms').innerHTML=`<span>${enteredLabel}</span>${enteredIndices.length?enteredIndices.map(n=>`<b>${format==='POS'?'M':'m'}${n}</b>`).join(''):'<b>None</b>'}${dontCares.length?`<span>Don’t-cares</span>${dontCares.map(n=>`<b class="dc-pill">d${n}</b>`).join('')}`:''}`;
  $('metricTerms').textContent=termCount(expression);
  $('metricLiterals').textContent=literalCount(expression);
  const parts=expression==='0'||expression==='1'?[]:format==='SOP'?expression.split(' + '):expression.split(' · ');
  $('termChips').innerHTML=parts.length?parts.map(p=>`<span class="chip">${escapeHtml(p)}</span>`).join(''):'<span class="chip">Constant function</span>';
  $('truthTable').innerHTML=renderTruth();
  $('truthSummary').textContent=`${total} input combinations`;renderKmap();renderGroupingSteps();renderMainCircuit(expression);

 }catch(e){$('solverError').textContent=e.message}
}

let qmVariableCount=3,qmFormat='SOP';
function updateQmLabels(){const pos=qmFormat==='POS';$('qmIndexLabel').innerHTML=pos?'Maxterms <span class="label-note">where F = 0</span>':'Minterms <span class="label-note">where F = 1</span>'; $('qmIndexHint').textContent=pos?'Enter decimal maxterm indices separated by commas.':'Enter decimal minterm indices separated by commas.';}
function runIndependentQm(){
 const oldCount=variableCount; const oldFormat=format;
 try{
  variableCount=qmVariableCount;format=qmFormat;
  const total=1<<qmVariableCount,entered=parseIndices($('qmIndices').value,total),dc=parseIndices($('qmDontCares').value,total);
  if(entered.some(n=>dc.includes(n)))throw Error('An index cannot be both a required minterm/maxterm and a don’t-care.');
  if(!entered.length)throw Error('Enter at least one minterm or maxterm.');
  // The walkthrough groups the entered ON-set for SOP or entered OFF-set for POS.
  const targets=entered;
  const onSet=qmFormat==='SOP'?entered:Array.from({length:total},(_,n)=>n).filter(n=>!entered.includes(n)&&!dc.includes(n));
  const expr=buildExpression(onSet,dc,qmFormat);
  const names=VARS.slice(0,qmVariableCount);
  $('qmInputError').textContent='';
  $('qmCurrentInput').innerHTML=`<b>${qmFormat} · ${qmVariableCount} variables</b><span>${qmFormat==='POS'?'Entered maxterms (F = 0)':'Entered minterms (F = 1)'}: ${entered.join(', ')}</span>${dc.length?`<span>Don't-cares: ${dc.join(', ')}</span>`:''}<span>Minimized equation: <strong>F(${names.join(', ')}) = ${escapeHtml(expr)}</strong></span>`;
  let rows='<table><thead><tr>'+names.map(n=>`<th>${n}</th>`).join('')+'<th>Index</th><th>F</th></tr></thead><tbody>';
  for(let n=0;n<total;n++){const b=bits(n,qmVariableCount),out=entered.includes(n)?(qmFormat==='SOP'?'1':'0'):dc.includes(n)?'X':(qmFormat==='SOP'?'0':'1');rows+='<tr>'+[...b].map(v=>`<td>${v}</td>`).join('')+`<td>${n}</td><td class="${out==='1'?'out-one':out==='X'?'out-x':''}">${out}</td></tr>`;}
  $('qmTruthTable').innerHTML=rows+'</tbody></table>';
  $('qmCircuitDiagram').innerHTML=gateSvg(expr,names);$('qmCircuit').hidden=false;
  $('qmPageTrace').innerHTML=quineMcCluskeyTrace(targets,dc,qmFormat,names,'Your independent input · '+qmFormat+' derivation');
 }catch(e){$('qmInputError').textContent=e.message;$('qmPageTrace').innerHTML='<div class="qm-empty"><b>Waiting for valid input</b><p>Correct the input above, then run the algorithm again.</p></div>';$('qmTruthTable').innerHTML='';$('qmCircuit').hidden=true;}
 finally{variableCount=oldCount;format=oldFormat;}
}
document.querySelectorAll('#qmVarPicker button').forEach(btn=>btn.addEventListener('click',()=>{qmVariableCount=+btn.dataset.qmVars;document.querySelectorAll('#qmVarPicker button').forEach(x=>x.classList.toggle('selected',x===btn));}));
document.querySelectorAll('#qmFormatPicker button').forEach(btn=>btn.addEventListener('click',()=>{qmFormat=btn.dataset.qmFormat;document.querySelectorAll('#qmFormatPicker button').forEach(x=>x.classList.toggle('selected',x===btn));updateQmLabels();}));
$('qmSolveBtn').addEventListener('click',runIndependentQm);updateQmLabels();

function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function download(name,text,type='text/plain'){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url)}
function exportCsv(){const header=[...VARS.slice(0,variableCount),'Index','F'].join(','),lines=truthRows.map(r=>r.join(','));download('logiclab-truth-table.csv',[header,...lines].join('\n'),'text/csv')}
function openPage(page){
 document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.page===page));
 document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===page));
 // Reveal the destination page's cards for every navigation path, including in-page CTA buttons.
 // The observer-based reveal system is also refreshed on sidebar clicks; this prevents CTA navigation
 // from leaving reveal-ready cards at opacity: 0 when the Quine–McCluskey page is opened.
 document.querySelectorAll('.page.active .reveal-ready').forEach(el=>el.classList.add('in-view'));
 const text={solver:['K-map solver','Minimize Boolean functions with clear results and an explanation you can present.'],quine:['Quine–McCluskey algorithm','Follow the complete tabular minimization process for your own entered function.'],converters:['Code converters','Convert number systems and common digital codes in a few clicks.'],truth:['Truth table','Explore every possible input combination for your function.']}[page]||['LogicLab','Digital logic learning workspace'];
 $('pageTitle').textContent=text[0];$('pageSubtitle').textContent=text[1];window.scrollTo({top:0,behavior:'smooth'});
}
 document.querySelectorAll('.nav[data-page]').forEach(btn=>btn.addEventListener('click',()=>openPage(btn.dataset.page)));
 document.querySelectorAll('[data-open-page]').forEach(btn=>btn.addEventListener('click',()=>openPage(btn.dataset.openPage)));
document.querySelectorAll('#varPicker button').forEach(btn=>btn.addEventListener('click',()=>{variableCount=+btn.dataset.vars;document.querySelectorAll('#varPicker button').forEach(x=>x.classList.toggle('selected',x===btn));$('variableNames').innerHTML=VARS.slice(0,variableCount).map(v=>`<span>${v}</span>`).join('');solve()}));
document.querySelectorAll('#formatPicker button').forEach(btn=>btn.addEventListener('click',()=>{
 format=btn.dataset.format;
 document.querySelectorAll('#formatPicker button').forEach(x=>x.classList.toggle('selected',x===btn));
 updateFunctionInputLabels();
 solve();
}));
$('solveBtn').onclick=solve;$('minterms').addEventListener('change',solve);$('dontCares').addEventListener('change',solve);
$('exampleOdd').onclick=()=>{$('minterms').value=Array.from({length:1<<variableCount},(_,n)=>n).filter(n=>n%2).join(', ');$('dontCares').value='';solve()};
$('exampleMajority').onclick=()=>{variableCount=3;document.querySelector('#varPicker [data-vars="3"]').click();$('minterms').value='3, 5, 6, 7';$('dontCares').value='';solve()};
$('exampleBcd').onclick=()=>{document.querySelector('[data-page="converters"]').click();$('codeType').value='digitEx3';$('codeInput').value='5';convertCode()};
$('resetAll').onclick=()=>{variableCount=3;format='SOP';$('minterms').value='1, 3, 5, 7';$('dontCares').value='';document.querySelector('#varPicker [data-vars="3"]').click();document.querySelector('#formatPicker [data-format="SOP"]').click();$('numberInput').value='101101';$('fromBase').value='2';$('toBase').value='10';convertNumber();};
$('copyEquation').onclick=async()=>{const text=$('equation').textContent;try{await navigator.clipboard.writeText(text);$('copyEquation').textContent='Copied!';setTimeout(()=>$('copyEquation').textContent='Copy equation',1300)}catch{download('logiclab-equation.txt',text)}};
$('downloadEquation').onclick=()=>download('logiclab-equation.txt',$('equation').textContent+'\n\n'+$('explanation').textContent);
$('exportTruth').onclick=exportCsv;
function convertNumber(){
 const value=$('numberInput').value.trim(),from=+$('fromBase').value,to=+$('toBase').value;
 try{if(!value)throw Error('Enter a number first.');if(!/^[+-]?[0-9a-z]+$/i.test(value))throw Error('Use digits valid for the selected base.');const sign=value.startsWith('-')?-1:1,clean=value.replace(/^[+-]/,'');if([...clean.toLowerCase()].some(ch=>parseInt(ch,36)>=from))throw Error(`That value contains a digit invalid for base ${from}.`);const n=parseInt(value,from);if(!Number.isSafeInteger(n))throw Error('Please enter an integer within JavaScript’s safe range.');$('numberResult').textContent=n.toString(to).toUpperCase();$('numberError').textContent=''}catch(e){$('numberResult').textContent='—';$('numberError').textContent=e.message}
}
$('convertNumber').onclick=convertNumber;$('fromBase').onchange=convertNumber;$('toBase').onchange=convertNumber;$('numberInput').onkeydown=e=>{if(e.key==='Enter')convertNumber()};
$('showAllBases').onclick=()=>{const value=$('numberInput').value.trim(),from=+$('fromBase').value;try{const n=parseInt(value,from);if(!Number.isSafeInteger(n)||!value)throw Error();$('allBases').innerHTML=[[2,'BINARY'],[8,'OCTAL'],[10,'DECIMAL'],[16,'HEXADECIMAL']].map(([base,label])=>`<div class="base-item"><b>${label}</b>${n.toString(base).toUpperCase()}</div>`).join('')}catch{$('allBases').textContent='Enter a valid number for the selected source base.'}};
function binaryToGray(binary){return binary[0]+binary.slice(1).split('').map((bit,i)=>binary[i]===bit?'0':'1').join('')}
function grayToBinary(gray){let out=gray[0];for(let i=1;i<gray.length;i++)out+=out[i-1]===gray[i]?'0':'1';return out}
function isBits(s){return /^[01]+$/.test(s)}
function convertCode(){
 const type=$('codeType').value,value=$('codeInput').value.trim(),noSpaces=value.replace(/\s+/g,'');let output='',explanation='';
 try{
  if(['binGray','grayBin'].includes(type)){if(!isBits(noSpaces))throw Error('Enter binary bits only: 0 and 1.');output=type==='binGray'?binaryToGray(noSpaces):grayToBinary(noSpaces);explanation=type==='binGray'?'Keep the most significant bit. XOR each adjacent pair of binary bits for the remaining Gray bits.':'Keep the first bit. Each next binary bit is the previous decoded bit XOR the current Gray bit.'}
  else if(type==='binBcd'){if(!isBits(noSpaces))throw Error('Enter a non-negative binary integer.');const n=parseInt(noSpaces,2);output=String(n).split('').map(d=>(+d).toString(2).padStart(4,'0')).join(' ');explanation=`Binary ${noSpaces} equals decimal ${n}; encode each decimal digit as its own 4-bit BCD nibble.`}
  else if(type==='bcdBin'){if(!isBits(noSpaces)||noSpaces.length%4)throw Error('Enter BCD in groups of four bits, for example 0100 0101.');const ds=noSpaces.match(/.{4}/g).map(x=>parseInt(x,2));if(ds.some(d=>d>9))throw Error('Invalid 8421 BCD nibble. Valid digits are 0000 through 1001.');output=Number(ds.join('')).toString(2);explanation=`BCD digits ${ds.join(' ')} form decimal ${ds.join('')}, which is binary ${output}.`}
  else if(['digitBcd','digit8421','digitGray','digitEx3'].includes(type)){if(!/^\d$/.test(value))throw Error('Enter one decimal digit from 0 to 9.');const n=+value;if(type==='digitBcd'||type==='digit8421')output=n.toString(2).padStart(4,'0');if(type==='digitGray')output=binaryToGray(n.toString(2).padStart(4,'0'));if(type==='digitEx3')output=(n+3).toString(2).padStart(4,'0');explanation=type==='digitEx3'?`Excess-3 adds 3 to ${n}; ${n+3} in four-bit binary is ${output}.`:type==='digitGray'?`Encode ${n} as 4-bit binary, then XOR adjacent bits to obtain Gray code.`:'The converter uses a digit lookup table for this code convention.'}
  else if(type==='bcdDigit'){if(!isBits(noSpaces)||noSpaces.length!==4)throw Error('Enter exactly four BCD bits.');const n=parseInt(noSpaces,2);if(n>9)throw Error('Invalid 8421 BCD: this nibble is not a decimal digit.');output=String(n);explanation=`The 4-bit 8421 nibble ${noSpaces} represents decimal digit ${n}.`}
  else if(type==='grayDigit'){if(!isBits(noSpaces)||noSpaces.length!==4)throw Error('Enter exactly four Gray-code bits.');const n=parseInt(grayToBinary(noSpaces),2);if(n>9)throw Error('This Gray code decodes to a value outside decimal digits 0–9.');output=String(n);explanation=`Decode Gray ${noSpaces} to binary ${n.toString(2).padStart(4,'0')}, which is decimal digit ${n}.`}
  else if(type==='ex3Digit'){if(!isBits(noSpaces)||noSpaces.length!==4)throw Error('Enter exactly four Excess-3 bits.');const n=parseInt(noSpaces,2)-3;if(n<0||n>9)throw Error('This Excess-3 word does not represent a decimal digit.');output=String(n);explanation=`Subtract 3 from ${parseInt(noSpaces,2)} to recover decimal digit ${n}.`}
  $('codeResult').textContent=output;$('codeError').textContent='';$('codeExplanation').textContent=explanation;
 }catch(e){$('codeResult').textContent='Check input';$('codeError').textContent=e.message;$('codeExplanation').textContent='Correct the input format and try again.'}
}
$('convertCode').onclick=convertCode;
$('codeType').onchange=()=>{const t=$('codeType').value;const labels={binGray:'Input binary bits',grayBin:'Input Gray-code bits',binBcd:'Input binary integer',bcdBin:'Input BCD nibbles',digitBcd:'Input decimal digit',bcdDigit:'Input 4-bit BCD',digitGray:'Input decimal digit',grayDigit:'Input 4-bit Gray code',digitEx3:'Input decimal digit',ex3Digit:'Input 4-bit Excess-3',digit8421:'Input decimal digit'};const examples={binGray:'101101',grayBin:'111011',binBcd:'101101',bcdBin:'0100 0101',digitBcd:'5',bcdDigit:'0101',digitGray:'5',grayDigit:'0111',digitEx3:'5',ex3Digit:'1000',digit8421:'5'};$('codeInputLabel').textContent=labels[t];$('codeInput').value=examples[t];convertCode()};
function renderCodeReference(){let html='<table><thead><tr><th>Decimal</th><th>8421 BCD</th><th>Gray (4-bit)</th><th>Excess-3</th></tr></thead><tbody>';for(let n=0;n<10;n++)html+=`<tr><td>${n}</td><td>${n.toString(2).padStart(4,'0')}</td><td>${binaryToGray(n.toString(2).padStart(4,'0'))}</td><td>${(n+3).toString(2).padStart(4,'0')}</td></tr>`;$('codeReference').innerHTML=html+'</tbody></table>'}
renderCodeReference();updateFunctionInputLabels();solve();convertNumber();convertCode();


// Visual circuit renderer: a compact, readable gate-level block diagram.
function gateSvg(expression, variables=VARS.slice(0,variableCount)){
 const safe=escapeHtml(expression);
 const isPos=expression.startsWith('(');const terms=(expression==='0'||expression==='1')?[]:expression.split(isPos?' · ':' + ');
 const width=Math.max(560,variables.length*92+terms.length*135+150),height=Math.max(170,terms.length*62+70);
 let nodes=''; variables.forEach((v,i)=>{const y=42+i*32;nodes+=`<rect x="18" y="${y}" width="58" height="25" rx="8" fill="#eef2ff" stroke="#a5b4fc"/><text x="47" y="${y+17}" text-anchor="middle" class="svg-label">${v}</text>`;});
 if(expression==='0'||expression==='1') nodes+=`<path d="M80 72 H170" stroke="#64748b" stroke-width="2"/><rect x="170" y="45" width="100" height="54" rx="12" fill="#ecfdf5" stroke="#10b981"/><text x="220" y="78" text-anchor="middle" class="svg-label">${expression}</text>`;
 else {
  const count=terms.length, startY=35, gap=58;
  terms.forEach((term,i)=>{const y=startY+i*gap;const label=term.replaceAll("'",'′');nodes+=`<path d="M82 ${y+17} H135" stroke="#64748b" stroke-width="2"/><rect x="135" y="${y}" width="${Math.max(110,term.length*13+34)}" height="36" rx="10" fill="#eef2ff" stroke="#818cf8"/><text x="${135+Math.max(110,term.length*13+34)/2}" y="${y+23}" text-anchor="middle" class="svg-label">${escapeHtml(label)}</text><text x="${145+Math.max(110,term.length*13+34)}" y="${y+23}" class="svg-small">${isPos?'OR':'AND'}</text><path d="M${265+Math.max(0,term.length-6)*13} ${y+18} L${width-150} ${height/2}" stroke="#64748b" stroke-width="1.6" fill="none"/>`;});
  nodes+=`<rect x="${width-140}" y="${height/2-26}" width="100" height="52" rx="12" fill="#dcfce7" stroke="#16a34a"/><text x="${width-90}" y="${height/2+6}" text-anchor="middle" class="svg-label">${isPos?'AND':'OR'}</text><path d="M${width-40} ${height/2} H${width-12}" stroke="#16a34a" stroke-width="2.5"/><text x="${width-8}" y="${height/2-10}" class="svg-small">F</text>`;
 }
 return `<div class="circuit-scroll"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Logic gate diagram for ${safe}" xmlns="http://www.w3.org/2000/svg"><style>.svg-label{font:600 14px Manrope,Arial;fill:#24324a}.svg-small{font:600 11px Arial;fill:#64748b}</style>${nodes}</svg></div><div class="circuit-caption">Expression represented: <strong>${safe}</strong></div>`;
}
function renderMainCircuit(expression){const el=$('mainCircuit');if(el)el.innerHTML=gateSvg(expression);}
function converterRows(key){
 const rows=[];
 for(let n=0;n<16;n++){
  let out=null;
  if(key==='binGray'){const b=bits(n,4);out=binaryToGray(b)}
  else if(key==='grayBin'){out=grayToBinary(bits(n,4))}
  else if(key==='bcdGray'){if(n<=9)out=binaryToGray(bits(n,4))}
  else if(key==='grayBcd'){const d=parseInt(grayToBinary(bits(n,4)),2);if(d<=9)out=bits(d,4)}
  else if(key==='bcdEx3'){if(n<=9)out=bits(n+3,4)}
  else if(key==='ex3Bcd'){const d=n-3;if(d>=0&&d<=9)out=bits(d,4)}
  else if(key==='binBcdCircuit'){const d=n;out=bits(Math.floor(d/10),4)+bits(d%10,4)}
  else if(key==='bcdBinCircuit'){if(n<=9)out=bits(n,4)}
  if(out!==null)rows.push({input:n,bits:bits(n,4),out}); else rows.push({input:n,bits:bits(n,4),out:null});
 }
 return rows;
}
function converterKmap(values, label){
 const order=['00','01','11','10'];let html=`<div class="output-map"><h4>${label}</h4><table class="kmap mini-kmap"><thead><tr><th>AB\\CD</th>${order.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>`;
 for(const r of order){html+=`<tr><th>${r}</th>`;for(const c of order){const n=parseInt(r+c,2),v=values[n];html+=`<td class="${v===1?'k-one':v===null?'k-x':'k-zero'}">${v===null?'X':v}</td>`;}html+='</tr>';}return html+'</tbody></table></div>';
}
function renderConverterVisuals(key){
 const host=$('converterVisuals');if(!host)return;const rows=converterRows(key);const outputWidth=rows.find(r=>r.out!==null)?.out.length||4;let html='<div class="visual-panel converter-visual-panel"><div class="visual-panel-head"><div><span class="step">VISUAL 02</span><h3>Truth table, K-maps & circuit diagrams</h3></div><span class="micro-label">OUTPUT-BIT ANALYSIS</span></div><p class="subtle">Each output bit is treated as a separate Boolean function. X marks invalid input combinations only where the converter specification defines them as unused.</p><div class="converter-truth-wrap"><table><thead><tr><th>Input</th>'+Array.from({length:outputWidth},(_,i)=>`<th>Y${outputWidth-1-i}</th>`).join('')+'</tr></thead><tbody>'+rows.map(r=>`<tr><td>${r.bits}</td>${Array.from({length:outputWidth},(_,i)=>`<td>${r.out===null?'X':r.out[i]}</td>`).join('')}</tr>`).join('')+'</tbody></table></div><div class="output-map-grid">';
 const inputNames=key==='binGray'||key==='binBcdCircuit'?['B3','B2','B1','B0']:key==='grayBin'||key==='grayBcd'?['G3','G2','G1','G0']:key==='ex3Bcd'?['W','X','Y','Z']:['A','B','C','D'];
 for(let bit=0;bit<outputWidth;bit++){const vals=rows.map(r=>r.out===null?null:Number(r.out[bit]));const on=vals.map((v,i)=>v===1?i:-1).filter(i=>i>=0);const dc=vals.map((v,i)=>v===null?i:-1).filter(i=>i>=0);const old=variableCount;variableCount=4;const groups=chooseMinimumCover(on,dc);const expr=on.length===0?'0':groups.map(g=>sopTerm(g.pattern)).join(' + ')||'0';
 const qmHtml=quineMcCluskeyTrace(on,dc,'SOP',inputNames,`Converter output Y${outputWidth-1-bit}`);variableCount=old;
 html+=converterKmap(vals,`Output Y${outputWidth-1-bit} · Σm(${on.join(', ')})`)+`<div class="output-equation"><b>Y${outputWidth-1-bit} = ${escapeHtml(expr)}</b><small>Minimized SOP expression</small>${gateSvg(expr,inputNames)}</div>`+
 `<details class="qm-converter-details"><summary>Show Quine–McCluskey steps for Y${outputWidth-1-bit}</summary>${qmHtml}</details>`;
 }
 html+='</div><p class="tiny-note">For BCD-based converters, invalid BCD inputs 1010–1111 are displayed as don’t-cares. Confirm that your course assignment permits this assumption before using the minimized equations in a hardware design.</p></div>';
 host.innerHTML=html;
}

// Converter equation panel: equations are symbolic bit-level circuit equations.
const converterEquationData={
 binGray:{title:'Binary → Gray code',inputs:'Binary inputs: B3, B2, B1, B0',equations:['G3 = B3','G2 = B3 ⊕ B2','G1 = B2 ⊕ B1','G0 = B1 ⊕ B0'],note:'⊕ means XOR. The most significant bit stays the same; each remaining Gray bit is the XOR of adjacent binary bits.'},
 grayBin:{title:'Gray → Binary code',inputs:'Gray inputs: G3, G2, G1, G0',equations:['B3 = G3','B2 = B3 ⊕ G2 = G3 ⊕ G2','B1 = B2 ⊕ G1 = G3 ⊕ G2 ⊕ G1','B0 = B1 ⊕ G0 = G3 ⊕ G2 ⊕ G1 ⊕ G0'],note:'Each decoded binary bit is the XOR of the current Gray bit with the previously decoded binary bit.'},
 bcdGray:{title:'BCD (8421) → Gray code',inputs:'Valid BCD inputs: A, B, C, D (0000–1001)',equations:['For valid BCD digit d: first interpret ABCD as decimal d','Convert d to 4-bit binary B3B2B1B0','G3 = B3; G2 = B3 ⊕ B2','G1 = B2 ⊕ B1; G0 = B1 ⊕ B0'],note:'This is a code-conversion cascade, not a single direct BCD-bit equation set. For a combinational circuit, build the 10-row truth table and minimize each output bit using K-map; inputs 1010–1111 may be don’t-cares only if your assignment permits them.'},
 grayBcd:{title:'Gray code → BCD (8421)',inputs:'4-bit Gray input: G3, G2, G1, G0',equations:['B3 = G3','B2 = G3 ⊕ G2','B1 = G3 ⊕ G2 ⊕ G1','B0 = G3 ⊕ G2 ⊕ G1 ⊕ G0','Valid decimal BCD output is 0000–1001'],note:'Decode Gray to binary first. If the decoded value is 0–9, the same 4-bit word is its 8421 BCD representation. Gray values decoding to 10–15 are invalid for decimal-digit BCD.'},
 bcdEx3:{title:'BCD (8421) → Excess-3',inputs:'Inputs: A, B, C, D (valid BCD digit)',equations:['Create the truth table for digits 0–9','For each input digit d, output the 4-bit binary representation of d + 3','Minimize each output bit separately with a K-map','Use output bits W, X, Y, Z for the four Excess-3 bits'],note:'The exact minimized Boolean equations depend on output-bit naming and whether invalid BCD inputs 1010–1111 are treated as don’t-cares. Use the K-map solver with each output bit’s minterm list to obtain the equations for your chosen convention.'},
 ex3Bcd:{title:'Excess-3 → BCD (8421)',inputs:'Inputs: W, X, Y, Z (valid Excess-3 words 0011–1100)',equations:['Decode WXYZ as an integer n','BCD digit d = n − 3','Write d as A, B, C, D in 4-bit 8421 form','For circuit equations, minimize each output bit from the valid-code truth table'],note:'Invalid Excess-3 input combinations can be marked as don’t-cares only if permitted by the specification. The K-map solver can minimize each BCD output bit separately.'},
 binBcdCircuit:{title:'4-bit binary → BCD (0–15)',inputs:'Binary input: B3, B2, B1, B0 (0–15)',equations:['For values 0–9, the BCD tens digit is 0000 and ones digit is the input value in 8421','For values 10–15, tens digit is 0001 and ones digit is value − 10','A practical circuit can use compare/subtract logic or a minimized truth table per BCD output bit'],note:'A 4-bit binary input spans 0–15, so BCD output needs two digit nibbles. This differs from converting a decimal digit into a single BCD nibble.'},
 bcdBinCircuit:{title:'BCD (8421) → binary integer (0–9)',inputs:'BCD input: A, B, C, D',equations:['N = 8A + 4B + 2C + D','Binary output bits are the ordinary 4-bit representation of N','For a single valid decimal digit, the BCD nibble and 4-bit binary value have the same bit pattern'],note:'For a single decimal digit 0–9, 8421 BCD is numerically identical to 4-bit binary. For multi-digit decimal numbers, convert each BCD nibble to decimal first, then form the whole integer in binary.'},
};
function renderConverterEquations(){
 const key=$('equationConverter')?.value;if(!key)return;const item=converterEquationData[key];if(!item)return;
 $('equationDetails').innerHTML=`<div class="eq-group"><b>${escapeHtml(item.title.toUpperCase())}</b><div class="eq-note">${escapeHtml(item.inputs)}</div></div><div class="eq-group"><b>LOGIC EQUATIONS / DERIVATION</b>${item.equations.map(eq=>`<div class="eq-line">${escapeHtml(eq)}</div>`).join('')}</div><div class="eq-note">${escapeHtml(item.note)}</div>`;renderConverterVisuals(key);
}
$('equationConverter')?.addEventListener('change',renderConverterEquations);
$('copyConverterEquations')?.addEventListener('click',async()=>{const key=$('equationConverter').value,item=converterEquationData[key];const text=[item.title,item.inputs,...item.equations,'Note: '+item.note].join('\n');try{await navigator.clipboard.writeText(text);$('copyConverterEquations').textContent='Copied!';setTimeout(()=>$('copyConverterEquations').textContent='Copy equations',1200)}catch{download('converter-equations.txt',text)}});
renderConverterEquations();
