"use strict";
(function(root,factory){
  if(typeof module==="object"&&module.exports) module.exports=factory();
  else root.CoraV48IntegrationCore=factory();
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const SIZE_KEYS=["RN","P","M","G","GG","U"];
  const PLAN_SIZES=["RN","P","M","G","GG"];
  const CATEGORY_MAP={vestuario:"vestuario",quarto:"quarto",banho_higiene:"higiene",alimentacao:"alimentacao",passeio:"passeio",mamae:"mamae"};
  const VERSION="4.8F4.1";
  const VARIANT_LABELS={manga_curta:"manga curta",manga_longa:"manga longa",macaquinho_curto:"macaquinho curto",macacao_longo:"macacão longo",calca_culote:"calça / culote",short:"short"};
  const VISIBLE_DISPOSITIONS=new Set(["planned","suggested","deferred"]);
  const OPERATIONAL_VARIANT_NAMES={
    body:{manga_curta:"Body manga curta",manga_longa:"Body manga longa"},
    peca_inteira:{macaquinho_curto:"Macaquinho curto",macacao_longo:"Macacão longo"},
    parte_baixo:{calca_culote:"Calça / culote",short:"Short"},
    parte_cima_separada:{manga_curta:"Camiseta manga curta",manga_longa:"Camiseta manga longa"}
  };
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
  function pricingEntry(pricing,pricingKey){
    return pricingKey ? (pricing?.priceReferences?.[pricingKey]||null) : null;
  }
  function resolveReferenceUnitPrice(planItem,pricing,budgetTier){
    const key=planItem?.identitySnapshot?.pricingKey||null;
    const entry=pricingEntry(pricing,key);
    if(!entry)return {pricingKey:key,unitReferenceBRL:null,status:"unresolved",reason:"pricing_key_not_found"};
    const tier=["economic","intermediate","premium"].includes(budgetTier)?budgetTier:(pricing?.metadata?.defaultTier||"intermediate");
    const selectedVariant=planItem?.target?.variant?.selectedVariant||entry.budgetVariant||null;
    if(selectedVariant && entry.variantPricing?.[selectedVariant]?.[tier]){
      const row=entry.variantPricing[selectedVariant][tier];
      return {pricingKey:key,unitReferenceBRL:isNum(row?.reference)?Number(row.reference):null,status:isNum(row?.reference)?"resolved":"unresolved",tier,variant:selectedVariant,confidence:entry.confidence||null};
    }
    const row=entry?.[tier];
    return {pricingKey:key,unitReferenceBRL:isNum(row?.reference)?Number(row.reference):null,status:isNum(row?.reference)?"resolved":"unresolved",tier,variant:selectedVariant,confidence:entry.confidence||null};
  }
  function financeReferenceForPlanItem(planItem,pricing,budgetTier){
    const r=resolveReferenceUnitPrice(planItem,pricing,budgetTier);
    return {pricing:r};
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
  function variantLabel(key){return VARIANT_LABELS[key]||String(key||"").replaceAll("_"," ");}
  function operationalVariantId(itemId,key){return `${itemId}__${key}`;}
  function operationalVariantName(itemId,parentName,key){return OPERATIONAL_VARIANT_NAMES[itemId]?.[key]||`${parentName} ${variantLabel(key)}`;}
  function variantOnlyTarget(target,key){
    if(target?.kind!=="by_size")return clone(target);
    const out=clone(target);
    out.sizes={};
    for(const size of PLAN_SIZES){
      const src=clone(target.sizes?.[size]||{});
      src.total=Math.max(0,Number(target.sizes?.[size]?.variants?.[key]||0));
      src.variants={};
      out.sizes[size]=src;
    }
    out.operationalVariantKey=key;
    return out;
  }
  function mergeAcquisitions(...sources){
    const out={};
    for(const src of sources) for(const [id,acq] of Object.entries(src||{})) out[id]=clone(acq);
    return out;
  }
  function splitParentAcquisitions(existingParent,variantKeys){
    const byVariant=Object.fromEntries((variantKeys||[]).map(k=>[k,{}]));
    const unclassified={};
    for(const [id,acq] of Object.entries(existingParent?.acquisitions||{})){
      if(acq?.variant&&Object.prototype.hasOwnProperty.call(byVariant,acq.variant)) byVariant[acq.variant][id]=clone(acq);
      else unclassified[id]=clone(acq);
    }
    return {byVariant,unclassified};
  }
  function variantTargetKeys(target){
    if(target?.kind!=="by_size")return [];
    const keys=[];
    for(const size of PLAN_SIZES){
      for(const key of Object.keys(target.sizes?.[size]?.variants||{})) if(!keys.includes(key)) keys.push(key);
    }
    return keys;
  }
  function hasVariantTargets(target){return variantTargetKeys(target).length>0;}
  function variantTargetsForSize(target,size){
    const out={};
    if(target?.kind!=="by_size"||!PLAN_SIZES.includes(size))return out;
    for(const key of variantTargetKeys(target)) out[key]=Math.max(0,Number(target.sizes?.[size]?.variants?.[key]||0));
    return out;
  }
  function variantProgress(target,acquisitions,size){
    const targets=variantTargetsForSize(target,size);
    const keys=Object.keys(targets);
    const ownedByVariant=Object.fromEntries(keys.map(k=>[k,0]));
    let actual=0,unclassified=0;
    for(const acq of Object.values(acquisitions||{})){
      if(acq?.size!==size)continue;
      const qty=Math.max(0,Number(acq.quantity)||0);
      actual+=qty;
      if(acq.variant&&Object.prototype.hasOwnProperty.call(ownedByVariant,acq.variant)) ownedByVariant[acq.variant]+=qty;
      else unclassified+=qty;
    }
    const credited=keys.reduce((sum,key)=>sum+Math.min(ownedByVariant[key],targets[key]),0);
    const targetTotal=keys.reduce((sum,key)=>sum+targets[key],0);
    const missingByVariant=Object.fromEntries(keys.map(k=>[k,Math.max(0,targets[k]-ownedByVariant[k])]));
    const extraByVariant=Object.fromEntries(keys.map(k=>[k,Math.max(0,ownedByVariant[k]-targets[k])]));
    return {size,targets,ownedByVariant,missingByVariant,extraByVariant,targetTotal,credited,actual,unclassified};
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
      pricingKey:planItem.identitySnapshot?.pricingKey||null,
      referenceTier:financeItem?.pricing?.tier||null,
      planningSnapshot:clone(planItem.planningSnapshot||{}),
      recommendationSnapshot:clone(target),
      planDisposition:disposition,
      planReason:planItem.inclusionSnapshot?.reason||null,
      countsTowardPlan
    };
  }
  function planVariantToOperational(planItem,financeItem,planId,variantKey,existingChild=null,migratedAcquisitions={},now=Date.now()){
    const parentId=planItem.itemId;
    const parentName=planItem.identitySnapshot?.name||parentId;
    const childId=operationalVariantId(parentId,variantKey);
    const childName=operationalVariantName(parentId,parentName,variantKey);
    const childPlanItem=clone(planItem);
    childPlanItem.itemId=childId;
    childPlanItem.identitySnapshot={...(clone(planItem.identitySnapshot)||{}),name:childName};
    childPlanItem.target=variantOnlyTarget(planItem.target,variantKey);
    const out=planItemToOperational(childPlanItem,financeItem,planId,existingChild,now,"planned");
    out.acquisitions=mergeAcquisitions(migratedAcquisitions,existingChild?.acquisitions||{});
    out.operationalVariantKey=variantKey;
    out.sourceFamilyId=parentId;
    out.sourceFamilyName=parentName;
    out.recommendationSnapshot=clone(childPlanItem.target);
    return out;
  }
  function legacyUnclassifiedOperational(planItem,financeItem,planId,acquisitions,existingParent=null,now=Date.now()){
    const parentId=planItem.itemId;
    const parentName=planItem.identitySnapshot?.name||parentId;
    const out=planItemToOperational(planItem,financeItem,planId,existingParent,now,"inactive");
    out.name=`${parentName} — variação não informada`;
    out.sizes=zeroOperationalSizes();
    out.acquisitions=clone(acquisitions||{});
    out.countsTowardPlan=false;
    out.retainedPurchaseHistory=true;
    out.legacyUnclassifiedVariant=true;
    out.sourceFamilyId=parentId;
    out.sourceFamilyName=parentName;
    out.recommendationSnapshot={kind:"legacy_unclassified",sourceFamilyId:parentId};
    out.planReason="legacy_acquisition_without_variant";
    return out;
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
      unitEstimate:isNum(evaluation?.unitReferenceBRL)?Number(evaluation.unitReferenceBRL):null,
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
      pricingKey:item.pricingKey||null,
      referenceTier:evaluation?.referenceTier||null,
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
    const pricing=context?.pricing||null;
    const budgetTier=context?.budgetTier||plan?.financeSnapshot?.budgetTier||plan?.inputSnapshot?.settings?.budgetTier||pricing?.metadata?.defaultTier||"intermediate";
    const itemTierOverrides=context?.itemTierOverrides||plan?.financeSnapshot?.assumptionsSnapshot?.itemTierOverrides||{};
    const catalogItems=context?.catalog?.items||[];
    const catalogById=Object.fromEntries(catalogItems.map(x=>[x.id,x]));
    const consumedCurrentIds=new Set();

    for(const [id,p] of Object.entries(planned)){
      const keys=variantTargetKeys(p?.target);
      if(keys.length){
        const parentExisting=currentItems?.[id]||null;
        const partition=splitParentAcquisitions(parentExisting,keys);
        consumedCurrentIds.add(id);
        for(const key of keys){
          const childId=operationalVariantId(id,key);
          out[childId]=planVariantToOperational(
            p,finance[id],plan.planId,key,currentItems?.[childId]||null,partition.byVariant[key]||{},now
          );
        }
        if(Object.keys(partition.unclassified).length){
          out[id]=legacyUnclassifiedOperational(p,finance[id],plan.planId,partition.unclassified,parentExisting,now);
        }
      }else{
        out[id]=planItemToOperational(p,finance[id],plan.planId,currentItems?.[id]||null,now,"planned");
      }
    }
    for(const [id,p] of Object.entries(suggestions)){
      const effectiveTier=itemTierOverrides[id]||budgetTier;
      const refFinance=financeReferenceForPlanItem(p,pricing,effectiveTier);
      out[id]=planItemToOperational(p,refFinance,plan.planId,currentItems?.[id]||null,now,"suggested");
    }

    for(const [id,e] of Object.entries(evaluation)){
      if(e?.disposition!=="deferred"||out[id])continue;
      const item=catalogById[id];
      if(item){
        const pseudoPlanItem={identitySnapshot:{pricingKey:item.pricingKey},target:{}};
        const effectiveTier=itemTierOverrides[id]||budgetTier;
        const ref=resolveReferenceUnitPrice(pseudoPlanItem,pricing,effectiveTier);
        out[id]=catalogItemToDeferredOperational(item,{...e,unitReferenceBRL:ref.unitReferenceBRL,referenceTier:ref.tier||effectiveTier},plan.planId,currentItems?.[id]||null,now);
      }
    }

    for(const [id,item] of Object.entries(currentItems||{})){
      if(out[id]||consumedCurrentIds.has(id))continue;
      if(item?.source==="v4.8-generated"){
        const baseId=item?.sourceFamilyId||id;
        const nextDisposition=evaluation?.[baseId]?.disposition||evaluation?.[id]?.disposition||null;
        if(hasAcquisitions(item)){
          const kept=zeroTargets(item);
          kept.retainedPurchaseHistory=true;
          kept.updatedAt=now;
          kept.revision=Math.max(0,Number(kept.revision)||0)+1;
          kept.sourcePlanId=plan?.planId||kept.sourcePlanId||null;
          if(nextDisposition)kept.planDisposition=nextDisposition;
          kept.planReason=evaluation?.[baseId]?.reason||evaluation?.[id]?.reason||kept.planReason||"retained_purchase_history";
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
  return {VERSION,SIZE_KEYS,PLAN_SIZES,CATEGORY_MAP,VISIBLE_DISPOSITIONS,VARIANT_LABELS,OPERATIONAL_VARIANT_NAMES,clone,isNum,todayIso,categoryToLegacy,totalTarget,pricingEntry,resolveReferenceUnitPrice,financeReferenceForPlanItem,operationalSizes,zeroOperationalSizes,sizeModeForTarget,variantText,variantLabel,operationalVariantId,operationalVariantName,variantOnlyTarget,mergeAcquisitions,splitParentAcquisitions,variantTargetKeys,hasVariantTargets,variantTargetsForSize,variantProgress,planItemToOperational,planVariantToOperational,legacyUnclassifiedOperational,catalogItemToDeferredOperational,buildOperationalItems,childFromFirebase,firebaseProfile,buildHeaderText,planBudgetSummary,nextComponents,inferLineageReason,thermalCards};
});
