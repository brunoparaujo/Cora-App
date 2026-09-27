"use strict";
// Generated integration bundle: wraps frozen modules without changing their internal logic.
globalThis.CoraV48Engine = globalThis.CoraV48Engine || {};

(function(){
  const module={exports:{}};
  const exports=module.exports;
  const require = (id) => { throw new Error("Unexpected browser require in B: "+id); };

"use strict";

const ENUMS = Object.freeze({
  lifeStage: ["expecting", "born"],
  styleProfile: ["girl", "boy", "neutral"],
  airConditioning: ["none", "sometimes", "frequent"],
  hasIsofix: ["yes", "no", "unknown"],
  clothingReserve: ["compact", "standard", "roomy"],
  diaperingMode: ["disposable", "cloth", "hybrid"],
  feedingMode: ["undecided", "direct_breastfeeding", "expressed_milk", "mixed", "formula"],
  budgetTier: ["unselected", "economic", "intermediate", "premium"],
  onboardingStatus: ["not_started", "in_progress", "complete"],
  onboardingStep: ["baby", "climate", "routine", "result", "done"]
});

const DEFAULTS = Object.freeze({
  clothingReserve: "standard",
  diaperingMode: "disposable",
  feedingMode: "undecided",
  budgetTier: "unselected",
  countryCode: "BR"
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertEnum(name, value) {
  if (!ENUMS[name].includes(value)) {
    throw new Error(`${name} inválido: ${value}`);
  }
}

function isIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y,m,d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function dayNumber(value) {
  const [y,m,d] = value.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
}

function compareIsoDate(a, b) {
  return dayNumber(a) - dayNumber(b);
}

function monthsBetween(startDate, endDate) {
  const [sy,sm,sd] = startDate.split("-").map(Number);
  const [ey,em,ed] = endDate.split("-").map(Number);
  let months = (ey - sy) * 12 + (em - sm);
  if (ed < sd) months -= 1;
  return months;
}

function createChildDraft(name, nowMs = Date.now()) {
  if (!name || !String(name).trim()) throw new Error("Nome da criança é obrigatório.");
  return {
    profile: {
      name: String(name).trim(),
      createdAt: nowMs,
      updatedAt: nowMs
    },
    enxoval: {
      onboarding: {
        schemaVersion: 1,
        status: "not_started",
        currentStep: "baby",
        startedAt: nowMs,
        updatedAt: nowMs
      },
      settings: {
        clothingReserve: DEFAULTS.clothingReserve,
        diaperingMode: DEFAULTS.diaperingMode,
        feedingMode: DEFAULTS.feedingMode,
        budgetTier: DEFAULTS.budgetTier
      }
    }
  };
}

function applyBabyStep(child, input, nowMs = Date.now(), todayIso = new Date().toISOString().slice(0,10)) {
  const next = clone(child);
  assertEnum("lifeStage", input.lifeStage);
  assertEnum("styleProfile", input.styleProfile);
  next.profile.lifeStage = input.lifeStage;
  next.enxoval.settings.styleProfile = input.styleProfile;

  if (input.lifeStage === "expecting") {
    if (!isIsoDate(input.dueDate)) throw new Error("DPP/dueDate inválida.");
    next.profile.dueDate = input.dueDate;
    delete next.profile.birthDate;
  } else {
    if (!isIsoDate(input.birthDate)) throw new Error("birthDate inválida.");
    if (compareIsoDate(input.birthDate, todayIso) > 0) throw new Error("birthDate não pode estar no futuro.");
    next.profile.birthDate = input.birthDate;
    if (input.dueDate !== undefined) {
      if (!isIsoDate(input.dueDate)) throw new Error("dueDate histórica inválida.");
      next.profile.dueDate = input.dueDate;
    }
  }
  next.profile.updatedAt = nowMs;
  next.enxoval.onboarding.status = "in_progress";
  next.enxoval.onboarding.currentStep = "climate";
  next.enxoval.onboarding.updatedAt = nowMs;
  return next;
}

function applyClimateStep(child, input, nowMs = Date.now()) {
  const next = clone(child);
  if (!input.city || !String(input.city).trim()) throw new Error("Cidade é obrigatória.");
  if (!input.state || !String(input.state).trim()) throw new Error("UF/estado é obrigatório.");
  const countryCode = String(input.countryCode || DEFAULTS.countryCode).toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) throw new Error("countryCode inválido.");
  assertEnum("airConditioning", input.airConditioning);

  next.enxoval.settings.climateLocation = {
    city: String(input.city).trim(),
    state: String(input.state).trim().toUpperCase(),
    countryCode
  };
  next.enxoval.settings.airConditioning = input.airConditioning;
  next.enxoval.onboarding.status = "in_progress";
  next.enxoval.onboarding.currentStep = "routine";
  next.enxoval.onboarding.updatedAt = nowMs;
  return next;
}

function applyRoutineStep(child, input, nowMs = Date.now()) {
  const next = clone(child);
  if (typeof input.usesCar !== "boolean") throw new Error("usesCar deve ser boolean.");
  if (input.usesCar) {
    assertEnum("hasIsofix", input.hasIsofix);
    next.enxoval.settings.car = { usesCar: true, hasIsofix: input.hasIsofix };
  } else {
    next.enxoval.settings.car = { usesCar: false };
  }
  const reserve = input.clothingReserve || DEFAULTS.clothingReserve;
  const diaper = input.diaperingMode || DEFAULTS.diaperingMode;
  assertEnum("clothingReserve", reserve);
  assertEnum("diaperingMode", diaper);
  next.enxoval.settings.clothingReserve = reserve;
  next.enxoval.settings.diaperingMode = diaper;
  next.enxoval.settings.feedingMode = DEFAULTS.feedingMode;
  next.enxoval.settings.budgetTier = DEFAULTS.budgetTier;
  next.enxoval.onboarding.status = "in_progress";
  next.enxoval.onboarding.currentStep = "result";
  next.enxoval.onboarding.updatedAt = nowMs;
  return next;
}

function selectBudgetTier(child, tier, nowMs = Date.now()) {
  if (tier === "unselected") throw new Error("É necessário escolher uma faixa de orçamento para concluir.");
  assertEnum("budgetTier", tier);
  const next = clone(child);
  next.enxoval.settings.budgetTier = tier;
  next.enxoval.onboarding.status = "complete";
  next.enxoval.onboarding.currentStep = "done";
  next.enxoval.onboarding.updatedAt = nowMs;
  next.enxoval.onboarding.completedAt = nowMs;
  return next;
}

function transitionToBorn(child, birthDate, nowMs = Date.now(), todayIso = new Date().toISOString().slice(0,10)) {
  if (!isIsoDate(birthDate)) throw new Error("birthDate inválida.");
  if (compareIsoDate(birthDate, todayIso) > 0) throw new Error("birthDate não pode estar no futuro.");
  const next = clone(child);
  next.profile.lifeStage = "born";
  next.profile.birthDate = birthDate;
  // dueDate histórica, se existir, é deliberadamente preservada.
  next.profile.updatedAt = nowMs;
  return next;
}

function getReferenceDate(child) {
  if (child?.profile?.lifeStage === "born") return child.profile.birthDate || null;
  return child?.profile?.dueDate || null;
}

function validateChild(child, options = {}) {
  const todayIso = options.todayIso || new Date().toISOString().slice(0,10);
  const errors = [];
  const warnings = [];
  const p = child?.profile || {};
  const e = child?.enxoval || {};
  const s = e.settings || {};
  const o = e.onboarding || {};

  if (!p.name || !String(p.name).trim()) errors.push("profile.name ausente");
  if (!ENUMS.lifeStage.includes(p.lifeStage)) errors.push("profile.lifeStage inválido/ausente");

  if (p.lifeStage === "expecting") {
    if (!isIsoDate(p.dueDate)) errors.push("expecting exige dueDate válida");
    else if (compareIsoDate(p.dueDate, todayIso) < 0) warnings.push("DUE_DATE_IN_PAST_REQUIRES_CONFIRMATION");
    if (p.birthDate !== undefined) errors.push("expecting não deve armazenar birthDate");
  }
  if (p.lifeStage === "born") {
    if (!isIsoDate(p.birthDate)) errors.push("born exige birthDate válida");
    else {
      if (compareIsoDate(p.birthDate, todayIso) > 0) errors.push("birthDate futura");
      if (compareIsoDate(p.birthDate, todayIso) <= 0 && monthsBetween(p.birthDate, todayIso) >= 12) {
        warnings.push("PLANNING_HORIZON_0_12_EXCEEDED");
      }
    }
    if (p.dueDate !== undefined && !isIsoDate(p.dueDate)) errors.push("dueDate histórica inválida");
  }

  if (!ENUMS.styleProfile.includes(s.styleProfile)) errors.push("styleProfile inválido/ausente");
  if (!s.climateLocation?.city) errors.push("climateLocation.city ausente");
  if (!s.climateLocation?.state) errors.push("climateLocation.state ausente");
  if (!s.climateLocation?.countryCode) errors.push("climateLocation.countryCode ausente");
  if (!ENUMS.airConditioning.includes(s.airConditioning)) errors.push("airConditioning inválido/ausente");
  if (!ENUMS.clothingReserve.includes(s.clothingReserve)) errors.push("clothingReserve inválido/ausente");
  if (!ENUMS.diaperingMode.includes(s.diaperingMode)) errors.push("diaperingMode inválido/ausente");
  if (!ENUMS.feedingMode.includes(s.feedingMode)) errors.push("feedingMode inválido/ausente");
  if (!ENUMS.budgetTier.includes(s.budgetTier)) errors.push("budgetTier inválido/ausente");

  if (!s.car || typeof s.car.usesCar !== "boolean") errors.push("car.usesCar inválido/ausente");
  else if (s.car.usesCar) {
    if (!ENUMS.hasIsofix.includes(s.car.hasIsofix)) errors.push("usa carro exige hasIsofix yes/no/unknown");
  } else if (Object.prototype.hasOwnProperty.call(s.car, "hasIsofix")) {
    errors.push("hasIsofix deve ser removido quando usesCar=false");
  }

  if (!ENUMS.onboardingStatus.includes(o.status)) errors.push("onboarding.status inválido");
  if (!ENUMS.onboardingStep.includes(o.currentStep)) errors.push("onboarding.currentStep inválido");
  if (o.status === "complete" && (o.currentStep !== "done" || s.budgetTier === "unselected")) {
    errors.push("onboarding complete exige step=done e budgetTier selecionado");
  }
  if (o.currentStep === "result" && s.budgetTier !== "unselected") {
    warnings.push("RESULT_STEP_WITH_SELECTED_BUDGET_TIER");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    referenceDate: getReferenceDate(child),
    canGenerateFirstYearPlan: errors.length === 0 && !warnings.includes("PLANNING_HORIZON_0_12_EXCEEDED")
  };
}

function firebaseChildPath(familyId, childId) {
  if (!familyId || !childId) throw new Error("familyId e childId são obrigatórios.");
  return `families/${familyId}/children/${childId}`;
}

function userContextPath(uid) {
  if (!uid) throw new Error("uid é obrigatório.");
  return `users/${uid}`;
}

function buildUserContext(familyId, activeChildId) {
  if (!familyId || !activeChildId) throw new Error("familyId e activeChildId são obrigatórios.");
  return { familyId, activeChildId };
}

module.exports = {
  ENUMS,
  DEFAULTS,
  createChildDraft,
  applyBabyStep,
  applyClimateStep,
  applyRoutineStep,
  selectBudgetTier,
  transitionToBorn,
  getReferenceDate,
  validateChild,
  firebaseChildPath,
  userContextPath,
  buildUserContext,
  _internal: { isIsoDate, compareIsoDate, monthsBetween }
};

  globalThis.CoraV48Engine.B=module.exports;
})();


(function(){
  const module={exports:{}};
  const exports=module.exports;
  const require = (id) => { throw new Error("Unexpected browser require in Climate: "+id); };

"use strict";

const CONFIG = Object.freeze({
  geocodingEndpoint: "https://geocoding-api.open-meteo.com/v1/search",
  historicalEndpoint: "https://archive-api.open-meteo.com/v1/archive",
  model: "era5_land",
  normalStart: "1991-01-01",
  normalEnd: "2020-12-31",
  chunks: [
    ["1991-01-01", "2000-12-31"],
    ["2001-01-01", "2010-12-31"],
    ["2011-01-01", "2020-12-31"]
  ],
  dailyVariables: ["temperature_2m_mean", "temperature_2m_min", "temperature_2m_max"],
  timezone: "auto",
  cacheSchemaVersion: 1,
  minSampleDaysPerMonth: 800,
  attribution: "Weather data by Open-Meteo; historical reanalysis: ERA5-Land / ECMWF."
});

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function slug(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function round1(value) {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

function buildLocationCacheKey({city, state, countryCode = "BR"}) {
  if (!city || !state || !countryCode) throw new Error("city/state/countryCode são obrigatórios para cacheKey.");
  return `${slug(city)}_${slug(state)}_${slug(countryCode)}_era5land_1991_2020_v${CONFIG.cacheSchemaVersion}`;
}

function buildGeocodingUrl({city, state, countryCode = "BR", language = "pt", count = 10}) {
  if (!city || !state) throw new Error("Cidade e UF/estado são obrigatórios para geocodificação.");
  const u = new URL(CONFIG.geocodingEndpoint);
  u.searchParams.set("name", `${String(city).trim()}, ${String(state).trim()}`);
  u.searchParams.set("count", String(count));
  u.searchParams.set("language", language);
  u.searchParams.set("format", "json");
  u.searchParams.set("countryCode", String(countryCode).toUpperCase());
  return u.toString();
}

function buildArchiveUrl({latitude, longitude, startDate, endDate}) {
  if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
    throw new Error("Latitude/longitude inválidas.");
  }
  const u = new URL(CONFIG.historicalEndpoint);
  u.searchParams.set("latitude", String(latitude));
  u.searchParams.set("longitude", String(longitude));
  u.searchParams.set("start_date", startDate);
  u.searchParams.set("end_date", endDate);
  u.searchParams.set("daily", CONFIG.dailyVariables.join(","));
  u.searchParams.set("timezone", CONFIG.timezone);
  u.searchParams.set("temperature_unit", "celsius");
  u.searchParams.set("models", CONFIG.model);
  return u.toString();
}

async function fetchJson(url, fetchImpl = globalThis.fetch, timeoutMs = 30000) {
  if (typeof fetchImpl !== "function") throw new Error("fetch indisponível.");
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetchImpl(url, controller ? {signal: controller.signal} : undefined);
    if (!response || !response.ok) {
      const status = response?.status ?? "unknown";
      throw new Error(`OPEN_METEO_HTTP_${status}`);
    }
    const data = await response.json();
    if (data?.error) throw new Error(`OPEN_METEO_API_ERROR: ${data.reason || "unknown"}`);
    return data;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function chooseGeocodingResult(results, {city, countryCode = "BR"}) {
  if (!Array.isArray(results) || results.length === 0) throw new Error("LOCATION_NOT_FOUND");
  const cc = String(countryCode).toUpperCase();
  const cityNorm = normalizeText(city);
  const sameCountry = results.filter(r => String(r.country_code || "").toUpperCase() === cc);
  const pool = sameCountry.length ? sameCountry : results;
  const exact = pool.find(r => normalizeText(r.name) === cityNorm);
  const chosen = exact || pool[0];
  if (!Number.isFinite(Number(chosen.latitude)) || !Number.isFinite(Number(chosen.longitude))) {
    throw new Error("LOCATION_COORDINATES_INVALID");
  }
  return {
    providerLocationId: chosen.id ?? null,
    name: chosen.name,
    admin1: chosen.admin1 ?? null,
    country: chosen.country ?? null,
    countryCode: chosen.country_code ?? cc,
    latitude: Number(chosen.latitude),
    longitude: Number(chosen.longitude),
    elevation: chosen.elevation == null ? null : Number(chosen.elevation),
    timezone: chosen.timezone ?? null
  };
}

async function geocodeLocation(input, options = {}) {
  const url = buildGeocodingUrl(input);
  const json = await fetchJson(url, options.fetchImpl, options.timeoutMs);
  return chooseGeocodingResult(json.results, input);
}

function validateDailyPayload(payload) {
  const d = payload?.daily;
  const fields = ["time", ...CONFIG.dailyVariables];
  if (!d) throw new Error("ARCHIVE_DAILY_MISSING");
  for (const f of fields) {
    if (!Array.isArray(d[f])) throw new Error(`ARCHIVE_FIELD_MISSING:${f}`);
  }
  const n = d.time.length;
  for (const f of CONFIG.dailyVariables) {
    if (d[f].length !== n) throw new Error(`ARCHIVE_FIELD_LENGTH_MISMATCH:${f}`);
  }
  return n;
}

async function fetchHistoricalChunks(location, options = {}) {
  const chunks = options.chunks || CONFIG.chunks;
  const out = [];
  for (const [startDate, endDate] of chunks) {
    const url = buildArchiveUrl({
      latitude: location.latitude,
      longitude: location.longitude,
      startDate,
      endDate
    });
    const json = await fetchJson(url, options.fetchImpl, options.timeoutMs);
    validateDailyPayload(json);
    out.push({startDate, endDate, payload: json});
  }
  return out;
}

function aggregateMonthlyNormals(chunks, options = {}) {
  const minSampleDays = options.minSampleDaysPerMonth ?? CONFIG.minSampleDaysPerMonth;
  const acc = Array.from({length:12}, () => ({n:0,sumMean:0,sumMin:0,sumMax:0,sumAmp:0}));
  const seenDates = new Set();

  for (const chunk of chunks) {
    const d = chunk?.payload?.daily || chunk?.daily;
    if (!d) throw new Error("ARCHIVE_DAILY_MISSING");
    const n = d.time.length;
    for (let i=0;i<n;i++) {
      const date = d.time[i];
      if (seenDates.has(date)) continue;
      const tMean = Number(d.temperature_2m_mean[i]);
      const tMin = Number(d.temperature_2m_min[i]);
      const tMax = Number(d.temperature_2m_max[i]);
      if (!date || !Number.isFinite(tMean) || !Number.isFinite(tMin) || !Number.isFinite(tMax)) continue;
      const month = Number(String(date).slice(5,7));
      if (!(month >= 1 && month <= 12)) continue;
      const a = acc[month-1];
      a.n += 1;
      a.sumMean += tMean;
      a.sumMin += tMin;
      a.sumMax += tMax;
      a.sumAmp += (tMax - tMin);
      seenDates.add(date);
    }
  }

  const months = {};
  for (let m=1;m<=12;m++) {
    const a = acc[m-1];
    if (a.n < minSampleDays) throw new Error(`INCOMPLETE_CLIMATE_NORMALS:month=${m}:days=${a.n}`);
    months[String(m).padStart(2,"0")] = {
      meanTempC: round1(a.sumMean/a.n),
      meanMinTempC: round1(a.sumMin/a.n),
      meanMaxTempC: round1(a.sumMax/a.n),
      meanDailyAmplitudeC: round1(a.sumAmp/a.n),
      sampleDays: a.n
    };
  }
  return months;
}

function buildClimateRecord({input, location, monthlyNormals, fetchedAt = Date.now()}) {
  return {
    schemaVersion: CONFIG.cacheSchemaVersion,
    cacheKey: buildLocationCacheKey(input),
    input: {
      city: String(input.city).trim(),
      state: String(input.state).trim().toUpperCase(),
      countryCode: String(input.countryCode || "BR").toUpperCase()
    },
    location,
    source: {
      provider: "Open-Meteo",
      dataset: "ERA5-Land",
      model: CONFIG.model,
      normalPeriod: "1991-2020",
      startDate: CONFIG.normalStart,
      endDate: CONFIG.normalEnd,
      attribution: CONFIG.attribution
    },
    monthlyNormals,
    fetchedAt,
    confidence: "climatology_30y"
  };
}

async function resolveClimateNormals(input, options = {}) {
  const cacheKey = buildLocationCacheKey(input);
  if (typeof options.cacheGet === "function") {
    const cached = await options.cacheGet(cacheKey);
    if (cached?.schemaVersion === CONFIG.cacheSchemaVersion && cached?.monthlyNormals) {
      return {record: cached, cacheHit: true};
    }
  }

  try {
    const location = await geocodeLocation(input, options);
    const chunks = await fetchHistoricalChunks(location, options);
    const monthlyNormals = aggregateMonthlyNormals(chunks, options);
    const record = buildClimateRecord({input, location, monthlyNormals, fetchedAt: options.nowMs ?? Date.now()});
    if (typeof options.cacheSet === "function") await options.cacheSet(cacheKey, record);
    return {record, cacheHit: false};
  } catch (err) {
    const wrapped = new Error(`CLIMATE_UNAVAILABLE:${err.message}`);
    wrapped.cause = err;
    throw wrapped;
  }
}

function firebaseCachePath(familyId, cacheKey) {
  if (!familyId || !cacheKey) throw new Error("familyId e cacheKey obrigatórios.");
  return `families/${familyId}/climateCache/${cacheKey}`;
}

module.exports = {
  CONFIG,
  normalizeText,
  buildLocationCacheKey,
  buildGeocodingUrl,
  buildArchiveUrl,
  fetchJson,
  chooseGeocodingResult,
  geocodeLocation,
  validateDailyPayload,
  fetchHistoricalChunks,
  aggregateMonthlyNormals,
  buildClimateRecord,
  resolveClimateNormals,
  firebaseCachePath
};

  globalThis.CoraV48Engine.Climate=module.exports;
})();


(function(){
  const module={exports:{}};
  const exports=module.exports;
  const require = (id) => { throw new Error("Unexpected browser require in Thermal: "+id); };

"use strict";

const CONFIG = Object.freeze({
  version: "4.8C4",
  thresholdVersion: "c4-v1-frozen",
  classOrder: ["very_cold", "cold", "mild", "hot", "very_hot"],
  bands: [
    {className:"very_cold", min:-Infinity, max:16},
    {className:"cold", min:16, max:20},
    {className:"mild", min:20, max:24},
    {className:"hot", min:24, max:27},
    {className:"very_hot", min:27, max:Infinity}
  ],
  transitions: {
    moderateMinClassGap: 2,
    strongMinClassGap: 3,
    moderateMinAmplitudeC: 9,
    strongMinAmplitudeC: 12
  },
  agePeriods: {
    RN: [0,1],
    P: [1,3],
    M: [3,6],
    G: [6,9],
    GG: [9,12]
  },
  mixedSeasonSecondaryShareMin: 0.20,
  minSampleDaysPerMonth: 800,
  airConditioning: {
    none: "none",
    sometimes: "small",
    frequent: "moderate"
  }
});

function round1(n) { return Math.round((Number(n)+Number.EPSILON)*10)/10; }
function round3(n) { return Math.round((Number(n)+Number.EPSILON)*1000)/1000; }

function assertIsoDate(value, label="date") {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} inválida.`);
  const [y,m,d]=value.split("-").map(Number);
  const dt=new Date(Date.UTC(y,m-1,d));
  if (dt.getUTCFullYear()!==y || dt.getUTCMonth()!==m-1 || dt.getUTCDate()!==d) throw new Error(`${label} inválida.`);
  return dt;
}
function iso(dt) { return dt.toISOString().slice(0,10); }
function daysInMonthUTC(y,m1) { return new Date(Date.UTC(y,m1,0)).getUTCDate(); }
function addMonthsClamped(dateIso, months) {
  const d=assertIsoDate(dateIso);
  const targetMonthIndex=d.getUTCMonth()+months;
  const y=d.getUTCFullYear()+Math.floor(targetMonthIndex/12);
  const m=((targetMonthIndex%12)+12)%12;
  const day=Math.min(d.getUTCDate(), daysInMonthUTC(y,m+1));
  return iso(new Date(Date.UTC(y,m,day)));
}
function daysBetween(fromIso,toIso) {
  const a=assertIsoDate(fromIso); const b=assertIsoDate(toIso);
  return Math.round((b-a)/86400000);
}

function classifyTemperature(tempC) {
  const t=Number(tempC);
  if (!Number.isFinite(t)) throw new Error("Temperatura inválida.");
  for (const b of CONFIG.bands) if (t >= b.min && t < b.max) return b.className;
  throw new Error("Temperatura fora do domínio.");
}
function classRank(name) {
  const i=CONFIG.classOrder.indexOf(name);
  if (i<0) throw new Error(`Classe térmica inválida: ${name}`);
  return i;
}
function transitionLevel(dayClass, nightClass, amplitudeC) {
  const gap=Math.abs(classRank(dayClass)-classRank(nightClass));
  const amp=Number(amplitudeC);
  if (!Number.isFinite(amp)) throw new Error("Amplitude inválida.");
  if (gap>=CONFIG.transitions.strongMinClassGap || amp>=CONFIG.transitions.strongMinAmplitudeC) return "strong";
  if (gap>=CONFIG.transitions.moderateMinClassGap || amp>=CONFIG.transitions.moderateMinAmplitudeC) return "moderate";
  return "none";
}

function classifyMonthlyNormal(normal) {
  for (const k of ["meanTempC","meanMinTempC","meanMaxTempC","meanDailyAmplitudeC","sampleDays"]) {
    if (!Number.isFinite(Number(normal?.[k]))) throw new Error(`Normal mensal inválida: ${k}`);
  }
  if (Number(normal.sampleDays) < CONFIG.minSampleDaysPerMonth) throw new Error(`Amostra mensal insuficiente: ${normal.sampleDays}`);
  const meanClass=classifyTemperature(normal.meanTempC);
  const dayClass=classifyTemperature(normal.meanMaxTempC);
  const nightClass=classifyTemperature(normal.meanMinTempC);
  const tLevel=transitionLevel(dayClass,nightClass,normal.meanDailyAmplitudeC);
  return {
    ...normal,
    meanClass,
    dayClass,
    nightClass,
    transitionLevel:tLevel,
    hotDay:["hot","very_hot"].includes(dayClass),
    coldNight:["cold","very_cold"].includes(nightClass)
  };
}

function validateMonthlyNormals(monthlyNormals) {
  const out={};
  for (let m=1;m<=12;m++) {
    const key=String(m).padStart(2,"0");
    if (!monthlyNormals?.[key]) throw new Error(`Climatologia sem mês ${key}.`);
    out[key]=classifyMonthlyNormal(monthlyNormals[key]);
  }
  return out;
}

function splitIntervalByCalendarMonth(fromIso,toExclusiveIso) {
  const start=assertIsoDate(fromIso,"from");
  const end=assertIsoDate(toExclusiveIso,"toExclusive");
  if (!(end>start)) throw new Error("Intervalo inválido.");
  const segments=[];
  let cur=new Date(start.getTime());
  while (cur<end) {
    const y=cur.getUTCFullYear(), m=cur.getUTCMonth();
    const nextMonth=new Date(Date.UTC(y,m+1,1));
    const segEnd=nextMonth<end?nextMonth:end;
    const d=Math.round((segEnd-cur)/86400000);
    segments.push({
      from:iso(cur),
      toExclusive:iso(segEnd),
      year:y,
      month:String(m+1).padStart(2,"0"),
      days:d
    });
    cur=segEnd;
  }
  return segments;
}

function buildAgeCalendar(referenceDate) {
  assertIsoDate(referenceDate,"referenceDate");
  const out={};
  for (const [size,[fromM,toM]] of Object.entries(CONFIG.agePeriods)) {
    const from=addMonthsClamped(referenceDate,fromM);
    const toExclusive=addMonthsClamped(referenceDate,toM);
    out[size]={from,toExclusive,calendarDays:daysBetween(from,toExclusive)};
  }
  return out;
}

function aggregateAgePeriod(period, classifiedMonths) {
  const segments=splitIntervalByCalendarMonth(period.from,period.toExclusive);
  const totalDays=segments.reduce((s,x)=>s+x.days,0);
  const sums={mean:0,min:0,max:0,amp:0};
  const classDays=Object.fromEntries(CONFIG.classOrder.map(c=>[c,0]));
  let diurnalTransitionDays=0;
  const monthlyExposure=segments.map(seg=>{
    const m=classifiedMonths[seg.month];
    sums.mean += seg.days*Number(m.meanTempC);
    sums.min += seg.days*Number(m.meanMinTempC);
    sums.max += seg.days*Number(m.meanMaxTempC);
    sums.amp += seg.days*Number(m.meanDailyAmplitudeC);
    classDays[m.meanClass] += seg.days;
    if (m.transitionLevel!=="none") diurnalTransitionDays += seg.days;
    return {
      ...seg,
      share:round3(seg.days/totalDays),
      meanTempC:m.meanTempC,
      meanMinTempC:m.meanMinTempC,
      meanMaxTempC:m.meanMaxTempC,
      meanClass:m.meanClass,
      dayClass:m.dayClass,
      nightClass:m.nightClass,
      transitionLevel:m.transitionLevel
    };
  });
  const weightedMeanTempC=round1(sums.mean/totalDays);
  const weightedMeanMinTempC=round1(sums.min/totalDays);
  const weightedMeanMaxTempC=round1(sums.max/totalDays);
  const weightedMeanDailyAmplitudeC=round1(sums.amp/totalDays);
  const classExposure={};
  for (const c of CONFIG.classOrder) classExposure[c]=round3(classDays[c]/totalDays);
  const weightedMeanThermalClass=classifyTemperature(weightedMeanTempC);
  const sorted=Object.entries(classExposure).sort((a,b)=>b[1]-a[1]);
  const dominantThermalClass=sorted[0][0];
  const secondaryThermalClass=sorted[1]?.[1] >= CONFIG.mixedSeasonSecondaryShareMin ? sorted[1][0] : null;
  return {
    ...period,
    weightedMeanTempC,
    weightedMeanMinTempC,
    weightedMeanMaxTempC,
    weightedMeanDailyAmplitudeC,
    weightedMeanThermalClass,
    dominantThermalClass,
    classExposure,
    secondaryThermalClass,
    mixedSeason:Boolean(secondaryThermalClass),
    diurnalTransitionShare:round3(diurnalTransitionDays/totalDays),
    monthlyExposure
  };
}

function referenceDateFromChild(child) {
  const p=child?.profile || {};
  if (p.lifeStage==="born") {
    if (!p.birthDate) throw new Error("born exige birthDate.");
    assertIsoDate(p.birthDate,"birthDate");
    return {referenceDate:p.birthDate, source:"birthDate"};
  }
  if (p.lifeStage==="expecting") {
    if (!p.dueDate) throw new Error("expecting exige dueDate.");
    assertIsoDate(p.dueDate,"dueDate");
    return {referenceDate:p.dueDate, source:"dueDate"};
  }
  throw new Error("lifeStage inválido.");
}

function buildThermalProfile({child, climateRecord}) {
  if (!climateRecord?.monthlyNormals) throw new Error("climateRecord.monthlyNormals ausente.");
  const classifiedMonths=validateMonthlyNormals(climateRecord.monthlyNormals);
  const {referenceDate,source:referenceDateSource}=referenceDateFromChild(child);
  const air=child?.enxoval?.settings?.airConditioning;
  if (!Object.prototype.hasOwnProperty.call(CONFIG.airConditioning,air)) throw new Error("airConditioning inválido/ausente.");
  const calendar=buildAgeCalendar(referenceDate);
  const agePeriods={};
  for (const [size,period] of Object.entries(calendar)) agePeriods[size]=aggregateAgePeriod(period,classifiedMonths);
  return {
    schemaVersion:1,
    engineVersion:CONFIG.version,
    thresholdVersion:CONFIG.thresholdVersion,
    thresholdStatus:"frozen_after_C4_geographic_validation",
    referenceDate,
    referenceDateSource,
    location:climateRecord.location || null,
    source:climateRecord.source || null,
    monthlyClimatologySummary:classifiedMonths,
    agePeriods,
    indoorAdjustment:{
      airConditioning:air,
      sleepAdjustment:CONFIG.airConditioning[air],
      outdoorThermalClassChanged:false
    },
    confidence:climateRecord.confidence==="climatology_30y"?"high":"medium"
  };
}

module.exports={
  CONFIG,
  classifyTemperature,
  transitionLevel,
  classifyMonthlyNormal,
  validateMonthlyNormals,
  addMonthsClamped,
  daysBetween,
  splitIntervalByCalendarMonth,
  buildAgeCalendar,
  aggregateAgePeriod,
  referenceDateFromChild,
  buildThermalProfile
};

  globalThis.CoraV48Engine.Thermal=module.exports;
})();


(function(){
  const module={exports:{}};
  const exports=module.exports;
  const require = (id) => { throw new Error("Unexpected browser require in Clothing: "+id); };

"use strict";

// Cora V4.8C3.1.1 — Climate-aware clothing composition with climate as an OPTIONAL plug-in.
// IMPORTANT: this file intentionally does NOT import the C1/C2 climate modules.
// A thermalProfile can be supplied by C2, but the clothing engine works without it.

const THERMAL_CLASSES = Object.freeze(["very_cold","cold","mild","hot","very_hot"]);
const SIZE_ORDER = Object.freeze(["RN","P","M","G","GG"]);

const A2 = Object.freeze({
  rotationBase:{RN:12,P:12,M:11,G:10,GG:10},
  reserveDelta:{compact:-2,standard:0,roomy:2},
  onePieceShare:{RN:0.42,P:0.42,M:0.36,G:0.30,GG:0.30},
  separateTopShareWithinModular:{RN:0,P:0,M:0.15,G:0.30,GG:0.40},
  bodySleeveShareLong:{very_hot:0.15,hot:0.30,mild:0.50,cold:0.75,very_cold:0.90},
  onePieceLongShare:{very_hot:0.40,hot:0.60,mild:0.80,cold:1.00,very_cold:1.00},
  lowerCoverageShareOfModularTops:{very_hot:0.50,hot:0.65,mild:0.85,cold:1.00,very_cold:1.00},
  shortShareForMPlus:{very_hot:0.70,hot:0.55,mild:0.25,cold:0,very_cold:0},
  outerLayerQuantity:{very_hot:0,hot:1,mild:1,cold:2,very_cold:2},
  sockPairs:{very_hot:2,hot:3,mild:4,cold:4,very_cold:5},
  ageLocks:{RN:{shorts:0,separateTops:0},P:{maxShorts:1,separateTops:0}},
  styleSuggestions:{
    girl:{vestido_estilo_menina:{RN:0,P:0,M:1,G:1,GG:1},saia_estilo_menina:{RN:0,P:0,M:1,G:1,GG:1},laco_faixa_estilo_menina:{total:2,sizeIndependent:true}},
    boy:{},neutral:{}
  }
});

const GENERIC_WEIGHTS = Object.freeze({very_cold:0,cold:0,mild:1,hot:0,very_hot:0});
const HOT_COLD_DIURNAL_MIN_SHARE = 0.20;

function clamp(n,min,max){ return Math.max(min,Math.min(max,n)); }
function round3(n){ return Math.round((Number(n)+Number.EPSILON)*1000)/1000; }
function int(n){ return Math.round(Number(n)); }
function assertEnum(value, allowed, label){ if(!allowed.includes(value)) throw new Error(`${label} inválido: ${value}`); }

function normalizeWeights(raw){
  const w={}; let sum=0;
  for(const c of THERMAL_CLASSES){
    const v=Number(raw?.[c] ?? 0);
    if(!Number.isFinite(v) || v<0) throw new Error(`Peso térmico inválido em ${c}`);
    w[c]=v; sum+=v;
  }
  if(!(sum>0)) throw new Error("Exposição térmica vazia.");
  for(const c of THERMAL_CLASSES) w[c]=round3(w[c]/sum);
  // absorb rounding residue into largest bucket
  const total=THERMAL_CLASSES.reduce((s,c)=>s+w[c],0);
  const residue=round3(1-total);
  if(residue!==0){
    const largest=THERMAL_CLASSES.slice().sort((a,b)=>w[b]-w[a])[0];
    w[largest]=round3(w[largest]+residue);
  }
  return w;
}

function weightedRule(weights, map){
  return THERMAL_CLASSES.reduce((sum,c)=>sum+weights[c]*Number(map[c]),0);
}

function hasValidAgePeriod(period){
  if(!period || typeof period!=="object" || !period.classExposure) return false;
  try{ normalizeWeights(period.classExposure); return true; }catch(_){ return false; }
}

function resolveThermalContext({thermalProfile=null, climatePersonalizationEnabled=true}={}){
  if(!climatePersonalizationEnabled){
    return {mode:"generic_balanced",climateApplied:false,needsClimateRefresh:false,reason:"feature_disabled"};
  }
  const periods=thermalProfile?.agePeriods;
  const allValid=SIZE_ORDER.every(size=>hasValidAgePeriod(periods?.[size]));
  if(!allValid){
    return {mode:"generic_balanced",climateApplied:false,needsClimateRefresh:true,reason:"thermal_profile_missing_or_invalid"};
  }
  return {mode:"climate_personalized",climateApplied:true,needsClimateRefresh:false,reason:null};
}

function weightsForSize(size, thermalProfile, context){
  if(!context.climateApplied) return {...GENERIC_WEIGHTS};
  return normalizeWeights(thermalProfile.agePeriods[size].classExposure);
}

function hotColdDiurnalShare(period){
  if(!period?.monthlyExposure?.length) return 0;
  let share=0;
  for(const m of period.monthlyExposure){
    const dayHot=["hot","very_hot"].includes(m.dayClass);
    const nightCold=["cold","very_cold"].includes(m.nightClass);
    if(dayHot && nightCold) share += Number(m.share || 0);
  }
  return clamp(round3(share),0,1);
}

function splitLongShort(total, longShare, {ensureBoth=false}={}){
  total=Math.max(0,int(total));
  let long=clamp(int(total*longShare),0,total);
  let short=total-long;
  if(ensureBoth && total>=2){
    if(long===0){ long=1; short=total-1; }
    if(short===0){ short=1; long=total-1; }
  }
  return {long,short};
}

function compositionForSize({size,reserveProfile,thermalProfile,thermalContext,airConditioning}){
  assertEnum(size,SIZE_ORDER,"size");
  assertEnum(reserveProfile,["compact","standard","roomy"],"reserveProfile");
  assertEnum(airConditioning,["none","sometimes","frequent"],"airConditioning");
  const weights=weightsForSize(size,thermalProfile,thermalContext);

  const rotation=Math.max(1,A2.rotationBase[size]+A2.reserveDelta[reserveProfile]);
  const onePiece=clamp(int(rotation*A2.onePieceShare[size]),0,rotation);
  const modular=rotation-onePiece;
  let separateTop=clamp(int(modular*A2.separateTopShareWithinModular[size]),0,modular);
  if(size==="RN" || size==="P") separateTop=0;
  const body=modular-separateTop;

  const bodyLongShare=weightedRule(weights,A2.bodySleeveShareLong);
  const onePieceLongShare=weightedRule(weights,A2.onePieceLongShare);
  const lowerCoverageShare=weightedRule(weights,A2.lowerCoverageShareOfModularTops);
  const shortShare=weightedRule(weights,A2.shortShareForMPlus);
  const diurnalShare=thermalContext.climateApplied ? hotColdDiurnalShare(thermalProfile.agePeriods[size]) : 0;
  const ensureBoth=diurnalShare>=HOT_COLD_DIURNAL_MIN_SHARE;

  let bodySplit=splitLongShort(body,bodyLongShare,{ensureBoth});
  let separateTopSplit=splitLongShort(separateTop,bodyLongShare,{ensureBoth});
  let onePieceSplit=splitLongShort(onePiece,onePieceLongShare,{ensureBoth});

  let lowerTotal=clamp(int(modular*lowerCoverageShare),0,modular);
  let shorts=clamp(int(lowerTotal*shortShare),0,lowerTotal);
  if(size==="RN") shorts=0;
  if(size==="P") shorts=Math.min(shorts,1);
  let pants=lowerTotal-shorts;

  let outerLayers=Math.max(0,int(weightedRule(weights,A2.outerLayerQuantity)));
  let socks=Math.max(0,int(weightedRule(weights,A2.sockPairs)));

  const acAdjustments=[];
  if(airConditioning==="sometimes"){
    acAdjustments.push("explanation_only_or_small_adjustment");
  }
  if(airConditioning==="frequent"){
    if(onePiece>0 && onePieceSplit.long===0){
      onePieceSplit={long:1,short:onePiece-1};
      acAdjustments.push("ensure_long_sleepwear");
    }
    const totalLongOptions=bodySplit.long+onePieceSplit.long+separateTopSplit.long;
    if(totalLongOptions===0 && bodySplit.short>0){
      bodySplit={long:1,short:body-1};
      acAdjustments.push("shift_one_body_to_long");
    }
    if(outerLayers===0){
      outerLayers=1;
      acAdjustments.push("ensure_one_outer_layer");
    }
  }

  return {
    size,
    mode:thermalContext.mode,
    thermalWeights:weights,
    climateApplied:thermalContext.climateApplied,
    diurnalHotColdShare:diurnalShare,
    rotation:{target:rotation,onePiece,modular,body,separateTop},
    items:{
      body:{total:body,variants:{manga_curta:bodySplit.short,manga_longa:bodySplit.long}},
      peca_inteira:{total:onePiece,variants:{macaquinho_curto:onePieceSplit.short,macacao_longo:onePieceSplit.long}},
      parte_cima_separada:{total:separateTop,variants:{manga_curta:separateTopSplit.short,manga_longa:separateTopSplit.long}},
      parte_baixo:{total:lowerTotal,variants:{calca_culote:pants,short:shorts}},
      camada_externa:{total:outerLayers},
      meias:{pairs:socks}
    },
    derivedShares:{bodyLong:round3(bodyLongShare),onePieceLong:round3(onePieceLongShare),lowerCoverage:round3(lowerCoverageShare),shortsMPlus:round3(shortShare)},
    acAdjustments
  };
}

function optionalStyleSuggestions(styleProfile){
  assertEnum(styleProfile,["girl","boy","neutral"],"styleProfile");
  const src=A2.styleSuggestions[styleProfile];
  return JSON.parse(JSON.stringify(src));
}

function validateSizePlan(sizePlan){
  const e=[]; const r=sizePlan.rotation; const i=sizePlan.items;
  const ints=[r.target,r.onePiece,r.modular,r.body,r.separateTop,i.body.total,i.peca_inteira.total,i.parte_cima_separada.total,i.parte_baixo.total,i.camada_externa.total,i.meias.pairs,
    i.body.variants.manga_curta,i.body.variants.manga_longa,i.peca_inteira.variants.macaquinho_curto,i.peca_inteira.variants.macacao_longo,
    i.parte_cima_separada.variants.manga_curta,i.parte_cima_separada.variants.manga_longa,i.parte_baixo.variants.calca_culote,i.parte_baixo.variants.short];
  if(ints.some(x=>!Number.isInteger(x)||x<0)) e.push("non_integer_or_negative_quantity");
  if(r.onePiece+r.modular!==r.target) e.push("rotation_not_preserved");
  if(r.body+r.separateTop!==r.modular) e.push("modular_not_preserved");
  if(i.body.variants.manga_curta+i.body.variants.manga_longa!==i.body.total) e.push("body_split_mismatch");
  if(i.peca_inteira.variants.macaquinho_curto+i.peca_inteira.variants.macacao_longo!==i.peca_inteira.total) e.push("onepiece_split_mismatch");
  if(i.parte_cima_separada.variants.manga_curta+i.parte_cima_separada.variants.manga_longa!==i.parte_cima_separada.total) e.push("top_split_mismatch");
  if(i.parte_baixo.variants.calca_culote+i.parte_baixo.variants.short!==i.parte_baixo.total) e.push("lower_split_mismatch");
  if(sizePlan.size==="RN" && i.parte_baixo.variants.short!==0) e.push("RN_short_lock_broken");
  if(sizePlan.size==="RN" && i.parte_cima_separada.total!==0) e.push("RN_top_lock_broken");
  if(sizePlan.size==="P" && i.parte_cima_separada.total!==0) e.push("P_top_lock_broken");
  if(sizePlan.size==="P" && i.parte_baixo.variants.short>1) e.push("P_short_cap_broken");
  return e;
}

function buildClothingPlan({child,thermalProfile=null,climatePersonalizationEnabled=true}={}){
  const settings=child?.enxoval?.settings || {};
  const reserveProfile=settings.clothingReserve || "standard";
  const styleProfile=settings.styleProfile || "neutral";
  const airConditioning=settings.airConditioning || "none";
  assertEnum(reserveProfile,["compact","standard","roomy"],"clothingReserve");
  assertEnum(styleProfile,["girl","boy","neutral"],"styleProfile");
  assertEnum(airConditioning,["none","sometimes","frequent"],"airConditioning");

  const thermalContext=resolveThermalContext({thermalProfile,climatePersonalizationEnabled});
  const sizes={}; const validationErrors=[];
  for(const size of SIZE_ORDER){
    sizes[size]=compositionForSize({size,reserveProfile,thermalProfile,thermalContext,airConditioning});
    validationErrors.push(...validateSizePlan(sizes[size]).map(x=>`${size}:${x}`));
  }
  return {
    schemaVersion:1,
    engineVersion:"4.8C3.1.1",
    climateModule:{
      optional:true,
      mode:thermalContext.mode,
      applied:thermalContext.climateApplied,
      needsClimateRefresh:thermalContext.needsClimateRefresh,
      reason:thermalContext.reason,
      removableWithoutBreakingCore:true
    },
    inputs:{reserveProfile,styleProfile,airConditioning},
    sizes,
    optionalStyleSuggestions:optionalStyleSuggestions(styleProfile),
    validation:{valid:validationErrors.length===0,errors:validationErrors}
  };
}

module.exports={
  THERMAL_CLASSES,SIZE_ORDER,A2,GENERIC_WEIGHTS,
  normalizeWeights,weightedRule,resolveThermalContext,weightsForSize,hotColdDiurnalShare,splitLongShort,
  compositionForSize,optionalStyleSuggestions,validateSizePlan,buildClothingPlan
};

  globalThis.CoraV48Engine.Clothing=module.exports;
})();


(function(){
  const module={exports:{}};
  const exports=module.exports;
  const require = (id) => { throw new Error("Unexpected browser require in ClimatePipeline: "+id); };

"use strict";

// Cora V4.8C4 integration seam.
// This module intentionally imports NO climate/thermal/clothing implementation.
// Dependencies are injected by the application composition root.

function assertClothingEngine(engine){
  if(!engine || typeof engine.buildClothingPlan!=="function") throw new Error("clothingEngine obrigatório.");
}

function genericResult({child,clothingEngine,enabled,status,error=null}){
  const plan=clothingEngine.buildClothingPlan({
    child,
    thermalProfile:null,
    climatePersonalizationEnabled:enabled
  });
  return {status,climateRecord:null,thermalProfile:null,plan,error};
}

async function buildPlanWithOptionalClimate({
  child,
  climateLocation,
  climatePersonalizationEnabled=true,
  climateProvider=null,
  thermalEngine=null,
  clothingEngine,
  providerOptions={}
}={}){
  assertClothingEngine(clothingEngine);
  if(!climatePersonalizationEnabled){
    return genericResult({child,clothingEngine,enabled:false,status:"climate_disabled"});
  }
  if(!climateProvider || typeof climateProvider.resolveClimateNormals!=="function" ||
     !thermalEngine || typeof thermalEngine.buildThermalProfile!=="function"){
    return genericResult({child,clothingEngine,enabled:true,status:"climate_component_unavailable",error:"CLIMATE_COMPONENT_UNAVAILABLE"});
  }
  try{
    const resolved=await climateProvider.resolveClimateNormals(climateLocation,providerOptions);
    const climateRecord=resolved?.record;
    const thermalProfile=thermalEngine.buildThermalProfile({child,climateRecord});
    const plan=clothingEngine.buildClothingPlan({child,thermalProfile,climatePersonalizationEnabled:true});
    return {status:"climate_personalized",cacheHit:Boolean(resolved?.cacheHit),climateRecord,thermalProfile,plan,error:null};
  }catch(err){
    return genericResult({child,clothingEngine,enabled:true,status:"climate_temporarily_unavailable",error:String(err?.message||err)});
  }
}

module.exports={buildPlanWithOptionalClimate};

  globalThis.CoraV48Engine.ClimatePipeline=module.exports;
})();


(function(){
  const module={exports:{}};
  const exports=module.exports;
  const require = (id) => { throw new Error("Unexpected browser require in D1: "+id); };

"use strict";

// Cora V4.8D1 — immutable plan snapshot contract + Firebase paths.
// D1 does not generate the layette (D2) and does not calculate budget/timeline (D3).
// It defines how those results become an auditable, append-only snapshot.

const CONTRACT = Object.freeze({
  version:"4.8D1",
  schemaVersion:1,
  planStatus:["draft","ready"],
  budgetTiers:["economic","intermediate","premium"],
  lineageReasons:["initial","settings_changed","date_changed","born_transition","budget_changed","optional_decision_changed","manual_recalculate","other"],
  climateStatuses:["climate_personalized","climate_disabled","climate_component_unavailable","climate_temporarily_unavailable"],
  climateModes:["climate_personalized","generic_balanced"],
  targetKinds:["single","by_size","by_phase","recurring"],
  sizeOrder:["RN","P","M","G","GG"]
});

function jsonClone(value){
  if(value===undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}
function uniqueSorted(values){
  return [...new Set((values||[]).map(x=>String(x).trim()).filter(Boolean))].sort();
}
function assertNonEmptyString(value,label){ if(typeof value!=="string" || !value.trim()) throw new Error(`${label} obrigatório.`); }
function assertFiniteTimestamp(value,label){ if(!Number.isFinite(Number(value)) || Number(value)<0) throw new Error(`${label} inválido.`); }
function assertPlanId(planId){
  assertNonEmptyString(planId,"planId");
  if(/[.#$\[\]/]/.test(planId)) throw new Error("planId contém caractere inválido para Firebase.");
  return planId;
}
function childBasePath(familyId,childId){
  assertNonEmptyString(familyId,"familyId"); assertNonEmptyString(childId,"childId");
  return `families/${familyId}/children/${childId}`;
}
function plansBasePath(familyId,childId){ return `${childBasePath(familyId,childId)}/enxoval/plans`; }
function firebasePlanPath(familyId,childId,planId){ assertPlanId(planId); return `${plansBasePath(familyId,childId)}/${planId}`; }
function firebaseCurrentPlanPath(familyId,childId){ return `${childBasePath(familyId,childId)}/enxoval/currentPlanId`; }
function firebaseOperationalItemPath(familyId,childId,itemId){ assertNonEmptyString(itemId,"itemId"); return `${childBasePath(familyId,childId)}/enxoval/items/${itemId}`; }

function referenceFromProfile(profile){
  if(profile?.lifeStage==="born"){
    assertNonEmptyString(profile.birthDate,"profile.birthDate");
    return {referenceDate:profile.birthDate,referenceDateSource:"birthDate"};
  }
  if(profile?.lifeStage==="expecting"){
    assertNonEmptyString(profile.dueDate,"profile.dueDate");
    return {referenceDate:profile.dueDate,referenceDateSource:"dueDate"};
  }
  throw new Error("profile.lifeStage inválido.");
}

function assertPlanEligible(child,eligibility){
  if(!eligibility || eligibility.valid!==true) throw new Error("Criança não passou na validação V4.8B.");
  if(eligibility.canGenerateFirstYearPlan!==true) throw new Error("PLANNING_HORIZON_0_12_NOT_ELIGIBLE");
  const o=child?.enxoval?.onboarding || {};
  const s=child?.enxoval?.settings || {};
  if(o.status!=="complete" || o.currentStep!=="done") throw new Error("Onboarding precisa estar completo antes do plano.");
  if(!CONTRACT.budgetTiers.includes(s.budgetTier)) throw new Error("budgetTier precisa estar selecionado antes do plano.");
  return true;
}

function buildInputSnapshot(child){
  const p=child?.profile || {}, s=child?.enxoval?.settings || {}, o=child?.enxoval?.onboarding || {};
  const ref=referenceFromProfile(p);
  const profile={name:String(p.name||"Bebê"),lifeStage:p.lifeStage};
  if(p.dueDate!==undefined) profile.dueDate=p.dueDate;
  if(p.birthDate!==undefined) profile.birthDate=p.birthDate;
  const settings={
    styleProfile:s.styleProfile,
    climateLocation:jsonClone(s.climateLocation),
    airConditioning:s.airConditioning,
    car:jsonClone(s.car),
    clothingReserve:s.clothingReserve,
    diaperingMode:s.diaperingMode,
    feedingMode:s.feedingMode,
    budgetTier:s.budgetTier
  };
  return {
    profile,
    settings,
    onboarding:{schemaVersion:o.schemaVersion,status:o.status,currentStep:o.currentStep,completedAt:o.completedAt ?? null},
    ...ref
  };
}

function buildDependencySnapshot(lock){
  const c=lock?.currentCanonical;
  if(!c) throw new Error("dependency lock inválido.");
  const required=["catalog","pricing","rules","onboardingCode","onboardingConfig","climateBundle"];
  for(const key of required){
    if(!c[key]?.sha256) throw new Error(`dependency lock sem ${key}.sha256`);
  }
  return jsonClone({contractVersion:lock.contractVersion||"4.8D1",currentCanonical:c,compatibility:lock.compatibility||null});
}

function buildClimateSnapshot({climatePersonalizationEnabled=true,climateResult=null}={}){
  if(!climatePersonalizationEnabled){
    return {status:"climate_disabled",mode:"generic_balanced",applied:false,cacheHit:null,cacheKey:null,thermalProfile:null};
  }
  if(climateResult?.status==="climate_personalized" && climateResult?.thermalProfile){
    return {
      status:"climate_personalized",
      mode:"climate_personalized",
      applied:true,
      cacheHit:typeof climateResult.cacheHit==="boolean"?climateResult.cacheHit:null,
      cacheKey:climateResult.climateRecord?.cacheKey || null,
      thermalProfile:jsonClone(climateResult.thermalProfile)
    };
  }
  const allowedFallback=new Set(["climate_component_unavailable","climate_temporarily_unavailable"]);
  const status=allowedFallback.has(climateResult?.status)?climateResult.status:"climate_component_unavailable";
  return {status,mode:"generic_balanced",applied:false,cacheHit:null,cacheKey:null,thermalProfile:null};
}

function buildDecisionSnapshot(decisions={}){
  const acceptedOptionalItemIds=uniqueSorted(decisions.acceptedOptionalItemIds);
  const rejectedOptionalItemIds=uniqueSorted(decisions.rejectedOptionalItemIds);
  const overlap=acceptedOptionalItemIds.filter(id=>rejectedOptionalItemIds.includes(id));
  if(overlap.length) throw new Error(`Item opcional não pode estar aceito e rejeitado: ${overlap.join(",")}`);
  return {acceptedOptionalItemIds,rejectedOptionalItemIds};
}

function normalizeLineage(lineage={}){
  const reason=lineage.reason || "initial";
  if(!CONTRACT.lineageReasons.includes(reason)) throw new Error(`lineage.reason inválido: ${reason}`);
  const parentPlanId=lineage.parentPlanId || null;
  if(parentPlanId!==null) assertPlanId(parentPlanId);
  if(reason==="initial" && parentPlanId!==null) throw new Error("Plano inicial não deve ter parentPlanId.");
  if(reason!=="initial" && !parentPlanId) throw new Error("Recalculo exige parentPlanId.");
  return {reason,parentPlanId};
}

function createPlanDraft({planId,familyId,childId,child,eligibility,dependencyLock,climatePersonalizationEnabled=true,climateResult=null,decisions={},lineage={},createdAt=Date.now(),createdByUid=null}={}){
  assertPlanId(planId); assertPlanEligible(child,eligibility); assertFiniteTimestamp(createdAt,"createdAt");
  if(createdByUid!==null) assertNonEmptyString(createdByUid,"createdByUid");
  const inputSnapshot=buildInputSnapshot(child);
  return {
    schemaVersion:CONTRACT.schemaVersion,
    contractVersion:CONTRACT.version,
    planId,
    status:"draft",
    metadata:{familyId,childId,createdAt:Number(createdAt),completedAt:null,createdByUid:createdByUid||null,horizon:{fromAgeMonths:0,toAgeMonths:12}},
    lineage:normalizeLineage(lineage),
    dependencySnapshot:buildDependencySnapshot(dependencyLock),
    inputSnapshot,
    climateSnapshot:buildClimateSnapshot({climatePersonalizationEnabled,climateResult}),
    decisionSnapshot:buildDecisionSnapshot(decisions),
    generatorSnapshot:null,
    generatedSnapshot:{items:{},suggestions:{}},
    financeSnapshot:{status:"pending",budgetTier:inputSnapshot.settings.budgetTier},
    timelineSnapshot:{status:"pending",referenceDate:inputSnapshot.referenceDate},
    audit:{persistable:false,containsOperationalAcquisitions:false}
  };
}

function normalizePlanItem(item,key){
  if(!item || typeof item!=="object") throw new Error(`Item gerado inválido: ${key}`);
  const out=jsonClone(item);
  out.itemId=out.itemId || key;
  if(out.itemId!==key) throw new Error(`generated item key/id divergente: ${key}`);
  const id=out.identitySnapshot || {};
  for(const f of ["name","category","priority","quantityUnit"]){ assertNonEmptyString(id[f],`generatedItems.${key}.identitySnapshot.${f}`); }
  if(!out.target || !CONTRACT.targetKinds.includes(out.target.kind)) throw new Error(`target.kind inválido em ${key}`);
  return out;
}
function normalizePlanMap(map,label){
  const out={};
  for(const key of Object.keys(map||{}).sort()) out[key]=normalizePlanItem(map[key],key);
  return out;
}
function containsKeyDeep(value,keyName){
  if(!value || typeof value!=="object") return false;
  if(Object.prototype.hasOwnProperty.call(value,keyName)) return true;
  return Object.values(value).some(v=>containsKeyDeep(v,keyName));
}

function finalizePlanSnapshot(draft,{generatedItems,suggestions={},financeSnapshot,timelineSnapshot,generatorSnapshot,completedAt=Date.now()}={}){
  const dv=validatePlanSnapshot(draft,{requirePersistable:false});
  if(!dv.valid || draft.status!=="draft") throw new Error(`Draft inválido: ${dv.errors.join("; ")}`);
  assertFiniteTimestamp(completedAt,"completedAt");
  const items=normalizePlanMap(generatedItems,"items");
  const sug=normalizePlanMap(suggestions,"suggestions");
  for(const id of Object.keys(sug)) if(items[id]) throw new Error(`Item não pode estar simultaneamente planejado e sugerido: ${id}`);
  const plan=jsonClone(draft);
  plan.status="ready";
  plan.metadata.completedAt=Number(completedAt);
  plan.generatedSnapshot={items,suggestions:sug};
  plan.financeSnapshot=jsonClone(financeSnapshot);
  plan.timelineSnapshot=jsonClone(timelineSnapshot);
  plan.generatorSnapshot=jsonClone(generatorSnapshot);
  plan.audit={persistable:true,containsOperationalAcquisitions:false};
  const v=validatePlanSnapshot(plan,{requirePersistable:true});
  if(!v.valid) throw new Error(`Plano final inválido: ${v.errors.join("; ")}`);
  return plan;
}

function validatePlanSnapshot(plan,{requirePersistable=false}={}){
  const errors=[];
  if(!plan || typeof plan!=="object") return {valid:false,errors:["plan ausente"]};
  if(plan.schemaVersion!==1) errors.push("schemaVersion inválido");
  if(plan.contractVersion!==CONTRACT.version) errors.push("contractVersion inválido");
  try{assertPlanId(plan.planId);}catch(e){errors.push(e.message);}
  if(!CONTRACT.planStatus.includes(plan.status)) errors.push("status inválido");
  const m=plan.metadata||{};
  for(const f of ["familyId","childId"]){ if(typeof m[f]!=="string"||!m[f]) errors.push(`metadata.${f} ausente`); }
  if(!Number.isFinite(Number(m.createdAt))) errors.push("metadata.createdAt inválido");
  if(m.horizon?.fromAgeMonths!==0 || m.horizon?.toAgeMonths!==12) errors.push("horizon deve ser 0-12 meses");
  const i=plan.inputSnapshot||{};
  if(!i.referenceDate || !["dueDate","birthDate"].includes(i.referenceDateSource)) errors.push("referenceDate snapshot inválida");
  if(!CONTRACT.budgetTiers.includes(i.settings?.budgetTier)) errors.push("budgetTier snapshot inválido");
  const c=plan.climateSnapshot||{};
  if(!CONTRACT.climateStatuses.includes(c.status)) errors.push("climateSnapshot.status inválido");
  if(!CONTRACT.climateModes.includes(c.mode)) errors.push("climateSnapshot.mode inválido");
  if(c.applied===true && !c.thermalProfile) errors.push("clima aplicado exige thermalProfile");
  if(c.applied!==true && c.thermalProfile) errors.push("fallback climático não deve carregar thermalProfile");
  if(!plan.dependencySnapshot?.currentCanonical?.catalog?.sha256) errors.push("dependencySnapshot incompleto");
  if(containsKeyDeep(plan,"acquisitions")) errors.push("snapshot de plano não pode conter acquisitions");
  if(plan.status==="ready"){
    if(!m.completedAt || !Number.isFinite(Number(m.completedAt))) errors.push("ready exige metadata.completedAt");
    const items=plan.generatedSnapshot?.items||{};
    if(Object.keys(items).length===0) errors.push("ready exige itens gerados");
    for(const [key,item] of Object.entries(items)){
      try{normalizePlanItem(item,key);}catch(e){errors.push(e.message);}
    }
    for(const [key,item] of Object.entries(plan.generatedSnapshot?.suggestions||{})){
      try{normalizePlanItem(item,key);}catch(e){errors.push(e.message);}
      if(items[key]) errors.push(`item duplicado em items/suggestions: ${key}`);
    }
    if(plan.financeSnapshot?.status!=="ready") errors.push("ready exige financeSnapshot.status=ready");
    if(plan.timelineSnapshot?.status!=="ready") errors.push("ready exige timelineSnapshot.status=ready");
    if(plan.financeSnapshot?.budgetTier!==i.settings?.budgetTier) errors.push("finance budgetTier diverge do input snapshot");
    const g=plan.generatorSnapshot||{};
    for(const f of ["planGeneratorVersion","financeEngineVersion","timelineEngineVersion"]){ if(typeof g[f]!=="string"||!g[f]) errors.push(`generatorSnapshot.${f} ausente`); }
    if(plan.audit?.persistable!==true) errors.push("ready exige audit.persistable=true");
  }
  if(requirePersistable && plan.status!=="ready") errors.push("apenas plano ready pode ser persistido");
  return {valid:errors.length===0,errors};
}

function buildActivationUpdateMap({familyId,childId,plan}={}){
  const v=validatePlanSnapshot(plan,{requirePersistable:true});
  if(!v.valid) throw new Error(`Plano não persistível: ${v.errors.join("; ")}`);
  if(plan.metadata.familyId!==familyId || plan.metadata.childId!==childId) throw new Error("Escopo do plano diverge do caminho Firebase.");
  return {
    [firebasePlanPath(familyId,childId,plan.planId)]:jsonClone(plan),
    [firebaseCurrentPlanPath(familyId,childId)]:plan.planId
  };
}

module.exports={
  CONTRACT,jsonClone,uniqueSorted,assertPlanId,
  childBasePath,plansBasePath,firebasePlanPath,firebaseCurrentPlanPath,firebaseOperationalItemPath,
  referenceFromProfile,assertPlanEligible,buildInputSnapshot,buildDependencySnapshot,buildClimateSnapshot,buildDecisionSnapshot,normalizeLineage,
  createPlanDraft,finalizePlanSnapshot,validatePlanSnapshot,buildActivationUpdateMap,containsKeyDeep
};

  globalThis.CoraV48Engine.D1=module.exports;
})();


(function(){
  const module={exports:{}};
  const exports=module.exports;
  const require = (id) => {
  if (id === "../dependencies/d1/plan-contract-v4.8d1.js") return globalThis.CoraV48Engine.D1;
  if (id === "../dependencies/c/clothing-engine-v4.8c3.1.1.js") return globalThis.CoraV48Engine.Clothing;
  throw new Error("Unsupported browser require: "+id);
};

"use strict";

// Cora V4.8D2 — complete 0–12 month layette plan generator.
// D2 consumes the D1 draft contract + frozen A/B/C artifacts.
// IMPORTANT: D2 does NOT import the climate API or thermal engine. It only consumes
// the optional thermalProfile already frozen into draft.climateSnapshot and delegates
// clothing composition to the climate-independent C3.1.1 clothing core.

const D1 = require("../dependencies/d1/plan-contract-v4.8d1.js");
const Clothing = require("../dependencies/c/clothing-engine-v4.8c3.1.1.js");

const VERSION="4.8D2";
const DISPOSITIONS=Object.freeze(["planned","suggested","deferred","inactive","excluded","rejected"]);
const CONDITION_STATES=Object.freeze(["active","inactive","unresolved","not_applicable"]);
const CORE_CLOTHING_IDS=Object.freeze(["body","peca_inteira","parte_baixo","parte_cima_separada","camada_externa","meias"]);
const STYLE_IDS=Object.freeze(["vestido_estilo_menina","saia_estilo_menina","laco_faixa_estilo_menina"]);
const MATERIAL_EXPOSURE_MIN=0.20;

function clone(v){ return v===undefined?undefined:JSON.parse(JSON.stringify(v)); }
function isNum(v){ return Number.isFinite(Number(v)); }
function nonneg(v){ return isNum(v) && Number(v)>=0; }
function unique(arr){ return [...new Set(arr||[])]; }
function hasOwn(o,k){ return Object.prototype.hasOwnProperty.call(o||{},k); }

function rebuildChildFromDraft(draft){
  const i=draft?.inputSnapshot;
  if(!i?.profile || !i?.settings) throw new Error("draft sem inputSnapshot V4.8D1.");
  return {profile:clone(i.profile),enxoval:{settings:clone(i.settings),onboarding:clone(i.onboarding)}};
}

function meaningfulExposure(thermalProfile,classNames,minShare=MATERIAL_EXPOSURE_MIN){
  if(!thermalProfile?.agePeriods) return null;
  let best=0;
  for(const p of Object.values(thermalProfile.agePeriods)){
    const e=p?.classExposure;
    if(!e) continue;
    const share=classNames.reduce((s,c)=>s+Number(e[c]||0),0);
    if(share>best) best=share;
  }
  return best>=minShare;
}

function feedingSignal(mode,signal){
  const known=["undecided","direct_breastfeeding","expressed_milk","mixed","formula"];
  if(!known.includes(mode)) return "unresolved";
  if(mode==="undecided") return "unresolved";
  if(signal==="formula") return ["formula","mixed"].includes(mode)?"active":"inactive";
  if(signal==="bottle") return ["expressed_milk","mixed","formula"].includes(mode)?"active":"inactive";
  if(signal==="expressing"){
    if(mode==="expressed_milk") return "active";
    if(mode==="formula") return "inactive";
    return "unresolved"; // mixed/direct do not prove pumping.
  }
  if(signal==="breast_use") return ["direct_breastfeeding","expressed_milk","mixed"].includes(mode)?"active":"inactive";
  return "unresolved";
}

function evaluateNamedCondition(condition,ctx){
  const s=ctx.settings, climate=ctx.climateSnapshot;
  switch(condition){
    case "familia_usara_carro": return s.car?.usesCar===true?"active":"inactive";
    case "familia_opta_por_fraldas_de_pano_ou_uso_hibrido": return ["cloth","hybrid"].includes(s.diaperingMode)?"active":"inactive";
    case "feedingMode_formula_ou_mixed": return feedingSignal(s.feedingMode,"formula");
    case "uso_de_formula": return feedingSignal(s.feedingMode,"formula");
    case "rotina_inclui_mamadeira": return feedingSignal(s.feedingMode,"bottle");
    case "uso_de_mamadeira": return feedingSignal(s.feedingMode,"bottle");
    case "uso_frequente_de_mamadeira": return feedingSignal(s.feedingMode,"bottle");
    case "ordenha": return feedingSignal(s.feedingMode,"expressing");
    case "oferta_de_leite_sem_mamadeira": return "unresolved";
    case "ordenha_ou_formula_e_passeios": {
      const feedFormula=feedingSignal(s.feedingMode,"formula");
      const expressing=feedingSignal(s.feedingMode,"expressing");
      if(feedFormula==="inactive" && expressing==="inactive") return "inactive";
      return "unresolved"; // passeios não são pergunta do B.
    }
    case "uso_de_bolsa_termica_para_leite": return "unresolved";
    case "passeios_externos": return "unresolved";
    case "regiao_ou_ambiente_com_mosquitos": return "unresolved";
    case "somente_se_modelo_usar_capa": return "unresolved";
    case "banheira_sem_suporte_ou_suporte_desejado_separadamente": return "unresolved";
    case "clima_frio_ou_muito_frio": {
      if(climate?.applied!==true || !climate.thermalProfile) return "unresolved";
      return meaningfulExposure(climate.thermalProfile,["cold","very_cold"]) ? "active" : "inactive";
    }
    case "mais_util_com_AC_aquecimento_ou_extremos_termicos": {
      if(["sometimes","frequent"].includes(s.airConditioning)) return "active";
      if(climate?.applied===true && climate.thermalProfile){
        return meaningfulExposure(climate.thermalProfile,["very_hot","very_cold"]) ? "active" : "inactive";
      }
      return "unresolved"; // aquecimento não é capturado no B.
    }
    default: return "unresolved";
  }
}

function evaluateIntrinsicConditional(item,ctx){
  const mode=ctx.settings.feedingMode;
  switch(item.id){
    case "bomba_leite": return feedingSignal(mode,"expressing");
    case "absorventes_seios": return feedingSignal(mode,"breast_use");
    case "creme_lanolina":
    case "intermediario_silicone":
    case "conchas_seios": {
      const breast=feedingSignal(mode,"breast_use");
      if(breast==="inactive") return "inactive";
      return "unresolved"; // necessidade clínica/prática não é presumida.
    }
    case "cinta_pos_parto": return "unresolved";
    default: return "unresolved";
  }
}

function evaluateConditionState(item,ctx){
  const conditions=item.conditions||[];
  if(conditions.length){
    const states=conditions.map(c=>evaluateNamedCondition(c,ctx));
    if(states.includes("inactive")) return {state:"inactive",conditionStates:Object.fromEntries(conditions.map((c,i)=>[c,states[i]]))};
    if(states.every(x=>x==="active")) return {state:"active",conditionStates:Object.fromEntries(conditions.map((c,i)=>[c,states[i]]))};
    return {state:"unresolved",conditionStates:Object.fromEntries(conditions.map((c,i)=>[c,states[i]]))};
  }
  if(item.priority==="conditional" || item.budgetEligibility==="when_condition_active"){
    return {state:evaluateIntrinsicConditional(item,ctx),conditionStates:{implicit_conditional:true}};
  }
  return {state:"not_applicable",conditionStates:{}};
}

function styleMatches(item,styleProfile){
  if(!Array.isArray(item.styleProfiles) || item.styleProfiles.length===0) return true;
  return item.styleProfiles.includes(styleProfile);
}

function disposableDiaperDisposition(item,ctx){
  if(item.id!=="fraldas_descartaveis") return null;
  if(ctx.settings.diaperingMode==="cloth") return {disposition:"inactive",reason:"cloth_mode_replaces_full_disposable_plan"};
  return {disposition:"planned",reason:ctx.settings.diaperingMode==="hybrid"?"hybrid_partial_disposable_plan":"disposable_mode"};
}

function decideDisposition(item,ctx){
  if(item.budgetEligibility==="excluded" || item.usagePolicy==="do_not_recommend") return {disposition:"excluded",reason:"safety_or_catalog_exclusion",conditionState:"not_applicable"};

  const diaperOverride=disposableDiaperDisposition(item,ctx);
  if(diaperOverride) return {...diaperOverride,conditionState:"not_applicable"};

  const accepted=ctx.accepted.has(item.id), rejected=ctx.rejected.has(item.id);
  const c=evaluateConditionState(item,ctx);

  if(item.budgetEligibility==="after_acceptance"){
    if(accepted) return {disposition:"planned",reason:"explicitly_accepted_optional",conditionState:c.state,conditionStates:c.conditionStates};
    if(rejected) return {disposition:"rejected",reason:"explicitly_rejected_optional",conditionState:c.state,conditionStates:c.conditionStates};
    if(!styleMatches(item,ctx.settings.styleProfile)) return {disposition:"inactive",reason:"style_profile_not_suggested",conditionState:c.state,conditionStates:c.conditionStates};
    if(c.state==="inactive") return {disposition:"inactive",reason:"optional_condition_inactive",conditionState:c.state,conditionStates:c.conditionStates};
    if(c.state==="unresolved") return {disposition:"deferred",reason:"optional_condition_unresolved",conditionState:c.state,conditionStates:c.conditionStates};
    return {disposition:"suggested",reason:"optional_awaiting_acceptance",conditionState:c.state,conditionStates:c.conditionStates};
  }

  if(item.budgetEligibility==="when_condition_active"){
    if(c.state==="active") return {disposition:"planned",reason:"condition_active",conditionState:c.state,conditionStates:c.conditionStates};
    if(c.state==="inactive") return {disposition:"inactive",reason:"condition_inactive",conditionState:c.state,conditionStates:c.conditionStates};
    return {disposition:"deferred",reason:"condition_unresolved",conditionState:c.state,conditionStates:c.conditionStates};
  }

  if(item.budgetEligibility==="included_if_in_generated_plan"){
    if(c.state==="inactive") return {disposition:"inactive",reason:"catalog_condition_inactive",conditionState:c.state,conditionStates:c.conditionStates};
    if(c.state==="unresolved") return {disposition:"deferred",reason:"catalog_condition_unresolved",conditionState:c.state,conditionStates:c.conditionStates};
    return {disposition:"planned",reason:"catalog_default",conditionState:c.state,conditionStates:c.conditionStates};
  }

  return {disposition:"excluded",reason:"unknown_budget_policy",conditionState:c.state,conditionStates:c.conditionStates};
}

function identitySnapshot(item){
  return {
    name:item.name,category:item.category,subcategory:item.subcategory,priority:item.priority,goalType:item.goalType,
    quantityUnit:item.quantityUnit,pricingKey:item.pricingKey
  };
}
function planningSnapshot(item){
  return {
    itemType:item.itemType,useFromAgeMonths:item.useFromAgeMonths,useUntilAgeMonths:item.useUntilAgeMonths,
    purchaseTiming:item.purchaseTiming,purchaseLeadDays:item.purchaseLeadDays,climateSensitivity:item.climateSensitivity,
    recurringCost:Boolean(item.recurringCost),budgetEligibility:item.budgetEligibility,usagePolicy:item.usagePolicy,
    conditions:clone(item.conditions||[]),variantOptions:clone(item.variants||[]),notes:clone(item.notes||[])
  };
}
function basePlanItem(item,dispositionInfo){
  return {
    itemId:item.id,
    identitySnapshot:identitySnapshot(item),
    planningSnapshot:planningSnapshot(item),
    inclusionSnapshot:{
      disposition:dispositionInfo.disposition,reason:dispositionInfo.reason,
      conditionState:dispositionInfo.conditionState||"not_applicable",
      conditionStates:clone(dispositionInfo.conditionStates||{})
    },
    target:null
  };
}

function resolveVariantSnapshot(item,ctx){
  const options=clone(item.variants||[]);
  let selectedVariant=null, selectionStatus=options.length?"not_selected":"not_applicable";
  if(item.id==="bebe_conforto"){
    const iso=ctx.settings.car?.hasIsofix;
    if(iso==="yes"){ selectedVariant="com_isofix"; selectionStatus="derived_from_profile"; }
    else if(iso==="no"){ selectedVariant="sem_isofix"; selectionStatus="derived_from_profile"; }
    else if(iso==="unknown"){ selectionStatus="requires_user_selection"; }
  }
  return {options,selectedVariant,selectionStatus};
}

function resolveStaticQuantity(item,{forSuggestion=false,explicitlySelected=false}={}){
  if(isNum(item.defaultQuantity) && Number(item.defaultQuantity)>0){
    return {quantity:Number(item.defaultQuantity),quantitySource:"catalog_default",requiresUserInput:false};
  }
  if(item.id==="fraldas_pano"){
    return {quantity:null,quantitySource:"requires_user_definition",requiresUserInput:true,reason:"frozen_catalog_says_quantity_depends_on_usage_and_laundry_routine"};
  }
  // D2 design convention: once a discrete optional/conditional object has actually been selected,
  // a zero/null catalog default means one object, unless a specialized rule above says otherwise.
  if(forSuggestion || explicitlySelected || item.budgetEligibility==="when_condition_active"){
    return {quantity:1,quantitySource:"d2_selected_discrete_item_default",requiresUserInput:false};
  }
  if(isNum(item.defaultQuantity)) return {quantity:Number(item.defaultQuantity),quantitySource:"catalog_default",requiresUserInput:false};
  return {quantity:null,quantitySource:"requires_user_definition",requiresUserInput:true};
}

function recurringTarget(item,ctx){
  const q=resolveStaticQuantity(item,{explicitlySelected:true});
  if(item.id==="fraldas_descartaveis"){
    const phases=clone(ctx.pricing?.recurringCostModel?.diapers?.planningUsePerDay||[]);
    if(ctx.settings.diaperingMode==="hybrid"){
      return {kind:"recurring",initialStockQuantity:null,quantityUnit:item.quantityUnit,consumptionMode:"hybrid_ratio_not_invented",requiresUserInput:true,
        phases:phases.map(p=>({...p,benchmarkFullDisposableUnitsPerDay:p.unitsPerDay,unitsPerDay:null}))};
    }
    return {kind:"recurring",initialStockQuantity:null,quantityUnit:item.quantityUnit,consumptionMode:"planning_units_per_day_by_age",requiresUserInput:false,phases};
  }
  if(item.id==="formula_infantil"){
    return {kind:"recurring",initialStockQuantity:q.quantity,quantityUnit:item.quantityUnit,consumptionMode:"actual_product_and_real_consumption",requiresUserInput:true};
  }
  let consumptionMode="learn_from_purchase_intervals";
  if(item.id==="lencos_umedecidos") consumptionMode="estimate_only_if_family_marks_frequent_use";
  if(["sabonete_gel","hidratante","creme_barreira"].includes(item.id)) consumptionMode="initial_stock_then_learn_from_purchase_intervals";
  return {kind:"recurring",initialStockQuantity:q.quantity,quantityUnit:item.quantityUnit,consumptionMode,requiresUserInput:q.requiresUserInput};
}

function staticTarget(item,ctx,{forSuggestion=false,explicitlySelected=false}={}){
  if(item.recurringCost) return recurringTarget(item,ctx);
  if(item.suggestedQuantityBySize){
    const sizes={}; for(const size of Clothing.SIZE_ORDER) sizes[size]={total:Number(item.suggestedQuantityBySize[size]||0),variants:{}};
    return {kind:"by_size",sizes,quantitySource:"catalog_style_suggestion",requiresUserInput:false};
  }
  if(item.sizeIndependent && isNum(item.suggestedTotalQuantity)){
    return {kind:"single",quantity:Number(item.suggestedTotalQuantity),quantitySource:"catalog_style_suggestion",requiresUserInput:false,variant:resolveVariantSnapshot(item,ctx)};
  }
  const q=resolveStaticQuantity(item,{forSuggestion,explicitlySelected});
  return {kind:"single",...q,variant:resolveVariantSnapshot(item,ctx)};
}

function buildClothingTargets(draft,ctx){
  const child=rebuildChildFromDraft(draft);
  const climateApplied=draft.climateSnapshot?.applied===true;
  const plan=Clothing.buildClothingPlan({
    child,
    thermalProfile:climateApplied?draft.climateSnapshot.thermalProfile:null,
    climatePersonalizationEnabled:climateApplied
  });
  if(!plan.validation?.valid) throw new Error(`C3.1.1 retornou plano inválido: ${(plan.validation.errors||[]).join(",")}`);
  const targets={};
  for(const id of CORE_CLOTHING_IDS){
    const sizes={};
    for(const size of Clothing.SIZE_ORDER){
      const x=plan.sizes[size].items[id];
      if(!x) throw new Error(`C3.1.1 sem item ${id} em ${size}`);
      let total;
      if(id==="meias") total=Number(x.pairs||0); else total=Number(x.total||0);
      sizes[size]={total,variants:clone(x.variants||{})};
    }
    targets[id]={kind:"by_size",sizes,quantitySource:"clothing_engine_v4.8c3.1.1",requiresUserInput:false};
  }
  return {targets,clothingPlan:plan};
}

function validateCatalog(catalog){
  if(!catalog || !Array.isArray(catalog.items)) throw new Error("catalog.items ausente.");
  const ids=catalog.items.map(x=>x.id); if(new Set(ids).size!==ids.length) throw new Error("Catálogo contém IDs duplicados.");
  return true;
}

function validateGenerationResult(result,catalog){
  const errors=[];
  const items=result.generatedItems||{}, suggestions=result.suggestions||{}, ev=result.evaluation||{};
  for(const id of Object.keys(items)) if(suggestions[id]) errors.push(`duplicado items/suggestions: ${id}`);
  const catalogIds=new Set((catalog.items||[]).map(x=>x.id));
  for(const id of [...Object.keys(items),...Object.keys(suggestions)]) if(!catalogIds.has(id)) errors.push(`output fora do catálogo: ${id}`);
  if(Object.keys(ev).length!==catalogIds.size) errors.push(`coverage ${Object.keys(ev).length}/${catalogIds.size}`);
  for(const id of catalogIds){ if(!ev[id]) errors.push(`item não avaliado: ${id}`); else if(!DISPOSITIONS.includes(ev[id].disposition)) errors.push(`disposition inválida: ${id}`); }
  if(D1.containsKeyDeep({items,suggestions},"acquisitions")) errors.push("D2 não pode copiar acquisitions");
  for(const [id,x] of Object.entries(items)){
    if(!x.target || !D1.CONTRACT.targetKinds.includes(x.target.kind)) errors.push(`target inválido: ${id}`);
    if(x.inclusionSnapshot?.disposition!=="planned") errors.push(`item planejado sem disposition planned: ${id}`);
  }
  for(const [id,x] of Object.entries(suggestions)){
    if(!x.target || !D1.CONTRACT.targetKinds.includes(x.target.kind)) errors.push(`target sugestão inválido: ${id}`);
    if(x.inclusionSnapshot?.disposition!=="suggested") errors.push(`suggestion sem disposition suggested: ${id}`);
  }
  return {valid:errors.length===0,errors};
}

function summarizeEvaluation(evaluation){
  const counts=Object.fromEntries(DISPOSITIONS.map(x=>[x,0]));
  const deferredItemIds=[], unresolvedTargetItemIds=[];
  for(const [id,e] of Object.entries(evaluation)){
    counts[e.disposition]++;
    if(e.disposition==="deferred") deferredItemIds.push(id);
  }
  return {counts,deferredItemIds:deferredItemIds.sort(),unresolvedTargetItemIds};
}

function generatePlanContent({draft,catalog,rules,pricing}={}){
  validateCatalog(catalog);
  const dv=D1.validatePlanSnapshot(draft,{requirePersistable:false});
  if(!dv.valid || draft.status!=="draft") throw new Error(`D2 exige draft D1 válido: ${dv.errors.join("; ")}`);
  const accepted=new Set(draft.decisionSnapshot?.acceptedOptionalItemIds||[]);
  const rejected=new Set(draft.decisionSnapshot?.rejectedOptionalItemIds||[]);
  const ctx={draft,settings:draft.inputSnapshot.settings,climateSnapshot:draft.climateSnapshot,accepted,rejected,rules,pricing};
  const {targets:clothingTargets,clothingPlan}=buildClothingTargets(draft,ctx);
  const generatedItems={}, suggestions={}, evaluation={};

  for(const item of catalog.items){
    const d=decideDisposition(item,ctx);
    evaluation[item.id]={...d};
    if(d.disposition!=="planned" && d.disposition!=="suggested") continue;
    const planItem=basePlanItem(item,d);
    const explicitlySelected=accepted.has(item.id) || d.reason==="condition_active";
    if(CORE_CLOTHING_IDS.includes(item.id)) planItem.target=clone(clothingTargets[item.id]);
    else planItem.target=staticTarget(item,ctx,{forSuggestion:d.disposition==="suggested",explicitlySelected});
    if(d.disposition==="planned") generatedItems[item.id]=planItem; else suggestions[item.id]=planItem;
  }

  // Clothing style suggestions are catalog-driven and must agree with C3.1.1.
  for(const id of STYLE_IDS){
    if(suggestions[id] && !hasOwn(clothingPlan.optionalStyleSuggestions,id)){
      throw new Error(`Catálogo sugeriu ${id}, mas C3.1.1 não sugeriu para styleProfile=${ctx.settings.styleProfile}`);
    }
  }

  const validation=validateGenerationResult({generatedItems,suggestions,evaluation},catalog);
  if(!validation.valid) throw new Error(`D2 output inválido: ${validation.errors.join("; ")}`);
  const summary=summarizeEvaluation(evaluation);
  for(const [id,x] of Object.entries(generatedItems)) if(x.target?.requiresUserInput) summary.unresolvedTargetItemIds.push(id);
  summary.unresolvedTargetItemIds.sort();
  summary.catalogItems=catalog.items.length;
  summary.plannedItems=Object.keys(generatedItems).length;
  summary.suggestions=Object.keys(suggestions).length;
  summary.climateMode=draft.climateSnapshot.mode;
  summary.clothingEngineVersion=clothingPlan.engineVersion;

  return {schemaVersion:1,generatorVersion:VERSION,generatedItems,suggestions,evaluation,summary,validation,clothingPlan};
}

function applyD2ResultToDraft(draft,result){
  const dv=D1.validatePlanSnapshot(draft,{requirePersistable:false});
  if(!dv.valid || draft.status!=="draft") throw new Error("applyD2 exige draft válido.");
  if(!result?.validation?.valid) throw new Error("resultado D2 inválido.");
  const out=clone(draft);
  out.generatedSnapshot={items:clone(result.generatedItems),suggestions:clone(result.suggestions)};
  out.generatorSnapshot={planGeneratorVersion:VERSION,financeEngineVersion:null,timelineEngineVersion:null};
  out.audit={...(out.audit||{}),persistable:false,containsOperationalAcquisitions:false,d2Complete:true,d2CatalogCoverage:result.summary.catalogItems,d2PlannedItems:result.summary.plannedItems,d2Suggestions:result.summary.suggestions,d2DeferredItems:result.summary.counts.deferred,d2UnresolvedTargets:clone(result.summary.unresolvedTargetItemIds)};
  // D2 must never advance these envelopes; D3 owns both.
  out.financeSnapshot={...out.financeSnapshot,status:"pending"};
  out.timelineSnapshot={...out.timelineSnapshot,status:"pending"};
  return out;
}

module.exports={
  VERSION,DISPOSITIONS,CONDITION_STATES,CORE_CLOTHING_IDS,STYLE_IDS,MATERIAL_EXPOSURE_MIN,
  rebuildChildFromDraft,meaningfulExposure,feedingSignal,evaluateNamedCondition,evaluateIntrinsicConditional,evaluateConditionState,
  styleMatches,decideDisposition,identitySnapshot,planningSnapshot,resolveVariantSnapshot,resolveStaticQuantity,recurringTarget,staticTarget,
  buildClothingTargets,validateCatalog,validateGenerationResult,summarizeEvaluation,generatePlanContent,applyD2ResultToDraft
};

  globalThis.CoraV48Engine.D2=module.exports;
})();


(function(){
  const module={exports:{}};
  const exports=module.exports;
  const require = (id) => {
  if (id === "../dependencies/d1/plan-contract-v4.8d1.js") return globalThis.CoraV48Engine.D1;
  throw new Error("Unsupported browser require: "+id);
};

"use strict";

// Cora V4.8D3 — finance + purchase timeline.
// Consumes a D2-filled D1 draft. Does NOT regenerate items and NEVER reads acquisitions.

const D1=require("../dependencies/d1/plan-contract-v4.8d1.js");

const VERSION="4.8D3";
const FINANCE_ENGINE_VERSION="4.8D3-finance";
const TIMELINE_ENGINE_VERSION="4.8D3-timeline";
const BUDGET_TIERS=Object.freeze(["economic","intermediate","premium"]);
const SIZE_ORDER=Object.freeze(["RN","P","M","G","GG"]);
const DEFAULT_SIZE_START_MONTHS=Object.freeze({RN:0,P:1,M:3,G:6,GG:9});
const NEXT_PHASE_DAYS=90; // D3 UX convention; exact date/month remains source of truth.

function clone(v){return v===undefined?undefined:JSON.parse(JSON.stringify(v));}
function isNum(v){return v!==null&&v!==undefined&&v!==""&&Number.isFinite(Number(v));}
function round2(v){return Math.round((Number(v)+Number.EPSILON)*100)/100;}
function assertIsoDate(v,label="date"){
 if(typeof v!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(v))throw new Error(`${label} inválida.`);
 const [y,m,d]=v.split("-").map(Number);const x=new Date(Date.UTC(y,m-1,d));
 if(x.getUTCFullYear()!==y||x.getUTCMonth()!==m-1||x.getUTCDate()!==d)throw new Error(`${label} inválida.`);
 return x;
}
function iso(d){return d.toISOString().slice(0,10);}
function daysInMonthUTC(y,m){return new Date(Date.UTC(y,m,0)).getUTCDate();}
function addMonthsClamped(dateIso,months){
 const d=assertIsoDate(dateIso);const idx=d.getUTCMonth()+Number(months);const y=d.getUTCFullYear()+Math.floor(idx/12);const m=((idx%12)+12)%12;const day=Math.min(d.getUTCDate(),daysInMonthUTC(y,m+1));
 return iso(new Date(Date.UTC(y,m,day)));
}
function addDays(dateIso,days){const d=assertIsoDate(dateIso);d.setUTCDate(d.getUTCDate()+Number(days));return iso(d);}
function compareIso(a,b){return assertIsoDate(a)-assertIsoDate(b);}
function daysBetween(a,b){return Math.round((assertIsoDate(b)-assertIsoDate(a))/86400000);}
function monthKey(dateIso){return dateIso.slice(0,7);}
function dateFromTimestamp(ms){const n=Number(ms);if(!Number.isFinite(n)||n<0)throw new Error("timestamp inválido");return new Date(n).toISOString().slice(0,10);}
function hasOwn(o,k){return Object.prototype.hasOwnProperty.call(o||{},k);}

function normalizeOptions(options={}){
 const out={
  asOfDate:options.asOfDate||null,
  itemTierOverrides:clone(options.itemTierOverrides||{}),
  variantOverrides:clone(options.variantOverrides||{}),
  actualUnitPriceByItem:clone(options.actualUnitPriceByItem||{}),
  diaperSizeByAgeMonth:clone(options.diaperSizeByAgeMonth||{}),
  hybridDisposableRatio:options.hybridDisposableRatio===undefined?null:Number(options.hybridDisposableRatio)
 };
 for(const [id,t] of Object.entries(out.itemTierOverrides)) if(!BUDGET_TIERS.includes(t))throw new Error(`tier override inválido em ${id}`);
 for(const [id,p] of Object.entries(out.actualUnitPriceByItem)) if(!isNum(p)||Number(p)<0)throw new Error(`actualUnitPrice inválido em ${id}`);
 if(out.hybridDisposableRatio!==null && (!Number.isFinite(out.hybridDisposableRatio)||out.hybridDisposableRatio<0||out.hybridDisposableRatio>1))throw new Error("hybridDisposableRatio deve estar entre 0 e 1");
 const validDiaperSizes=new Set(["RN","P","M","G","XG","XXG"]);
 for(const [m,s] of Object.entries(out.diaperSizeByAgeMonth)){
  const mi=Number(m); if(!Number.isInteger(mi)||mi<0||mi>11)throw new Error(`idade de fralda inválida: ${m}`);
  if(!validDiaperSizes.has(s))throw new Error(`tamanho de fralda inválido: ${s}`);
 }
 return out;
}

function assertD2Draft(draft){
 const v=D1.validatePlanSnapshot(draft,{requirePersistable:false});
 if(!v.valid||draft.status!=="draft")throw new Error(`D3 exige draft D1 válido: ${v.errors.join("; ")}`);
 if(draft.audit?.d2Complete!==true)throw new Error("D3 exige D2 concluída.");
 if(!draft.generatedSnapshot?.items||Object.keys(draft.generatedSnapshot.items).length===0)throw new Error("D3 exige generatedSnapshot.items da D2.");
 if(draft.financeSnapshot?.status!=="pending"||draft.timelineSnapshot?.status!=="pending")throw new Error("D3 exige envelopes financeiro/timeline pending.");
 return true;
}

function globalTier(draft){const t=draft?.inputSnapshot?.settings?.budgetTier;if(!BUDGET_TIERS.includes(t))throw new Error("budgetTier inválido no draft.");return t;}
function effectiveTier(itemId,draft,opts){return opts.itemTierOverrides[itemId]||globalTier(draft);}
function referenceEntry(pricing,key){const e=pricing?.priceReferences?.[key];if(!e)throw new Error(`pricingKey sem referência: ${key}`);return e;}

function selectedVariant(planItem,opts){
 const id=planItem.itemId;const override=opts.variantOverrides[id];const v=planItem.target?.variant||{};const options=v.options||planItem.planningSnapshot?.variantOptions||[];
 if(override!==undefined){if(options.length && !options.includes(override))throw new Error(`variant override inválida em ${id}: ${override}`);return {variant:override,source:"override"};}
 if(v.selectedVariant)return {variant:v.selectedVariant,source:v.selectionStatus||"snapshot"};
 return {variant:null,source:v.selectionStatus||"not_selected"};
}

function resolveUnitPrice(planItem,pricing,draft,opts,{diaperSize=null}={}){
 const id=planItem.itemId,key=planItem.identitySnapshot?.pricingKey;
 if(!key)return {status:"unresolved",reason:"missing_pricing_key",pricingKey:null,tier:effectiveTier(id,draft,opts),unitReferenceBRL:null};
 const entry=referenceEntry(pricing,key),tier=effectiveTier(id,draft,opts);
 if(entry.model==="by_diaper_size_and_tier"||entry.sizePlanningReferences){
  if(!diaperSize)return {status:"unresolved",reason:"diaper_size_required",pricingKey:key,tier,pricingModel:"by_diaper_size_and_tier",unitReferenceBRL:null};
  const ref=entry.sizePlanningReferences?.[diaperSize]?.[tier]?.reference;
  if(!isNum(ref))return {status:"unresolved",reason:"diaper_size_price_missing",pricingKey:key,tier,pricingModel:"by_diaper_size_and_tier",diaperSize,unitReferenceBRL:null};
  return {status:"resolved",reason:null,pricingKey:key,tier,pricingModel:"by_diaper_size_and_tier",diaperSize,unitReferenceBRL:Number(ref),confidence:entry.confidence||null};
 }
 if(entry.pricingModel==="actual_product"){
  if(hasOwn(opts.actualUnitPriceByItem,id))return {status:"resolved",reason:null,pricingKey:key,tier:null,pricingModel:"actual_product",unitReferenceBRL:Number(opts.actualUnitPriceByItem[id]),priceSource:"actual_product_override",confidence:entry.confidence||null};
  if(isNum(entry.fallbackPlanningReferenceBRL))return {status:"resolved_fallback",reason:"actual_product_not_selected",pricingKey:key,tier:null,pricingModel:"actual_product",unitReferenceBRL:Number(entry.fallbackPlanningReferenceBRL),priceSource:"fallback_planning_reference",confidence:entry.confidence||null};
  return {status:"unresolved",reason:"actual_product_price_required",pricingKey:key,tier:null,pricingModel:"actual_product",unitReferenceBRL:null};
 }
 if(entry.variantPricing){
  const sel=selectedVariant(planItem,opts);if(!sel.variant)return {status:"unresolved",reason:"variant_required",pricingKey:key,tier,pricingModel:"variant_tiered",variant:null,unitReferenceBRL:null};
  const ref=entry.variantPricing?.[sel.variant]?.[tier]?.reference;
  if(!isNum(ref))return {status:"unresolved",reason:"variant_price_missing",pricingKey:key,tier,pricingModel:"variant_tiered",variant:sel.variant,variantSource:sel.source,unitReferenceBRL:null};
  return {status:"resolved",reason:null,pricingKey:key,tier,pricingModel:"variant_tiered",variant:sel.variant,variantSource:sel.source,unitReferenceBRL:Number(ref),confidence:entry.confidence||null};
 }
 const ref=entry?.[tier]?.reference;
 if(!isNum(ref))return {status:"unresolved",reason:"tier_price_missing",pricingKey:key,tier,pricingModel:"tiered",unitReferenceBRL:null};
 return {status:"resolved",reason:null,pricingKey:key,tier,pricingModel:"tiered",unitReferenceBRL:Number(ref),confidence:entry.confidence||null};
}

function sizeStartMonths(catalog){const s=catalog?.sizePlanning||{};const out={};for(const size of SIZE_ORDER)out[size]=isNum(s?.[size]?.fromMonths)?Number(s[size].fromMonths):DEFAULT_SIZE_START_MONTHS[size];return out;}

function oneTimeSegments(planItem,catalog){
 const t=planItem.target||{},segments=[];const baseAge=isNum(planItem.planningSnapshot?.useFromAgeMonths)?Number(planItem.planningSnapshot.useFromAgeMonths):null;
 if(t.kind==="single"){
  if(isNum(t.quantity)&&Number(t.quantity)>0)segments.push({segmentKey:"single",quantity:Number(t.quantity),ageFromMonths:baseAge,size:null});
 }else if(t.kind==="by_size"){
  const starts=sizeStartMonths(catalog);for(const size of SIZE_ORDER){const x=t.sizes?.[size];const q=Number(x?.total||0);if(q>0)segments.push({segmentKey:`size:${size}`,quantity:q,ageFromMonths:starts[size],size,variants:clone(x.variants||{})});}
 }else if(t.kind==="by_phase"){
  for(let i=0;i<(t.phases||[]).length;i++){const p=t.phases[i];const q=Number(p.quantity??p.total??0);if(q>0)segments.push({segmentKey:`phase:${i}`,quantity:q,ageFromMonths:isNum(p.fromMonths)?Number(p.fromMonths):baseAge,phaseIndex:i});}
 }else if(t.kind==="recurring"){
  const q=Number(t.initialStockQuantity||0);if(q>0)segments.push({segmentKey:"initial_stock",quantity:q,ageFromMonths:baseAge,size:null,initialStock:true});
 }
 return segments;
}

function itemFinance(planItem,pricing,draft,catalog,opts){
 const segs=oneTimeSegments(planItem,catalog);const target=planItem.target||{};const price=resolveUnitPrice(planItem,pricing,draft,opts);
 const quantityKnown=segs.length>0 || (target.kind==="single"&&isNum(target.quantity)&&Number(target.quantity)===0);
 const quantity=round2(segs.reduce((s,x)=>s+x.quantity,0));
 let amount=null,status="resolved",reason=null;
 if(target.kind==="recurring" && segs.length===0){status="no_initial_stock";reason="recurring_without_initial_stock";amount=0;}
 else if(target.requiresUserInput===true && !quantityKnown){status="unresolved";reason="quantity_required";}
 else if(["unresolved"].includes(price.status)){status="unresolved";reason=price.reason;}
 else amount=round2(quantity*Number(price.unitReferenceBRL||0));
 const segmentAmounts=segs.map(s=>({...clone(s),unitReferenceBRL:price.unitReferenceBRL,amountBRL:price.unitReferenceBRL===null?null:round2(s.quantity*price.unitReferenceBRL)}));
 return {itemId:planItem.itemId,name:planItem.identitySnapshot.name,category:planItem.identitySnapshot.category,pricing:price,targetKind:target.kind,quantity,quantityUnit:planItem.identitySnapshot.quantityUnit,status,reason,amountBRL:amount,segments:segmentAmounts};
}

function phaseForAgeMonth(phases,ageMonth){return (phases||[]).find(p=>Number(p.fromMonths)<=ageMonth && ageMonth<Number(p.toMonths))||null;}
function ageMonthIndexForDate(referenceDate,dateIso){
 for(let m=0;m<12;m++){const a=addMonthsClamped(referenceDate,m),b=addMonthsClamped(referenceDate,m+1);if(compareIso(dateIso,a)>=0&&compareIso(dateIso,b)<0)return m;}return null;
}

function diaperRecurringForecast(planItem,pricing,draft,opts){
 const t=planItem.target,ref=draft.inputSnapshot.referenceDate,end=addMonthsClamped(ref,12),tier=effectiveTier(planItem.itemId,draft,opts);const entry=referenceEntry(pricing,planItem.identitySnapshot.pricingKey);
 const byMonth={};let d=ref;let totalUnits=0,knownAmount=0,complete=true;
 while(compareIso(d,end)<0){
  const am=ageMonthIndexForDate(ref,d);const phase=phaseForAgeMonth(t.phases,am);let units=phase?phase.unitsPerDay:null;
  if(units===null||units===undefined){
   if(isNum(phase?.benchmarkFullDisposableUnitsPerDay)&&opts.hybridDisposableRatio!==null)units=Number(phase.benchmarkFullDisposableUnitsPerDay)*opts.hybridDisposableRatio;
  }
  const mk=monthKey(d);if(!byMonth[mk])byMonth[mk]={calendarMonth:mk,estimatedUnits:0,knownEstimatedAmountBRL:0,amountComplete:true,estimatedAmountBRL:0,diaperSizes:[]};
  const row=byMonth[mk];
  if(!isNum(units)){row.amountComplete=false;complete=false;}else{
   row.estimatedUnits+=Number(units);totalUnits+=Number(units);
   const size=opts.diaperSizeByAgeMonth[String(am)]||null;
   if(size&&!row.diaperSizes.includes(size))row.diaperSizes.push(size);
   const refPrice=size?entry.sizePlanningReferences?.[size]?.[tier]?.reference:null;
   if(isNum(refPrice)){const x=Number(units)*Number(refPrice);row.knownEstimatedAmountBRL+=x;knownAmount+=x;}else{row.amountComplete=false;complete=false;}
  }
  d=addDays(d,1);
 }
 for(const row of Object.values(byMonth)){
  row.estimatedUnits=round2(row.estimatedUnits);row.knownEstimatedAmountBRL=round2(row.knownEstimatedAmountBRL);row.estimatedAmountBRL=row.amountComplete?row.knownEstimatedAmountBRL:null;
 }
 return {itemId:planItem.itemId,status:complete?"resolved":"partial",reason:complete?null:(opts.hybridDisposableRatio===null&&t.consumptionMode==="hybrid_ratio_not_invented"?"hybrid_ratio_required":"diaper_size_by_age_month_required"),tier,consumptionMode:t.consumptionMode,totalEstimatedUnits:round2(totalUnits),knownEstimatedAmountBRL:round2(knownAmount),amountComplete:complete,calendarMonths:byMonth};
}

function genericRecurringForecast(planItem){
 const t=planItem.target||{};
 return {itemId:planItem.itemId,status:"unresolved",reason:t.consumptionMode==="actual_product_and_real_consumption"?"real_consumption_required":"learn_from_purchase_intervals",consumptionMode:t.consumptionMode||null,calendarMonths:{},knownEstimatedAmountBRL:0,amountComplete:false};
}

function buildFinanceSnapshot({draft,pricing,catalog,options={}}={}){
 assertD2Draft(draft);const opts=normalizeOptions(options);const tier=globalTier(draft);const items={},byCategory={},unresolved=[];let knownTotal=0;
 for(const [id,planItem] of Object.entries(draft.generatedSnapshot.items)){
  const f=itemFinance(planItem,pricing,draft,catalog,opts);items[id]=f;
  if(f.amountBRL!==null){knownTotal+=f.amountBRL;byCategory[f.category]=round2((byCategory[f.category]||0)+f.amountBRL);}else unresolved.push(id);
 }
 const recurringItems={}, recurringMonths={}, recurringUnresolved=[];let recurringKnown=0;
 for(const [id,planItem] of Object.entries(draft.generatedSnapshot.items)){
  if(planItem.target?.kind!=="recurring")continue;
  const r=id==="fraldas_descartaveis"?diaperRecurringForecast(planItem,pricing,draft,opts):genericRecurringForecast(planItem);
  recurringItems[id]=r;recurringKnown+=Number(r.knownEstimatedAmountBRL||0);if(!r.amountComplete)recurringUnresolved.push(id);
  for(const [mk,row] of Object.entries(r.calendarMonths||{})){
   if(!recurringMonths[mk])recurringMonths[mk]={calendarMonth:mk,knownEstimatedAmountBRL:0,amountComplete:true,estimatedAmountBRL:0,itemIds:[]};
   const x=recurringMonths[mk];x.knownEstimatedAmountBRL+=Number(row.knownEstimatedAmountBRL||0);x.amountComplete=x.amountComplete&&row.amountComplete;x.itemIds.push(id);
  }
 }
 for(const x of Object.values(recurringMonths)){x.knownEstimatedAmountBRL=round2(x.knownEstimatedAmountBRL);x.estimatedAmountBRL=x.amountComplete?x.knownEstimatedAmountBRL:null;x.itemIds=[...new Set(x.itemIds)].sort();}
 knownTotal=round2(knownTotal);recurringKnown=round2(recurringKnown);
 return {
  status:"ready",engineVersion:FINANCE_ENGINE_VERSION,currency:pricing?.metadata?.currency||"BRL",budgetTier:tier,
  assumptionsSnapshot:{itemTierOverrides:opts.itemTierOverrides,variantOverrides:opts.variantOverrides,actualUnitPriceByItem:opts.actualUnitPriceByItem,diaperSizeByAgeMonth:opts.diaperSizeByAgeMonth,hybridDisposableRatio:opts.hybridDisposableRatio},
  initialLayette:{knownTotalBRL:knownTotal,totalBRL:unresolved.length?null:knownTotal,complete:unresolved.length===0,unresolvedItemIds:unresolved.sort(),byCategory:byCategory,items},
  recurring:{separateFromInitialLayette:true,knownEstimatedTotal12mBRL:recurringKnown,total12mBRL:recurringUnresolved.length?null:recurringKnown,complete:recurringUnresolved.length===0,unresolvedItemIds:recurringUnresolved.sort(),items:recurringItems,calendarMonths:recurringMonths},
  suggestions:{includedInBudget:false,count:Object.keys(draft.generatedSnapshot.suggestions||{}).length,itemIds:Object.keys(draft.generatedSnapshot.suggestions||{}).sort()}
 };
}

function expectedUseDate(planItem,segment,referenceDate){
 let age=segment.ageFromMonths;
 if(age===null||age===undefined){
  if(planItem.planningSnapshot?.purchaseTiming==="now")age=0;else return null;
 }
 return addMonthsClamped(referenceDate,age);
}
function recommendedPurchaseDate(planItem,expectedDate,asOfDate){
 const timing=planItem.planningSnapshot?.purchaseTiming,lead=planItem.planningSnapshot?.purchaseLeadDays;
 if(expectedDate&&isNum(lead))return addDays(expectedDate,-Number(lead));
 if(timing==="now")return asOfDate;
 if(timing==="near_use"&&expectedDate)return expectedDate;
 if(timing==="when_needed"&&expectedDate)return expectedDate;
 return null;
}
function urgencyBucket(recommendedDate,asOfDate){
 if(!recommendedDate)return "when_needed";
 if(compareIso(recommendedDate,asOfDate)<=0)return "buy_now";
 return daysBetween(asOfDate,recommendedDate)<=NEXT_PHASE_DAYS?"next_phase":"planned_later";
}

function buildTimelineSnapshot({draft,financeSnapshot,catalog,options={}}={}){
 assertD2Draft(draft);if(financeSnapshot?.status!=="ready")throw new Error("timeline exige financeSnapshot ready.");const opts=normalizeOptions(options);
 const asOfDate=opts.asOfDate||dateFromTimestamp(draft.metadata.createdAt),referenceDate=draft.inputSnapshot.referenceDate;assertIsoDate(asOfDate,"asOfDate");assertIsoDate(referenceDate,"referenceDate");
 const entries=[],calendarMonths={},unscheduled=[];let unscheduledKnownAmount=0;
 for(const [id,planItem] of Object.entries(draft.generatedSnapshot.items)){
  const fin=financeSnapshot.initialLayette.items[id];const segs=oneTimeSegments(planItem,catalog);
  for(const seg of segs){
   const fd=(fin?.segments||[]).find(x=>x.segmentKey===seg.segmentKey)||{};const use=expectedUseDate(planItem,seg,referenceDate);const rec=recommendedPurchaseDate(planItem,use,asOfDate);const urgency=urgencyBucket(rec,asOfDate);
   const e={entryId:`${id}:${seg.segmentKey}`,itemId:id,name:planItem.identitySnapshot.name,category:planItem.identitySnapshot.category,segmentKey:seg.segmentKey,size:seg.size||null,quantity:seg.quantity,expectedUseDate:use,recommendedPurchaseDate:rec,calendarMonth:rec?monthKey(rec):null,urgency,amountBRL:fd.amountBRL??null};entries.push(e);
   if(!rec){unscheduled.push(e.entryId);if(isNum(e.amountBRL))unscheduledKnownAmount+=Number(e.amountBRL);continue;}
   const mk=monthKey(rec);if(!calendarMonths[mk])calendarMonths[mk]={calendarMonth:mk,oneTimeKnownAmountBRL:0,oneTimeComplete:true,oneTimeAmountBRL:0,entryIds:[],byCategory:{},recurringKnownAmountBRL:0,recurringComplete:true,recurringAmountBRL:0};
   const row=calendarMonths[mk];row.entryIds.push(e.entryId);if(isNum(e.amountBRL)){row.oneTimeKnownAmountBRL+=Number(e.amountBRL);row.byCategory[e.category]=(row.byCategory[e.category]||0)+Number(e.amountBRL);}else row.oneTimeComplete=false;
  }
 }
 for(const [mk,r] of Object.entries(financeSnapshot.recurring.calendarMonths||{})){
  if(!calendarMonths[mk])calendarMonths[mk]={calendarMonth:mk,oneTimeKnownAmountBRL:0,oneTimeComplete:true,oneTimeAmountBRL:0,entryIds:[],byCategory:{},recurringKnownAmountBRL:0,recurringComplete:true,recurringAmountBRL:0};
  const row=calendarMonths[mk];row.recurringKnownAmountBRL+=Number(r.knownEstimatedAmountBRL||0);row.recurringComplete=row.recurringComplete&&r.amountComplete;
 }
 for(const row of Object.values(calendarMonths)){
  row.oneTimeKnownAmountBRL=round2(row.oneTimeKnownAmountBRL);row.oneTimeAmountBRL=row.oneTimeComplete?row.oneTimeKnownAmountBRL:null;row.recurringKnownAmountBRL=round2(row.recurringKnownAmountBRL);row.recurringAmountBRL=row.recurringComplete?row.recurringKnownAmountBRL:null;
  for(const k of Object.keys(row.byCategory))row.byCategory[k]=round2(row.byCategory[k]);row.entryIds.sort();
 }
 entries.sort((a,b)=>(a.recommendedPurchaseDate||"9999").localeCompare(b.recommendedPurchaseDate||"9999")||a.entryId.localeCompare(b.entryId));
 const bucketCounts={buy_now:0,next_phase:0,planned_later:0,when_needed:0};for(const e of entries)bucketCounts[e.urgency]++;
 return {status:"ready",engineVersion:TIMELINE_ENGINE_VERSION,referenceDate,referenceDateSource:draft.inputSnapshot.referenceDateSource,asOfDate,nextPhaseWindowDays:NEXT_PHASE_DAYS,entries,calendarMonths,unscheduledEntryIds:unscheduled.sort(),unscheduledKnownAmountBRL:round2(unscheduledKnownAmount),bucketCounts};
}

function validateD3Snapshots({draft,financeSnapshot,timelineSnapshot}={}){
 const errors=[];try{assertD2Draft(draft);}catch(e){errors.push(e.message);}
 if(financeSnapshot?.status!=="ready")errors.push("finance status != ready");if(timelineSnapshot?.status!=="ready")errors.push("timeline status != ready");
 if(financeSnapshot?.budgetTier!==draft?.inputSnapshot?.settings?.budgetTier)errors.push("budgetTier diverge do draft");
 if(D1.containsKeyDeep({financeSnapshot,timelineSnapshot},"acquisitions"))errors.push("D3 não pode conter acquisitions");
 const planned=new Set(Object.keys(draft?.generatedSnapshot?.items||{}));for(const id of Object.keys(financeSnapshot?.initialLayette?.items||{}))if(!planned.has(id))errors.push(`finance fora de items: ${id}`);
 return {valid:errors.length===0,errors};
}

function buildD3Snapshots({draft,pricing,catalog,options={}}={}){
 const financeSnapshot=buildFinanceSnapshot({draft,pricing,catalog,options});const timelineSnapshot=buildTimelineSnapshot({draft,financeSnapshot,catalog,options});const validation=validateD3Snapshots({draft,financeSnapshot,timelineSnapshot});if(!validation.valid)throw new Error(`D3 inválida: ${validation.errors.join("; ")}`);
 const generatorSnapshot={planGeneratorVersion:draft.generatorSnapshot?.planGeneratorVersion||"4.8D2",financeEngineVersion:FINANCE_ENGINE_VERSION,timelineEngineVersion:TIMELINE_ENGINE_VERSION};
 return {financeSnapshot,timelineSnapshot,generatorSnapshot,validation};
}

function finalizePlanWithD3({draft,pricing,catalog,options={},completedAt=Date.now()}={}){
 const built=buildD3Snapshots({draft,pricing,catalog,options});
 const plan=D1.finalizePlanSnapshot(draft,{generatedItems:draft.generatedSnapshot.items,suggestions:draft.generatedSnapshot.suggestions,financeSnapshot:built.financeSnapshot,timelineSnapshot:built.timelineSnapshot,generatorSnapshot:built.generatorSnapshot,completedAt});
 plan.audit={...(draft.audit||{}),...(plan.audit||{}),d3Complete:true,financeComplete:built.financeSnapshot.initialLayette.complete,recurringForecastComplete:built.financeSnapshot.recurring.complete,d3UnresolvedInitialAmountItems:clone(built.financeSnapshot.initialLayette.unresolvedItemIds),d3UnresolvedRecurringItems:clone(built.financeSnapshot.recurring.unresolvedItemIds)};
 const v=D1.validatePlanSnapshot(plan,{requirePersistable:true});if(!v.valid)throw new Error(`Plano final D3 inválido: ${v.errors.join("; ")}`);
 return plan;
}

module.exports={VERSION,FINANCE_ENGINE_VERSION,TIMELINE_ENGINE_VERSION,BUDGET_TIERS,SIZE_ORDER,DEFAULT_SIZE_START_MONTHS,NEXT_PHASE_DAYS,
 assertIsoDate,addMonthsClamped,addDays,daysBetween,normalizeOptions,assertD2Draft,effectiveTier,resolveUnitPrice,oneTimeSegments,itemFinance,diaperRecurringForecast,buildFinanceSnapshot,expectedUseDate,recommendedPurchaseDate,urgencyBucket,buildTimelineSnapshot,validateD3Snapshots,buildD3Snapshots,finalizePlanWithD3};

  globalThis.CoraV48Engine.D3=module.exports;
})();
