"use strict";
(function(root,factory){
  if(typeof module==="object"&&module.exports) module.exports=factory();
  else root.CoraV48IntegrationCore=factory();
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const SIZE_KEYS=["RN","P","M","G","GG","U"];
  const PLAN_SIZES=["RN","P","M","G","GG"];
  const CATEGORY_MAP={vestuario:"vestuario",quarto:"quarto",banho_higiene:"higiene",alimentacao:"alimentacao",passeio:"passeio",mamae:"mamae"};
  const VARIANT_LABELS={manga_curta:"manga curta",manga_longa:"manga longa",macaquinho_curto:"macaquinho curto",macacao_longo:"macacão longo",calca_culote:"calça/culote",short:"short",camiseta:"camiseta",blusa_manga_longa:"blusa manga longa"};
  const VISIBLE_DISPOSITIONS=new Set(["planned","suggested","deferred"]);
  function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
  function isNum(v){return v!==null&&v!==undefined&&v!==""&&Number.isFinite(Number(v));}
  function todayIso(){return new Date().toISOString().slice(0,10);}
  function categoryToLegacy(v){return CATEGORY_MAP[v]||v||"vestuario";}
  function totalTarget(target){
    if(!target)return 0;
    if(target.kind==="single")return isNum(target.quantity)?Number(target.quantity):0;
    if(target.kind==="recurring")return isNum(target.initialStockQuantity)?Number(target.initialStockQuantity):0;
    if(target.kind==="by_size")return PLAN_SIZES.reduce((s,k)=>s+Number(target.sizes?.[k]?.total||0),0);
    if(target.kind==="by_phase")return (target.phases||[]).reduce((s,p)=>s+Number(p.quantity??p.total??0),0);
    return 0;
  }
  function operationalSizes(target){
    const out=Object.fromEntries(SIZE_KEYS.map(k=>[k,{target:0}]));
    if(!target)return out;
    if(target.kind==="by_size") for(const s of PLAN_SIZES) out[s].target=Math.max(0,Number(target.sizes?.[s]?.total||0));
    else out.U.target=Math.max(0,totalTarget(target));
    return out;
  }
  function zeroOperationalSizes(){return Object.fromEntries(SIZE_KEYS.map(k=>[k,{target:0}]));}
  function sizeModeForTarget(target){return target?.kind==="by_size"?"multi":"unique";}
  function variantText(target){
    if(target?.kind!=="by_size")return "";
    const rows=[];
    for(const s of PLAN_SIZES){
      const x=target.sizes?.[s]; if(!x||Number(x.total||0)<=0)continue;
      const vars=Object.entries(x.variants||{}).filter(([,n])=>Number(n)>0);
      if(!vars.length)continue;
      rows.push(`${s}: ${vars.map(([k,n])=>`${VARIANT_LABELS[k]||k} ${n}`).join(" • ")}`);
    }
    return rows.join(" | ");
  }
  function planItemToOperational(planItem,financeItem,planId,existing=null,now=Date.now(),dispositionOverride=null){
    const target=planItem.target||{};
    const disposition=dispositionOverride||planItem.inclusionSnapshot?.disposition||"planned";
    const acquisitions=clone(existing?.acquisitions||{});
    const vtext=variantText(target);
    const notes=[...(planItem.planningSnapshot?.notes||[])];
    if(vtext)notes.unshift(`Distribuição recomendada — ${vtext}`);
    let unitEstimate=null;
    if(isNum(financeItem?.pricing?.unitReferenceBRL))unitEstimate=Number(financeItem.pricing.unitReferenceBRL);
    const carSeat = planItem.itemId === "bebe_conforto";
    const selectedVariant = target.variant?.selectedVariant || financeItem?.pricing?.variant;
    const name = carSeat ? (selectedVariant === "com_isofix" ? "Bebê conforto com ISOFIX" : "Bebê conforto") : (planItem.identitySnapshot?.name||planItem.itemId);
    const countsTowardPlan=disposition==="planned";
    return {
      id:planItem.itemId,
      name,
      category:categoryToLegacy(planItem.identitySnapshot?.category),
      essential:planItem.identitySnapshot?.priority==="essential",
      notes:notes.join("\n"),
      sizeMode:sizeModeForTarget(target),
      unitEstimate,
      sizes:countsTowardPlan?operationalSizes(target):zeroOperationalSizes(),
      acquisitions,
      revision:Math.max(0,Number(existing?.revision)||0)+1,
      createdAt:Number(existing?.createdAt)||now,
      updatedAt:now,
      source:"v4.8-generated",
      sourcePlanId:planId,
      priority:planItem.identitySnapshot?.priority||null,
      goalType:planItem.identitySnapshot?.goalType||null,
      quantityUnit:planItem.identitySnapshot?.quantityUnit||"un",
      planningSnapshot:clone(planItem.planningSnapshot||{}),
      recommendationSnapshot:clone(target),
      planDisposition:disposition,
      planReason:planItem.inclusionSnapshot?.reason||null,
      countsTowardPlan
    };
  }
  function catalogItemToDeferredOperational(item,evaluation,planId,existing=null,now=Date.now()){
    const acquisitions=clone(existing?.acquisitions||{});
    const quantity=isNum(item?.defaultQuantity)&&Number(item.defaultQuantity)>0?Number(item.defaultQuantity):null;
    return {
      id:item.id,
      name:item.name||item.id,
      category:categoryToLegacy(item.category),
      essential:item.priority==="essential",
      notes:(item.notes||[]).join("\n"),
      sizeMode:"unique",
      unitEstimate:null,
      sizes:zeroOperationalSizes(),
      acquisitions,
      revision:Math.max(0,Number(existing?.revision)||0)+1,
      createdAt:Number(existing?.createdAt)||now,
      updatedAt:now,
      source:"v4.8-generated",
      sourcePlanId:planId,
      priority:item.priority||"conditional",
      goalType:item.goalType||null,
      quantityUnit:item.quantityUnit||"un",
      planningSnapshot:{
        itemType:item.itemType||null,
        useFromAgeMonths:item.useFromAgeMonths??null,
        useUntilAgeMonths:item.useUntilAgeMonths??null,
        purchaseTiming:item.purchaseTiming||null,
        purchaseLeadDays:item.purchaseLeadDays??null,
        climateSensitivity:item.climateSensitivity||null,
        recurringCost:Boolean(item.recurringCost),
        budgetEligibility:item.budgetEligibility||null,
        usagePolicy:item.usagePolicy||null,
        conditions:clone(item.conditions||[]),
        variantOptions:clone(item.variants||[]),
        notes:clone(item.notes||[])
      },
      recommendationSnapshot:{kind:"deferred",defaultQuantity:quantity,requiresUserInput:true},
      planDisposition:"deferred",
      planReason:evaluation?.reason||"condition_unresolved",
      conditionState:evaluation?.conditionState||"unresolved",
      countsTowardPlan:false
    };
  }
  function hasAcquisitions(item){return item?.acquisitions&&Object.keys(item.acquisitions).length>0;}
  function zeroTargets(item){const x=clone(item);x.sizes=x.sizes||{};for(const k of SIZE_KEYS)x.sizes[k]={target:0};x.countsTowardPlan=false;return x;}
  function buildOperationalItems(plan,currentItems={},now=Date.now(),context={}){
    const out={};
    const planned=plan?.generatedSnapshot?.items||{};
    const suggestions=plan?.generatedSnapshot?.suggestions||{};
    const finance=plan?.financeSnapshot?.initialLayette?.items||{};
    const evaluation=context?.evaluation||{};
    const catalogItems=context?.catalog?.items||[];
    const catalogById=Object.fromEntries(catalogItems.map(x=>[x.id,x]));

    for(const [id,p] of Object.entries(planned)) out[id]=planItemToOperational(p,finance[id],plan.planId,currentItems?.[id]||null,now,"planned");
    for(const [id,p] of Object.entries(suggestions)) out[id]=planItemToOperational(p,null,plan.planId,currentItems?.[id]||null,now,"suggested");

    for(const [id,e] of Object.entries(evaluation)){
      if(e?.disposition!=="deferred"||out[id])continue;
      const item=catalogById[id];
      if(item)out[id]=catalogItemToDeferredOperational(item,e,plan.planId,currentItems?.[id]||null,now);
    }

    for(const [id,item] of Object.entries(currentItems||{})){
      if(out[id])continue;
      if(item?.source==="v4.8-generated"){
        const nextDisposition=evaluation?.[id]?.disposition||null;
        if(hasAcquisitions(item)){
          const kept=zeroTargets(item);
          kept.retainedPurchaseHistory=true;
          kept.updatedAt=now;
          kept.revision=Math.max(0,Number(kept.revision)||0)+1;
          kept.sourcePlanId=plan?.planId||kept.sourcePlanId||null;
          if(nextDisposition)kept.planDisposition=nextDisposition;
          kept.planReason=evaluation?.[id]?.reason||kept.planReason||"retained_purchase_history";
          out[id]=kept;
        }
      }else out[id]=clone(item); // manual/legacy items are never silently deleted by a replan
    }
    return out;
  }
  function childFromFirebase(raw,createChildDraft,now=Date.now()){
    const name=String(raw?.profile?.name||raw?.profile?.babyName||"Bebê").trim()||"Bebê";
    if(raw?.profile?.lifeStage&&raw?.enxoval?.onboarding&&raw?.enxoval?.settings){
      const x={profile:clone(raw.profile),enxoval:{onboarding:clone(raw.enxoval.onboarding),settings:clone(raw.enxoval.settings)}};
      x.profile.name=name; return x;
    }
    return createChildDraft(name,now);
  }
  function firebaseProfile(child){const p=clone(child.profile||{});p.name=String(p.name||"Bebê");p.babyName=p.name;return p;}
  function buildHeaderText(raw){
    const p=raw?.profile||{},s=raw?.enxoval?.settings||{};const name=p.babyName||p.name||"Bebê";const bits=[];
    if(p.lifeStage==="expecting"&&p.dueDate)bits.push(`DPP: ${p.dueDate.split("-").reverse().join("/")}`);
    if(p.lifeStage==="born"&&p.birthDate)bits.push(`Nascimento: ${p.birthDate.split("-").reverse().join("/")}`);
    if(s.climateLocation?.city)bits.push(`${s.climateLocation.city}${s.climateLocation.state?", "+s.climateLocation.state:""}`);
    return bits.length?`${name} • ${bits.join(" • ")}`:`Perfil: ${name}`;
  }
  function planBudgetSummary(plan){const f=plan?.financeSnapshot?.initialLayette||{};return {knownTotalBRL:Number(f.knownTotalBRL||0),complete:f.complete===true,unresolvedCount:(f.unresolvedItemIds||[]).length,plannedItems:Object.keys(plan?.generatedSnapshot?.items||{}).length,suggestions:Object.keys(plan?.generatedSnapshot?.suggestions||{}).length};}
  function nextComponents(D1,child,decisions,climateEnabled,climateResult){return {inputSnapshot:D1.buildInputSnapshot(child),decisionSnapshot:D1.buildDecisionSnapshot(decisions||{}),climateSnapshot:D1.buildClimateSnapshot({climatePersonalizationEnabled:climateEnabled,climateResult})};}
  function eq(a,b){return JSON.stringify(a)===JSON.stringify(b);}
  function profileDates(i){return {lifeStage:i?.profile?.lifeStage||null,dueDate:i?.profile?.dueDate||null,birthDate:i?.profile?.birthDate||null,referenceDate:i?.referenceDate||null,referenceDateSource:i?.referenceDateSource||null};}
  function inferLineageReason(previousPlan,next){
    if(!previousPlan)return "initial";
    const p=previousPlan.inputSnapshot||{},n=next.inputSnapshot||{};const pd=profileDates(p),nd=profileDates(n);
    if(pd.lifeStage==="expecting"&&nd.lifeStage==="born")return "born_transition";
    const budget=(p.settings?.budgetTier||null)!==(n.settings?.budgetTier||null);
    const dates=!eq(pd,nd);const decisions=!eq(previousPlan.decisionSnapshot||{},next.decisionSnapshot||{});
    const settingKeys=["climateLocation","clothingReserve","styleProfile","airConditioning","car","diaperingMode","feedingMode"];
    const settings=settingKeys.some(k=>!eq(p.settings?.[k]??null,n.settings?.[k]??null))||!eq(previousPlan.climateSnapshot||{},next.climateSnapshot||{});
    const count=[budget,dates,decisions,settings].filter(Boolean).length;
    if(count===0)return "manual_recalculate";if(count>1)return "other";if(budget)return "budget_changed";if(dates)return "date_changed";if(decisions)return "optional_decision_changed";return "settings_changed";
  }
  function thermalCards(plan){
    const periods=plan?.climateSnapshot?.thermalProfile?.agePeriods||{};const labels={RN:"RN",P:"P",M:"M",G:"G",GG:"GG"};
    return PLAN_SIZES.map(s=>{const p=periods[s];return {size:s,label:labels[s],from:p?.from||null,toExclusive:p?.toExclusive||null,meanTempC:isNum(p?.weightedMeanTempC)?Number(p.weightedMeanTempC):null,thermalClass:p?.dominantThermalClass||null,mixed:Boolean(p?.mixedSeason)};});
  }
  return {SIZE_KEYS,PLAN_SIZES,CATEGORY_MAP,VISIBLE_DISPOSITIONS,clone,isNum,todayIso,categoryToLegacy,totalTarget,operationalSizes,zeroOperationalSizes,sizeModeForTarget,variantText,planItemToOperational,catalogItemToDeferredOperational,buildOperationalItems,childFromFirebase,firebaseProfile,buildHeaderText,planBudgetSummary,nextComponents,inferLineageReason,thermalCards};
});
