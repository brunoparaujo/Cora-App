"use strict";
(function(){
  const E=globalThis.CoraV48Engine, Core=globalThis.CoraV48IntegrationCore;
  if(!E||!Core){console.error("V4.8F4.3: engine/core ausentes");return;}
  const S={data:null,rawChild:null,currentPlan:null,currentPlanId:null,draft:null,step:1,climateResult:null,previews:{},previewEvaluations:{},selectedTier:null,autoShown:new Set(),busy:false};
  const DATA_BASE="/cora-engine/data/";
  function esc(s){return String(s??"").replace(/[&<>'\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'\"':"&quot;"}[c]));}
  function money(v){return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}
  async function loadJson(name){const r=await fetch(DATA_BASE+name,{cache:"no-cache"});if(!r.ok)throw new Error(`Falha ao carregar ${name}: ${r.status}`);return r.json();}
  async function loadData(){if(S.data)return S.data;const [catalog,pricing,rules,dependencyLock,onboardingConfig]=await Promise.all([loadJson("catalog.json"),loadJson("pricing.json"),loadJson("rules.json"),loadJson("dependencies.json"),loadJson("onboarding.config.json")]);S.data={catalog,pricing,rules,dependencyLock,onboardingConfig};return S.data;}
  function planId(tier){return `plan_${Date.now().toString(36)}_${tier}_${Math.random().toString(36).slice(2,7)}`;}
  function ensureUi(){
    if(document.getElementById("modalV48Planning"))return;
    document.body.insertAdjacentHTML("beforeend",`<div id="modalV48Planning" class="fixed inset-0 bg-black/55 backdrop-blur-sm z-[80] hidden flex items-end sm:items-center justify-center p-0 sm:p-4"><div class="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[94vh] overflow-y-auto shadow-2xl"><div class="sticky top-0 bg-white z-10 px-5 pt-5 pb-3 border-b border-gray-100"><div class="flex items-start justify-between gap-3"><div><p class="text-[10px] uppercase tracking-wider text-rose-500 font-bold">Planejamento V4.8</p><h3 class="font-bold text-gray-900 text-lg">Enxoval do primeiro ano</h3><p id="v48WizardProgress" class="text-[10px] text-gray-400 mt-1"></p></div><button type="button" onclick="CoraV48Integration.closeWizard()" class="p-2 text-gray-400"><i data-lucide="x" class="w-5 h-5"></i></button></div></div><div id="v48WizardBody" class="p-5"></div></div></div>`);
    if(!document.getElementById("modalV48HiddenSuggestions"))document.body.insertAdjacentHTML("beforeend",`<div id="modalV48HiddenSuggestions" class="fixed inset-0 bg-black/55 backdrop-blur-sm z-[85] hidden flex items-end sm:items-center justify-center p-0 sm:p-4"><div class="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl"><div class="sticky top-0 bg-white z-10 px-5 pt-5 pb-3 border-b border-gray-100 flex items-start justify-between gap-3"><div><p class="text-[10px] uppercase tracking-wider text-sky-600 font-bold">Sugestões</p><h3 class="font-bold text-gray-900 text-lg">Sugestões ocultadas</h3><p class="text-[10px] text-gray-500 mt-1">Você pode restaurar uma sugestão sem alterar aquisições existentes.</p></div><button type="button" onclick="CoraV48Integration.closeHiddenSuggestions()" class="p-2 text-gray-400"><i data-lucide="x" class="w-5 h-5"></i></button></div><div id="v48HiddenSuggestionsBody" class="p-5 space-y-2"></div></div></div>`);
    const appBlock=document.getElementById("settingsInstallAppButton")?.closest("div.border-t");
    if(appBlock&&!document.getElementById("settingsPlanningArea"))appBlock.insertAdjacentHTML("beforebegin",`<div id="settingsPlanningArea" class="border-t border-gray-100 pt-4 space-y-2"><div><p class="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Planejamento do enxoval</p><p id="settingsPlanningStatus" class="text-[10px] text-gray-500 mt-1">Carregando...</p></div><button type="button" onclick="closeModal('modalSettings'); CoraV48Integration.openWizard(true);" class="w-full py-3 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center gap-2"><i data-lucide="sparkles" class="w-4 h-4"></i> Revisar planejamento</button><button id="settingsReviewHiddenSuggestions" type="button" onclick="CoraV48Integration.openHiddenSuggestions()" class="w-full py-2.5 text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-100 rounded-xl flex items-center justify-center gap-2"><i data-lucide="eye" class="w-3.5 h-3.5"></i> Revisar sugestões ocultadas</button></div>`);
    lucide.createIcons();
  }
  function rawForWizard(){return S.rawChild||{};}
  function newDraft(){S.draft=Core.childFromFirebase(rawForWizard(),E.B.createChildDraft,Date.now());}
  function currentDecisionSnapshot(){
    return S.currentPlan?.decisionSnapshot||{acceptedOptionalItemIds:[],rejectedOptionalItemIds:[]};
  }
  function collectOptionalDecisions(){
    const snap=currentDecisionSnapshot();
    return {
      acceptedOptionalItemIds:[...(snap.acceptedOptionalItemIds||[])],
      rejectedOptionalItemIds:[...(snap.rejectedOptionalItemIds||[])]
    };
  }
  function currentFinanceOptions(){
    const a=S.currentPlan?.financeSnapshot?.assumptionsSnapshot||{};
    return {
      itemTierOverrides:Core.clone(a.itemTierOverrides||{}),
      variantOverrides:Core.clone(a.variantOverrides||{}),
      actualUnitPriceByItem:Core.clone(a.actualUnitPriceByItem||{}),
      diaperSizeByAgeMonth:Core.clone(a.diaperSizeByAgeMonth||{}),
      hybridDisposableRatio:a.hybridDisposableRatio===undefined?null:a.hybridDisposableRatio
    };
  }
  function climateResultFromCurrentPlan(){
    const c=S.currentPlan?.climateSnapshot;
    if(c?.applied&&c?.thermalProfile){
      return {status:"climate_personalized",thermalProfile:Core.clone(c.thermalProfile),cacheHit:true,climateRecord:{cacheKey:c.cacheKey||null}};
    }
    return {status:c?.status||"climate_component_unavailable"};
  }
  function openWizard(force=false){ensureUi();newDraft();S.step=1;S.climateResult=null;S.previews={};S.previewEvaluations={};S.selectedTier=null;document.getElementById("modalV48Planning").classList.remove("hidden");renderStep();}
  function closeWizard(){document.getElementById("modalV48Planning")?.classList.add("hidden");}
  function progress(){return ["Sobre o bebê","Clima","Rotina","Resultado"][S.step-1]||"";}
  function input(id){return document.getElementById(id);}
  function renderStep(){const body=input("v48WizardBody");if(!body)return;input("v48WizardProgress").textContent=`Etapa ${S.step} de 4 • ${progress()}`;if(S.step===1)renderBaby(body);else if(S.step===2)renderClimate(body);else if(S.step===3)renderRoutine(body);else renderResult(body);lucide.createIcons();}
  function nav(back=true,nextLabel="Continuar",next="CoraV48Integration.nextStep()") {return `<div class="pt-5 flex gap-2">${back?`<button type="button" onclick="CoraV48Integration.backStep()" class="w-1/3 py-3 text-xs font-bold text-gray-600 bg-gray-100 rounded-xl">Voltar</button>`:""}<button type="button" onclick="${next}" class="${back?"w-2/3":"w-full"} py-3 text-xs font-bold text-white bg-rose-600 rounded-xl">${nextLabel}</button></div>`;}
  function renderBaby(body){const p=S.draft.profile||{},s=S.draft.enxoval?.settings||{};const stage=p.lifeStage||"expecting";body.innerHTML=`<div class="space-y-4"><div><label class="text-xs font-bold text-gray-700">Momento</label><select id="v48LifeStage" onchange="CoraV48Integration.toggleLifeDate()" class="mt-1 w-full p-3 text-sm bg-gray-50 border border-gray-200 rounded-xl"><option value="expecting" ${stage==="expecting"?"selected":""}>Ainda estamos esperando o bebê</option><option value="born" ${stage==="born"?"selected":""}>O bebê já nasceu</option></select></div><div id="v48DueWrap"><label class="text-xs font-bold text-gray-700">DPP</label><input id="v48DueDate" type="date" value="${esc(p.dueDate||"")}" class="mt-1 w-full p-3 text-sm bg-gray-50 border border-gray-200 rounded-xl"></div><div id="v48BirthWrap" class="hidden"><label class="text-xs font-bold text-gray-700">Data de nascimento</label><input id="v48BirthDate" type="date" value="${esc(p.birthDate||"")}" class="mt-1 w-full p-3 text-sm bg-gray-50 border border-gray-200 rounded-xl"></div><div><label class="text-xs font-bold text-gray-700">Estilo do enxoval</label><div class="grid grid-cols-3 gap-2 mt-1">${[["girl","Menina"],["boy","Menino"],["neutral","Neutro"]].map(([v,l])=>`<label class="border rounded-xl p-3 text-center text-xs cursor-pointer"><input type="radio" name="v48Style" value="${v}" class="mr-1" ${(s.styleProfile||"neutral")===v?"checked":""}>${l}</label>`).join("")}</div></div>${nav(false)}</div>`;toggleLifeDate();}
  function toggleLifeDate(){const born=input("v48LifeStage")?.value==="born";input("v48DueWrap")?.classList.toggle("hidden",born);input("v48BirthWrap")?.classList.toggle("hidden",!born);}
  function renderClimate(body){const s=S.draft.enxoval?.settings||{},l=s.climateLocation||{};body.innerHTML=`<div class="space-y-4"><p class="text-xs text-gray-500">Use a cidade onde o bebê passará a maior parte do primeiro ano. Não precisamos de endereço.</p><div class="grid grid-cols-[1fr_90px] gap-2"><div><label class="text-xs font-bold text-gray-700">Cidade</label><input id="v48City" value="${esc(l.city||"")}" placeholder="Ex.: Niterói" class="mt-1 w-full p-3 text-sm bg-gray-50 border border-gray-200 rounded-xl"></div><div><label class="text-xs font-bold text-gray-700">UF</label><input id="v48State" value="${esc(l.state||"")}" maxlength="2" placeholder="RJ" class="mt-1 w-full p-3 text-sm uppercase bg-gray-50 border border-gray-200 rounded-xl"></div></div><div><label class="text-xs font-bold text-gray-700">Ar-condicionado no ambiente do bebê</label><select id="v48Ac" class="mt-1 w-full p-3 text-sm bg-gray-50 border border-gray-200 rounded-xl"><option value="none" ${s.airConditioning==="none"?"selected":""}>Não usamos / raramente</option><option value="sometimes" ${s.airConditioning==="sometimes"?"selected":""}>Às vezes</option><option value="frequent" ${s.airConditioning==="frequent"?"selected":""}>Frequentemente</option></select></div>${nav()}</div>`;}
  function renderRoutine(body){const s=S.draft.enxoval?.settings||{},car=s.car||{usesCar:false};body.innerHTML=`<div class="space-y-4"><div><label class="text-xs font-bold text-gray-700">A família usará carro com o bebê?</label><select id="v48UsesCar" onchange="CoraV48Integration.toggleIsofix()" class="mt-1 w-full p-3 text-sm bg-gray-50 border border-gray-200 rounded-xl"><option value="false" ${!car.usesCar?"selected":""}>Não</option><option value="true" ${car.usesCar?"selected":""}>Sim</option></select></div><div id="v48IsofixWrap" class="hidden"><label class="text-xs font-bold text-gray-700">O carro tem ISOFIX?</label><select id="v48Isofix" class="mt-1 w-full p-3 text-sm bg-gray-50 border border-gray-200 rounded-xl"><option value="yes" ${car.hasIsofix==="yes"?"selected":""}>Sim</option><option value="no" ${car.hasIsofix==="no"?"selected":""}>Não</option><option value="unknown" ${!car.hasIsofix||car.hasIsofix==="unknown"?"selected":""}>Não sei</option></select></div><div><label class="text-xs font-bold text-gray-700">Quantidade de roupas</label><select id="v48Reserve" class="mt-1 w-full p-3 text-sm bg-gray-50 border border-gray-200 rounded-xl"><option value="compact" ${s.clothingReserve==="compact"?"selected":""}>Enxuta</option><option value="standard" ${!s.clothingReserve||s.clothingReserve==="standard"?"selected":""}>Padrão</option><option value="roomy" ${s.clothingReserve==="roomy"?"selected":""}>Mais folga</option></select></div><div><label class="text-xs font-bold text-gray-700">Fraldas</label><select id="v48Diaper" class="mt-1 w-full p-3 text-sm bg-gray-50 border border-gray-200 rounded-xl"><option value="disposable" ${!s.diaperingMode||s.diaperingMode==="disposable"?"selected":""}>Descartáveis</option><option value="cloth" ${s.diaperingMode==="cloth"?"selected":""}>Pano / ecológicas</option><option value="hybrid" ${s.diaperingMode==="hybrid"?"selected":""}>Uso misto</option></select></div>${nav(true,"Calcular meu enxoval")}</div>`;toggleIsofix();}
  function toggleIsofix(){input("v48IsofixWrap")?.classList.toggle("hidden",input("v48UsesCar")?.value!=="true");}
  function renderResult(body){
    if(S.busy){body.innerHTML=`<div class="py-12 text-center"><div class="w-9 h-9 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin mx-auto"></div><p class="text-sm font-bold text-gray-700 mt-4">Montando os três cenários...</p><p class="text-xs text-gray-400 mt-1">Clima, quantidades, orçamento e calendário</p></div>`;return;}
    const tiers=[["economic","Econômico"],["intermediate","Intermediário"],["premium","Premium"]];
    body.innerHTML=`<div class="space-y-4"><div><h4 class="font-bold text-gray-900">Escolha uma referência de gasto</h4><p class="text-xs text-gray-500 mt-1">As faixas representam nível de gasto, não qualidade. Você poderá ajustar itens individualmente depois.</p></div><div class="space-y-2">${tiers.map(([v,l])=>{const p=S.previews[v],sum=Core.planBudgetSummary(p||{}),checked=(S.selectedTier||"intermediate")===v;return `<label class="block border ${checked?"border-rose-400 bg-rose-50":"border-gray-200"} rounded-2xl p-4 cursor-pointer"><div class="flex items-center gap-3"><input type="radio" name="v48Budget" value="${v}" ${checked?"checked":""} onchange="CoraV48Integration.chooseTier('${v}')"><div class="flex-1"><p class="text-sm font-bold text-gray-800">${l}</p><p class="text-lg font-black text-rose-700">${money(sum.knownTotalBRL)}</p><p class="text-[9px] text-gray-400">${sum.complete?"estimativa completa":`${sum.unresolvedCount} item(ns) ainda sem valor definido`} • ${sum.plannedItems} planejados • ${sum.suggestions} sugestões</p></div></div></label>`;}).join("")}</div><div class="rounded-xl bg-blue-50 border border-blue-100 p-3 text-[10px] text-blue-800">${S.climateResult?.status==="climate_personalized"?"Clima personalizado aplicado com climatologia histórica da cidade.":"O clima não pôde ser aplicado agora; o plano usa composição equilibrada e continua funcional."}</div>${nav(true,"Usar este planejamento","CoraV48Integration.commitSelected()")}</div>`;}
  function chooseTier(t){S.selectedTier=t;renderStep();}
  function showError(err){console.error(err);alert(err?.message||String(err));}
  async function nextStep(){try{
    if(S.step===1){const stage=input("v48LifeStage").value,style=document.querySelector('input[name="v48Style"]:checked')?.value||"neutral";S.draft=E.B.applyBabyStep(S.draft,{lifeStage:stage,styleProfile:style,dueDate:input("v48DueDate")?.value||undefined,birthDate:input("v48BirthDate")?.value||undefined},Date.now(),Core.todayIso());S.step=2;renderStep();return;}
    if(S.step===2){S.draft=E.B.applyClimateStep(S.draft,{city:input("v48City").value,state:input("v48State").value,countryCode:"BR",airConditioning:input("v48Ac").value},Date.now());S.step=3;renderStep();return;}
    if(S.step===3){const usesCar=input("v48UsesCar").value==="true";S.draft=E.B.applyRoutineStep(S.draft,{usesCar,hasIsofix:usesCar?input("v48Isofix").value:undefined,clothingReserve:input("v48Reserve").value,diaperingMode:input("v48Diaper").value},Date.now());S.step=4;S.busy=true;renderStep();await computePreviews();S.busy=false;renderStep();}
  }catch(e){S.busy=false;showError(e);renderStep();}}
  function backStep(){if(S.step>1){S.step--;renderStep();}}
  async function resolveClimate(){const familyId=activeFamilyId();const loc=S.draft.enxoval.settings.climateLocation;const cacheGet=async key=>(await db.ref(`families/${familyId}/climateCache/${key}`).once("value")).val();const cacheSet=async(key,val)=>db.ref(`families/${familyId}/climateCache/${key}`).set(val);return E.ClimatePipeline.buildPlanWithOptionalClimate({child:S.draft,climateLocation:loc,climatePersonalizationEnabled:true,climateProvider:E.Climate,thermalEngine:E.Thermal,clothingEngine:E.Clothing,providerOptions:{cacheGet,cacheSet}});}
  async function generateTier(tier,{decisions=null,climateResult=null,forceReason=null,financeOptions=null}={}){const complete=E.B.selectBudgetTier(S.draft,tier,Date.now());const eligibility=E.B.validateChild(complete,{todayIso:Core.todayIso()});const parent=S.currentPlan;const effectiveDecisions=decisions||collectOptionalDecisions();const effectiveFinance=financeOptions||currentFinanceOptions();const effectiveClimate=climateResult||S.climateResult;const next=Core.nextComponents(E.D1,complete,effectiveDecisions,true,effectiveClimate);const reason=forceReason||(parent?Core.inferLineageReason(parent,next):"initial");const draft=E.D1.createPlanDraft({planId:planId(tier),familyId:activeFamilyId(),childId:activeChildId(),child:complete,eligibility,dependencyLock:S.data.dependencyLock,climatePersonalizationEnabled:true,climateResult:effectiveClimate,decisions:effectiveDecisions,lineage:parent?{reason,parentPlanId:parent.planId}:{reason:"initial",parentPlanId:null},createdAt:Date.now(),createdByUid:auth.currentUser?.uid||null});const d2=E.D2.generatePlanContent({draft,catalog:S.data.catalog,rules:S.data.rules,pricing:S.data.pricing});const after=E.D2.applyD2ResultToDraft(draft,d2);return {child:complete,evaluation:d2.evaluation,summary:d2.summary,plan:E.D3.finalizePlanWithD3({draft:after,pricing:S.data.pricing,catalog:S.data.catalog,options:{...effectiveFinance,asOfDate:Core.todayIso()},completedAt:Date.now()})};}
  async function computePreviews(){await loadData();S.climateResult=await resolveClimate();const tiers=["economic","intermediate","premium"];const out={};for(const t of tiers)out[t]=await generateTier(t);S.previews=Object.fromEntries(tiers.map(t=>[t,out[t].plan]));S.previewChildren=Object.fromEntries(tiers.map(t=>[t,out[t].child]));S.previewEvaluations=Object.fromEntries(tiers.map(t=>[t,out[t].evaluation||{}]));S.selectedTier=S.draft.enxoval.settings.budgetTier!=="unselected"?S.draft.enxoval.settings.budgetTier:"intermediate";}
  async function activatePlanCas(plan){const familyId=activeFamilyId(),childId=activeChildId();const planRef=db.ref(E.D1.firebasePlanPath(familyId,childId,plan.planId));const created=await planRef.transaction(cur=>cur?undefined:plan);if(!created.committed)throw new Error("PLAN_ID_ALREADY_EXISTS");const currentRef=db.ref(E.D1.firebaseCurrentPlanPath(familyId,childId));const expected=S.currentPlanId||null;const switched=await currentRef.transaction(cur=>{const normalized=cur||null;if(normalized!==expected)return;return plan.planId;});if(!switched.committed)throw new Error("STALE_CURRENT_PLAN: outro aparelho atualizou o planejamento antes deste.");}
  async function syncOperationalItems(plan,evaluation={}){const ref=db.ref(childPath("enxoval/items"));await ref.transaction(cur=>Core.buildOperationalItems(plan,cur||{},Date.now(),{catalog:S.data.catalog,pricing:S.data.pricing,budgetTier:plan?.financeSnapshot?.budgetTier,itemTierOverrides:plan?.financeSnapshot?.assumptionsSnapshot?.itemTierOverrides||{},evaluation}));}
  async function rebuildCurrentPlan({decisions=null,financeOptions=null,reason="other"}={}){
    if(S.busy)throw new Error("Já existe uma atualização de planejamento em andamento.");
    S.busy=true;
    try{
      await loadData();
      S.draft=Core.childFromFirebase(rawForWizard(),E.B.createChildDraft,Date.now());
      const tier=S.draft?.enxoval?.settings?.budgetTier;
      if(!["economic","intermediate","premium"].includes(tier))throw new Error("Escolha uma faixa de orçamento antes de atualizar o planejamento.");
      const climateResult=climateResultFromCurrentPlan();
      const generated=await generateTier(tier,{decisions:decisions||collectOptionalDecisions(),financeOptions:financeOptions||currentFinanceOptions(),climateResult,forceReason:reason});
      await activatePlanCas(generated.plan);
      await syncOperationalItems(generated.plan,generated.evaluation||{});
      S.currentPlan=generated.plan;
      S.currentPlanId=generated.plan.planId;
      return generated.plan;
    }finally{
      S.busy=false;
    }
  }
  async function rebuildCurrentPlanWithDecisions(decisions){return rebuildCurrentPlan({decisions,financeOptions:currentFinanceOptions(),reason:"optional_decision_changed"});}
  async function setOptionalDecision(itemId,action){
    await loadData();
    const id=String(itemId||"").trim();
    if(!id)throw new Error("Item opcional inválido.");
    const decisions=collectOptionalDecisions();
    const accepted=new Set(decisions.acceptedOptionalItemIds||[]);
    const rejected=new Set(decisions.rejectedOptionalItemIds||[]);
    if(action==="accept"){accepted.add(id);rejected.delete(id);}
    else if(action==="reject"){rejected.add(id);accepted.delete(id);}
    else if(action==="clear"){accepted.delete(id);rejected.delete(id);}
    else throw new Error("Ação de decisão inválida.");
    return rebuildCurrentPlanWithDecisions({acceptedOptionalItemIds:[...accepted],rejectedOptionalItemIds:[...rejected]});
  }
  async function setItemTierOverride(itemId,tier){
    await loadData();
    const id=String(itemId||"").trim();
    if(!id)throw new Error("Item inválido para faixa de preço.");
    const allowed=new Set(["economic","intermediate","premium"]);
    if(tier!==null&&tier!=="inherit"&&!allowed.has(tier))throw new Error("Faixa de preço inválida.");
    const options=currentFinanceOptions();
    const overrides={...(options.itemTierOverrides||{})};
    if(tier===null||tier==="inherit")delete overrides[id]; else overrides[id]=tier;
    options.itemTierOverrides=overrides;
    return rebuildCurrentPlan({decisions:collectOptionalDecisions(),financeOptions:options,reason:"budget_changed"});
  }
  async function setDiaperSizeForAgeMonth(ageMonth,size){
    await loadData();
    const month=Number(ageMonth);if(!Number.isInteger(month)||month<0||month>11)throw new Error("Fase de fralda inválida.");
    const allowed=new Set(Core.DIAPER_SIZE_KEYS||["RN","P","M","G","XG","XXG"]);const normalized=String(size||"").trim().toUpperCase();
    if(normalized&&normalized!=="CLEAR"&&!allowed.has(normalized))throw new Error("Tamanho de fralda inválido.");
    const options=currentFinanceOptions();const map={...(options.diaperSizeByAgeMonth||{})};
    if(!normalized||normalized==="CLEAR")delete map[String(month)];else map[String(month)]=normalized;
    options.diaperSizeByAgeMonth=map;
    return rebuildCurrentPlan({decisions:collectOptionalDecisions(),financeOptions:options,reason:"other"});
  }
  async function setHybridDisposableRatio(value){
    await loadData();const raw=value===null||value===""||value==="clear"?null:Number(value);
    if(raw!==null&&(!Number.isFinite(raw)||raw<0||raw>1))throw new Error("Proporção de fraldas descartáveis inválida.");
    const options=currentFinanceOptions();options.hybridDisposableRatio=raw;
    return rebuildCurrentPlan({decisions:collectOptionalDecisions(),financeOptions:options,reason:"other"});
  }
  async function rebuildCurrentPlanWithSettingsPatch(patch){
    if(S.busy)throw new Error("Já existe uma atualização de planejamento em andamento.");
    S.busy=true;
    try{
      await loadData();
      const child=Core.childFromFirebase(rawForWizard(),E.B.createChildDraft,Date.now());
      child.enxoval.settings={...(child.enxoval.settings||{}),...(patch||{})};
      S.draft=child;
      const tier=child.enxoval.settings?.budgetTier;
      if(!["economic","intermediate","premium"].includes(tier))throw new Error("Escolha uma faixa de orçamento antes de atualizar a rotina.");
      const climateResult=climateResultFromCurrentPlan();
      const generated=await generateTier(tier,{decisions:collectOptionalDecisions(),financeOptions:currentFinanceOptions(),climateResult,forceReason:"settings_changed"});
      await activatePlanCas(generated.plan);
      await syncOperationalItems(generated.plan,generated.evaluation||{});
      await db.ref(childPath("enxoval/settings")).set(generated.child.enxoval.settings);
      S.currentPlan=generated.plan;S.currentPlanId=generated.plan.planId;
      S.rawChild=S.rawChild||{};S.rawChild.enxoval=S.rawChild.enxoval||{};S.rawChild.enxoval.settings=Core.clone(generated.child.enxoval.settings);
      return generated.plan;
    }finally{S.busy=false;}
  }
  async function setFeedingMode(mode){
    const allowed=new Set(["undecided","direct_breastfeeding","expressed_milk","mixed","formula"]);if(!allowed.has(mode))throw new Error("Rotina de alimentação inválida.");
    return rebuildCurrentPlanWithSettingsPatch({feedingMode:mode});
  }
  function closeHiddenSuggestions(){document.getElementById("modalV48HiddenSuggestions")?.classList.add("hidden");}
  function renderHiddenSuggestions(){
    ensureUi();
    const body=document.getElementById("v48HiddenSuggestionsBody");if(!body)return;
    const rejected=currentDecisionSnapshot().rejectedOptionalItemIds||[];
    const byId=Object.fromEntries((S.data?.catalog?.items||[]).map(x=>[x.id,x]));
    body.innerHTML=rejected.length?rejected.map(id=>{const item=byId[id]||{name:id,category:""};return `<div class="rounded-xl border border-gray-100 bg-gray-50 p-3 flex items-center justify-between gap-3"><div class="min-w-0"><strong class="block text-xs text-gray-800">${esc(item.name||id)}</strong><span class="block text-[9px] text-gray-400 mt-0.5">${esc(item.category||"")}</span></div><button type="button" onclick="CoraV48Integration.restoreHiddenSuggestion('${esc(id)}')" class="shrink-0 px-3 py-2 rounded-lg bg-sky-600 text-white text-[10px] font-bold">Restaurar</button></div>`;}).join(""):`<div class="text-center py-8"><p class="text-xs font-semibold text-gray-600">Nenhuma sugestão ocultada.</p><p class="text-[10px] text-gray-400 mt-1">Itens ocultados por você aparecerão aqui.</p></div>`;
    lucide.createIcons();
  }
  async function openHiddenSuggestions(){await loadData();ensureUi();renderHiddenSuggestions();document.getElementById("modalV48HiddenSuggestions")?.classList.remove("hidden");}
  async function restoreHiddenSuggestion(itemId){
    try{const plan=await setOptionalDecision(itemId,"clear");S.currentPlan=plan;S.currentPlanId=plan.planId;renderHiddenSuggestions();}
    catch(e){showError(e);}
  }
  function getData(){return S.data;}
  async function commitSelected(){if(S.busy)return;let stage="preparação";try{S.busy=true;const tier=S.selectedTier||"intermediate",plan=S.previews[tier],child=S.previewChildren?.[tier],evaluation=S.previewEvaluations?.[tier]||{};if(!plan||!child)throw new Error("Cenário ainda não calculado.");stage="ativação do plano";await activatePlanCas(plan);stage="salvamento do perfil";await db.ref().update({[childPath("profile")]:Core.firebaseProfile(child),[childPath("enxoval/onboarding")]:child.enxoval.onboarding,[childPath("enxoval/settings")]:child.enxoval.settings});stage="sincronização dos itens";await syncOperationalItems(plan,evaluation);closeWizard();alert("Planejamento atualizado. Itens planejados, sugestões e itens conforme sua rotina foram sincronizados sem alterar aquisições existentes.");}catch(e){console.error("V4.8F4.1 commit failed at",stage,e);showError(new Error(`${stage}: ${e?.message||e}`));}finally{S.busy=false;}}
  function thermalIcon(c){return ({very_hot:"sun",hot:"sun-medium",mild:"cloud-sun",cold:"cloud",very_cold:"snowflake"})[c]||"thermometer";}
  function renderPlanUi(raw,plan){const header=document.getElementById("headerContext");if(header)header.textContent=Core.buildHeaderText(raw);const widget=document.getElementById("coraSeasonWidget");if(widget){const cards=Core.thermalCards(plan),periods=plan?.climateSnapshot?.thermalProfile?.agePeriods||{};widget.classList.remove("hidden");widget.innerHTML=`<div class="flex items-center text-gray-600 mb-2 font-medium"><span class="flex items-center gap-1"><i data-lucide="calendar-range" class="w-3.5 h-3.5 text-rose-500"></i> Clima ao longo do primeiro ano</span></div><div class="grid grid-cols-5 gap-1">${cards.map(c=>{const p=periods[c.size]||{};const min=Number.isFinite(Number(p.weightedMeanMinTempC))?Math.round(Number(p.weightedMeanMinTempC)):null;const max=Number.isFinite(Number(p.weightedMeanMaxTempC))?Math.round(Number(p.weightedMeanMaxTempC)):null;const mean=c.meanTempC===null?null:Math.round(Number(c.meanTempC));const temp=min!==null&&max!==null?`${min}–${max}°`:(mean===null?"—":`${mean}°`);return `<div class="p-1.5 rounded-lg bg-gray-50 border border-gray-100 text-center"><span class="block text-[10px] font-bold text-gray-600">${c.size}</span><i data-lucide="${thermalIcon(c.thermalClass)}" class="w-3.5 h-3.5 mx-auto my-0.5 text-gray-400"></i><span class="block text-[11px] font-bold text-gray-800">${temp}</span></div>`;}).join("")}</div>`;}
    const st=document.getElementById("settingsPlanningStatus");if(st){if(plan){const b=Core.planBudgetSummary(plan);st.textContent=`Plano ${plan.planId} • ${b.plannedItems} planejados • ${b.suggestions} sugestões • referência ${money(b.knownTotalBRL)}${b.complete?"":" (parcial)"}`;}else st.textContent="Este perfil ainda não tem um plano V4.8 ativo.";}lucide.createIcons();}
  function onChildSnapshot(raw){S.rawChild=raw||{};S.currentPlanId=raw?.enxoval?.currentPlanId||null;S.currentPlan=S.currentPlanId?raw?.enxoval?.plans?.[S.currentPlanId]||null:null;ensureUi();renderPlanUi(raw,S.currentPlan);const complete=raw?.enxoval?.onboarding?.status==="complete"&&raw?.enxoval?.onboarding?.currentStep==="done"&&S.currentPlan;if(!complete){const key=`${activeFamilyId()}:${activeChildId()}`;if(!S.autoShown.has(key)){S.autoShown.add(key);setTimeout(()=>openWizard(false),150);}}}
  async function init(){ensureUi();try{await loadData();}catch(e){console.error("V4.8 data load failed",e);}const prior=window.onload; /* index invokes init via explicit hook too; harmless */ }
  globalThis.CoraV48Integration={init,onChildSnapshot,openWizard,closeWizard,nextStep,backStep,toggleLifeDate,toggleIsofix,chooseTier,commitSelected,setOptionalDecision,setItemTierOverride,setDiaperSizeForAgeMonth,setHybridDisposableRatio,setFeedingMode,openHiddenSuggestions,closeHiddenSuggestions,restoreHiddenSuggestion,getData};
  ensureUi();
})();
