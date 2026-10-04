(() => {
  const STORAGE_KEY = "cna_vela_state_v2";
  const LEGACY_KEY = "cna_vela_state_v1";
  const ADMIN_KEY = "cna_vela_admin";
  const CHAMP_ID = "main";
  const MAX_DOC_BYTES = 2.5 * 1024 * 1024;
  const PENALTY_CODES = ["DNC", "DNS", "OCS", "DNF", "DSQ"];
  const DEFAULT_BOAT_CLASSES = [
    {
      name: "ILCA 7",
      categories: [
        "General",
        "Apprentice",
        "Master",
        "Grand Master",
        "Great Grand Master"
      ]
    },
    {
      name: "ILCA 6",
      categories: [
        "General",
        "Junior",
        "Apprentice",
        "Master",
        "Grand Master",
        "Great Grand Master",
        "Femenino"
      ]
    },
    { name: "ILCA 4", categories: ["General", "Junior", "Cadete", "Femenino"] },
    {
      name: "Pampero",
      categories: ["General", "Mixto", "Femenino", "Promocional"]
    },
    { name: "Otras", categories: ["General", "Libre"] }
  ];
  const DEFAULT_AR = {
    name: "AR_VELA_LIGERA.docx",
    href: "docs/AR_VELA_LIGERA.docx"
  };
  const DEFAULT_IR = {
    name: "IR_VELA_LIGERA.docx",
    href: "docs/IR_VELA_LIGERA.docx"
  };
  const DEFAULT_WHATSAPP = "https://chat.whatsapp.com/EZWmFlBaIYZCyw7pdwecob";
  const DEFAULT_AVISOS = `Avisos de esta fecha (además del grupo oficial de WhatsApp).
Se prevén 3 regatas (válida con 2).
Cambios de IR: hasta 2 h antes de la largada.
Protestas: mismo grupo, hasta 1 h después del arribo a puerto.
Canal de seguridad: 68 (bandera V).`;

  const state = loadState();
  let applyingRemote = false;
  let saveTimer = null;
  let appwriteReady = false;
  let appwriteConnecting = false;
  let appwriteEndpoint = "";
  let appwriteProject = "";
  let currentTab = "inscripcion";

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function defaultDoc(kind) {
    return kind === "ar" ? { ...DEFAULT_AR } : { ...DEFAULT_IR };
  }

  function makeFecha(partial = {}) {
    return {
      id: partial.id || uid(),
      name: partial.name || "Nueva fecha",
      date: partial.date || "",
      time: partial.time || "12:00",
      avisos: partial.avisos || DEFAULT_AVISOS,
      ar: partial.ar || defaultDoc("ar"),
      ir: partial.ir || defaultDoc("ir"),
      racesCount: partial.racesCount || 3,
      scores: partial.scores || {}
    };
  }

  function seedEvents() {
    return [
      makeFecha({
        name: "Fecha 1",
        date: "2026-10-03",
        time: "12:00",
        avisos: DEFAULT_AVISOS
      })
    ];
  }

  function migrateEvents(raw) {
    if (Array.isArray(raw)) return raw.map((e) => makeFecha(e));
    if (raw && typeof raw === "object") {
      return Object.entries(raw).map(([id, e], i) =>
        makeFecha({
          ...e,
          id,
          name: e.name || `Fecha ${i + 1}`,
          date: e.date || (id === "f1" ? "2026-10-03" : "")
        })
      );
    }
    return seedEvents();
  }

  function defaultState() {
    const events = seedEvents();
    return {
      fecha: events[0].id,
      classFilter: "ALL",
      sailors: [],
      events,
      whatsappUrl: DEFAULT_WHATSAPP,
      classes: defaultBoatClasses()
    };
  }

  function defaultBoatClasses() {
    return DEFAULT_BOAT_CLASSES.map((c) => ({
      name: c.name,
      categories: c.categories.slice()
    }));
  }

  function migrateClasses(raw) {
    if (!Array.isArray(raw) || !raw.length) return defaultBoatClasses();
    return raw
      .map((c) => {
        if (typeof c === "string") {
          const known = DEFAULT_BOAT_CLASSES.find((d) => d.name === c);
          return {
            name: c,
            categories: known ? known.categories.slice() : ["General"]
          };
        }
        const cats =
          Array.isArray(c.categories) && c.categories.length
            ? c.categories.map((x) => String(x).trim()).filter(Boolean)
            : ["General"];
        return { name: String(c.name || "").trim(), categories: cats };
      })
      .filter((c) => c.name);
  }

  function boatClasses() {
    return state.classes && state.classes.length
      ? state.classes
      : defaultBoatClasses();
  }

  function classNames() {
    return boatClasses().map((c) => c.name);
  }

  function loadState() {
    try {
      const raw =
        localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      const events = migrateEvents(parsed.events);
      const fecha = events.some((e) => e.id === parsed.fecha)
        ? parsed.fecha
        : events[0]?.id;
      return {
        ...defaultState(),
        ...parsed,
        events,
        fecha,
        whatsappUrl: parsed.whatsappUrl || DEFAULT_WHATSAPP,
        classes: migrateClasses(parsed.classes)
      };
    } catch {
      return defaultState();
    }
  }

  function eventList() {
    return state.events || [];
  }

  function currentEvent() {
    return (
      eventList().find((e) => e.id === state.fecha) || eventList()[0] || null
    );
  }

  function persistLocal() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          fecha: state.fecha,
          classFilter: state.classFilter,
          sailors: state.sailors,
          events: state.events,
          whatsappUrl: officialWhatsApp(),
          classes: boatClasses()
        })
      );
    } catch {
      toast("Sin espacio para guardar un documento tan grande");
    }
  }

  function officialWhatsApp() {
    return (state.whatsappUrl || DEFAULT_WHATSAPP).trim();
  }

  function wrapEventsForCloud() {
    return JSON.stringify({
      fechas: state.events,
      whatsappUrl: officialWhatsApp(),
      classes: boatClasses()
    });
  }

  function unwrapEvents(raw) {
    const empty = {
      events: seedEvents(),
      whatsappUrl: DEFAULT_WHATSAPP,
      classes: null
    };
    if (!raw) return empty;
    if (typeof raw === "string") {
      try {
        raw = JSON.parse(raw);
      } catch {
        return empty;
      }
    }
    if (Array.isArray(raw))
      return { events: migrateEvents(raw), whatsappUrl: null, classes: null };
    if (raw.fechas) {
      return {
        events: migrateEvents(raw.fechas),
        whatsappUrl: raw.whatsappUrl || null,
        classes: raw.classes || null
      };
    }
    return {
      events: migrateEvents(raw),
      whatsappUrl: raw.whatsappUrl || null,
      classes: raw.classes || null
    };
  }

  function cloudPayload() {
    return {
      sailors: JSON.stringify(state.sailors),
      events: wrapEventsForCloud()
    };
  }

  function parseCloudDoc(doc) {
    if (!doc)
      return {
        sailors: [],
        events: seedEvents(),
        whatsappUrl: DEFAULT_WHATSAPP,
        classes: defaultBoatClasses()
      };
    const sailors =
      typeof doc.sailors === "string"
        ? JSON.parse(doc.sailors || "[]")
        : doc.sailors || [];
    const unwrapped = unwrapEvents(doc.events);
    return {
      sailors,
      events: unwrapped.events,
      whatsappUrl: unwrapped.whatsappUrl,
      classes: unwrapped.classes
    };
  }

  function setSyncBadge(mode, label) {
    const el = document.getElementById("syncBadge");
    if (!el) return;
    el.textContent = label;
    el.className =
      "text-[10px] px-2 py-1 rounded-full border font-semibold " +
      (mode === "live"
        ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
        : mode === "error"
          ? "border-wheel/40 bg-red-500/15 text-red-200"
          : "border-amber-400/40 bg-amber-500/15 text-amber-200") +
      (isDevHost() ? "" : " hidden");
  }

  function isDevHost() {
    const host = (location.hostname || "").toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "[::1]" ||
      new URLSearchParams(location.search).has("dev")
    );
  }

  function renderHeaderChrome() {
    const badge = document.getElementById("syncBadge");
    const gear = document.getElementById("btnSettings");
    if (badge) badge.classList.toggle("hidden", !isDevHost());
    if (gear) gear.classList.toggle("hidden", !isAdmin());
  }

  function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.remove("opacity-0");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.add("opacity-0"), 2200);
  }

  function isAdmin() {
    return sessionStorage.getItem(ADMIN_KEY) === "1";
  }

  function fillBoatClassSelect() {
    const sel = document.getElementById("regClass");
    if (!sel) return;
    const prev = sel.value;
    const names = classNames();
    sel.innerHTML = names
      .map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`)
      .join("");
    if (names.includes(prev)) sel.value = prev;
    else if (names.includes("ILCA 6")) sel.value = "ILCA 6";
    fillCategories();
  }

  function fillCategories() {
    const sel = document.getElementById("regClass");
    const catSel = document.getElementById("regCategory");
    if (!sel || !catSel) return;
    const found = boatClasses().find((c) => c.name === sel.value);
    const cats = found?.categories?.length ? found.categories : ["General"];
    const prev = catSel.value;
    catSel.innerHTML = cats
      .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
      .join("");
    if (cats.includes(prev)) catSel.value = prev;
  }

  function switchTab(tab) {
    currentTab = tab;
    document
      .querySelectorAll(".app-view")
      .forEach((v) => v.classList.add("hidden"));
    document.getElementById(`view-${tab}`).classList.remove("hidden");
    document.querySelectorAll(".nav-btn").forEach((b) => {
      const on = b.dataset.tab === tab;
      b.classList.toggle("text-cyan-400", on);
      b.classList.toggle("font-bold", on);
      b.classList.toggle("text-slate-400", !on);
    });
    document
      .getElementById("fechaBarWrap")
      .classList.toggle("hidden", tab === "ranking");
    render();
  }

  function setFecha(id) {
    if (!eventList().some((e) => e.id === id)) return;
    state.fecha = id;
    persistLocal();
    render();
  }

  function sailorFechas(sailor) {
    if (Array.isArray(sailor.fechas) && sailor.fechas.length)
      return sailor.fechas;
    return eventList()[0] ? [eventList()[0].id] : [];
  }

  function fechaLabel(id) {
    const ev = eventList().find((e) => e.id === id);
    if (!ev) return id;
    return ev.date ? `${ev.name} (${formatDay(ev.date)})` : ev.name;
  }

  function formatDay(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }

  function setClassFilter(cls) {
    state.classFilter = cls;
    persistLocal();
    render();
  }

  function saveAll() {
    persistLocal();
    scheduleCloudSave();
  }

  function scheduleCloudSave() {
    if (applyingRemote) return;
    if (!appwriteReady) {
      if (
        !appwriteConnecting &&
        typeof navigator !== "undefined" &&
        navigator.onLine &&
        window.CNA_APPWRITE_PROJECT_ID
      ) {
        initAppwrite();
      }
      return;
    }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(pushCloud, 400);
  }

  function tableId() {
    return (
      window.CNA_APPWRITE_TABLE_ID ||
      window.CNA_APPWRITE_COLLECTION_ID ||
      "championship"
    );
  }

  function dbId() {
    return window.CNA_APPWRITE_DATABASE_ID;
  }

  async function awRequest(method, path, body) {
    const headers = {
      "X-Appwrite-Project": appwriteProject,
      "Content-Type": "application/json"
    };
    const res = await fetch(`${appwriteEndpoint}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(json.message || res.statusText);
      err.code = json.code || res.status;
      err.type = json.type;
      throw err;
    }
    return json;
  }

  async function pushCloud() {
    if (!appwriteReady) return;
    const data = cloudPayload();
    const path = `/tablesdb/${dbId()}/tables/${tableId()}/rows/${CHAMP_ID}`;
    try {
      await awRequest("PATCH", path, { data });
      setSyncBadge("live", "Appwrite");
    } catch (err) {
      if (
        err &&
        (err.code === 404 || String(err.type || "").includes("not_found"))
      ) {
        try {
          await awRequest(
            "POST",
            `/tablesdb/${dbId()}/tables/${tableId()}/rows`,
            {
              rowId: CHAMP_ID,
              data,
              permissions: ['read("any")', 'update("any")', 'delete("any")']
            }
          );
          setSyncBadge("live", "Appwrite");
          return;
        } catch (createErr) {
          console.warn(createErr);
        }
      }
      console.warn(err);
      setSyncBadge("error", "Sin nube");
    }
  }

  function applyRemote(row) {
    applyingRemote = true;
    try {
      const parsed = parseCloudDoc(row);
      if (Array.isArray(parsed.sailors)) state.sailors = parsed.sailors;
      if (parsed.events) state.events = migrateEvents(parsed.events);
      if (parsed.whatsappUrl) state.whatsappUrl = parsed.whatsappUrl;
      if (parsed.classes && parsed.classes.length)
        state.classes = migrateClasses(parsed.classes);
      if (!eventList().some((e) => e.id === state.fecha) && eventList()[0])
        state.fecha = eventList()[0].id;
      persistLocal();
      render();
    } catch (err) {
      console.warn(err);
    }
    applyingRemote = false;
  }

  async function initAppwrite() {
    if (appwriteConnecting) return;
    appwriteProject = window.CNA_APPWRITE_PROJECT_ID;
    appwriteEndpoint = (
      window.CNA_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1"
    ).replace(/\/$/, "");
    if (!appwriteProject || !dbId()) {
      setSyncBadge("local", "Solo celular");
      return;
    }
    appwriteConnecting = true;

    try {
      const row = await awRequest(
        "GET",
        `/tablesdb/${dbId()}/tables/${tableId()}/rows/${CHAMP_ID}`
      );
      const parsed = parseCloudDoc(row);
      const remoteEmpty =
        !parsed.sailors?.length &&
        migrateEvents(parsed.events).every(
          (e) => !Object.keys(e.scores || {}).length
        );
      const localHas =
        state.sailors.length > 0 ||
        eventList().some((e) => Object.keys(e.scores || {}).length);
      appwriteReady = true;
      if (remoteEmpty || localHas) await pushCloud();
      else applyRemote(row);
      setSyncBadge("live", "Appwrite");
    } catch (err) {
      if (
        err &&
        (err.code === 404 || String(err.type || "").includes("not_found"))
      ) {
        appwriteReady = true;
        await pushCloud();
      } else {
        console.warn(err);
        setSyncBadge("error", "Sin señal");
      }
    } finally {
      appwriteConnecting = false;
    }

    if (appwriteReady && window.Appwrite?.Client) {
      try {
        const client = new window.Appwrite.Client()
          .setEndpoint(appwriteEndpoint)
          .setProject(appwriteProject);
        const channel = `databases.${dbId()}.tables.${tableId()}.rows.${CHAMP_ID}`;
        client.subscribe(channel, (message) => {
          if (message.payload) applyRemote(message.payload);
        });
      } catch (err) {
        console.warn(err);
      }
    }
  }

  function handleInscripcion(e) {
    e.preventDefault();
    if (!currentEvent()) {
      toast("No hay fechas creadas");
      return;
    }
    const sailNumber = document
      .getElementById("regSail")
      .value.trim()
      .toUpperCase();
    const boatClass = document.getElementById("regClass").value;
    const name = document.getElementById("regName").value.trim();
    const category = document.getElementById("regCategory").value;
    const club =
      document.getElementById("regClub").value.trim().toUpperCase() || "CNA";
    const fecha = document.getElementById("regFecha").value;

    const existing = state.sailors.find(
      (s) => s.sailNumber === sailNumber && s.boatClass === boatClass
    );
    if (existing) {
      existing.name = name;
      existing.category = category;
      existing.club = club;
      const fechas = sailorFechas(existing);
      if (!fechas.includes(fecha)) fechas.push(fecha);
      existing.fechas = fechas;
      toast(`Inscripto en ${fechaLabel(fecha)}`);
    } else {
      state.sailors.push({
        id: uid(),
        sailNumber,
        boatClass,
        name,
        category,
        club,
        fechas: [fecha]
      });
      toast(`Inscripción confirmada · ${fechaLabel(fecha)}`);
    }
    document.getElementById("inscripcionForm").reset();
    fillBoatClassSelect();
    document.getElementById("regFecha").value = fecha;
    setFecha(fecha);
    saveAll();
    render();
  }

  function deleteSailor(id) {
    if (!isAdmin()) {
      toast("PIN de comisión requerido");
      switchTab("carga");
      return;
    }
    if (!confirm("¿Eliminar este inscripto?")) return;
    state.sailors = state.sailors.filter((s) => s.id !== id);
    eventList().forEach((ev) => {
      delete ev.scores[id];
    });
    saveAll();
    render();
    toast("Eliminado");
  }

  function unlockAdmin(e) {
    e.preventDefault();
    const pin = document.getElementById("pinInput").value.trim();
    if (pin !== (window.CNA_ADMIN_PIN || "296")) {
      toast("PIN incorrecto");
      return;
    }
    sessionStorage.setItem(ADMIN_KEY, "1");
    toast("Comisión desbloqueada");
    render();
  }

  function addRace() {
    const ev = currentEvent();
    if (!ev) return;
    ev.racesCount += 1;
    saveAll();
    render();
  }

  function removeRace() {
    const ev = currentEvent();
    if (!ev || ev.racesCount <= 1) return;
    ev.racesCount -= 1;
    Object.keys(ev.scores).forEach((sid) => {
      if (Array.isArray(ev.scores[sid]))
        ev.scores[sid] = ev.scores[sid].slice(0, ev.racesCount);
    });
    saveAll();
    render();
  }

  function updateScore(sailorId, raceIdx, val) {
    const ev = currentEvent();
    if (!ev) return;
    if (!ev.scores[sailorId]) ev.scores[sailorId] = [];
    ev.scores[sailorId][raceIdx] = val === "" ? null : val;
    saveAll();
  }

  function scoreOptions(selected) {
    const vals = [""].concat(
      Array.from({ length: 30 }, (_, i) => String(i + 1)),
      PENALTY_CODES
    );
    return vals
      .map((v) => {
        const label = v === "" ? "—" : v;
        const sel = String(selected ?? "") === v ? "selected" : "";
        return `<option value="${v}" ${sel}>${label}</option>`;
      })
      .join("");
  }

  function classChips(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (
      state.classFilter !== "ALL" &&
      !classNames().includes(state.classFilter)
    )
      state.classFilter = "ALL";
    const chips = ["ALL", ...classNames()];
    el.innerHTML = chips
      .map((c) => {
        const on = state.classFilter === c;
        return `<button type="button" onclick='setClassFilter(${JSON.stringify(c)})' class="whitespace-nowrap px-2.5 py-1 rounded-lg text-[10px] font-bold ${on ? "bg-cyan-500 text-sea-900" : "bg-white/10 text-slate-300"}">${c === "ALL" ? "Todas" : escapeHtml(c)}</button>`;
      })
      .join("");
  }

  function sailorsInFecha(fechaKey) {
    return state.sailors.filter((s) => sailorFechas(s).includes(fechaKey));
  }

  function filteredSailors(fechaKey) {
    const list = fechaKey ? sailorsInFecha(fechaKey) : state.sailors.slice();
    if (state.classFilter === "ALL") return list;
    return list.filter((s) => s.boatClass === state.classFilter);
  }

  function fleetSize(cls, fechaKey) {
    let list = fechaKey ? sailorsInFecha(fechaKey) : state.sailors;
    if (cls && cls !== "ALL") list = list.filter((s) => s.boatClass === cls);
    return Math.max(1, list.length);
  }

  function pointsFor(raw, cls, fechaKey) {
    if (raw === null || raw === undefined || raw === "") return null;
    const code = String(raw).toUpperCase();
    if (PENALTY_CODES.includes(code)) return fleetSize(cls, fechaKey) + 1;
    const n = parseInt(code, 10);
    return Number.isFinite(n) && n > 0 ? n : fleetSize(cls, fechaKey) + 1;
  }

  function dateNet(sailor, fechaKey) {
    const ev = eventList().find((e) => e.id === fechaKey);
    if (!ev) return { racePts: [], raw: [], net: 0, discarded: null };
    const entered = sailorFechas(sailor).includes(fechaKey);
    const raw = ev.scores[sailor.id] || [];
    const racePts = Array.from({ length: ev.racesCount }, (_, i) => {
      if (!entered) return fleetSize(sailor.boatClass, fechaKey) + 1;
      const p = pointsFor(raw[i], sailor.boatClass, fechaKey);
      return p === null ? fleetSize(sailor.boatClass, fechaKey) + 1 : p;
    });
    let net = racePts.reduce((a, b) => a + b, 0);
    let discarded = null;
    if (ev.racesCount >= 4) {
      discarded = Math.max(...racePts);
      net -= discarded;
    }
    return { racePts, raw, net, discarded };
  }

  function rankedForFecha(fechaKey) {
    return filteredSailors(fechaKey)
      .map((s) => ({ ...s, ...dateNet(s, fechaKey) }))
      .sort(
        (a, b) => a.net - b.net || a.sailNumber.localeCompare(b.sailNumber)
      );
  }

  function rankedOverall() {
    const ids = eventList().map((e) => e.id);
    return filteredSailors(null)
      .map((s) => {
        const breakdown = ids.map((f) => dateNet(s, f).net);
        const net = breakdown.reduce((a, b) => a + b, 0);
        return { ...s, breakdown, net };
      })
      .sort(
        (a, b) => a.net - b.net || a.sailNumber.localeCompare(b.sailNumber)
      );
  }

  function docHref(doc) {
    if (!doc) return null;
    return doc.dataUrl || doc.href || null;
  }

  function downloadDoc(fechaId, kind) {
    const ev = eventList().find((e) => e.id === fechaId);
    if (!ev) return;
    const doc = ev[kind];
    const href = docHref(doc);
    if (!href) {
      toast("No hay archivo cargado");
      return;
    }
    const a = document.createElement("a");
    a.href = href;
    a.download = doc.name || (kind === "ar" ? "AR.docx" : "IR.docx");
    a.target = "_blank";
    a.rel = "noopener";
    a.click();
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (file.size > MAX_DOC_BYTES) {
        reject(new Error("Archivo mayor a 2,5 MB"));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
      reader.readAsDataURL(file);
    });
  }

  async function saveFechaForm(e) {
    e.preventDefault();
    if (!isAdmin()) {
      toast("PIN de comisión requerido");
      return;
    }
    const id = document.getElementById("editFechaId").value;
    const existing = eventList().find((ev) => ev.id === id);
    const next = makeFecha({
      ...(existing || {}),
      id: id || uid(),
      name: document.getElementById("evName").value.trim(),
      date: document.getElementById("evDate").value,
      time: document.getElementById("evTime").value,
      avisos: document.getElementById("evAvisos").value.trim()
    });
    try {
      const arFile = document.getElementById("evAr").files[0];
      const irFile = document.getElementById("evIr").files[0];
      if (arFile)
        next.ar = {
          name: arFile.name,
          dataUrl: await readFileAsDataUrl(arFile)
        };
      if (irFile)
        next.ir = {
          name: irFile.name,
          dataUrl: await readFileAsDataUrl(irFile)
        };
    } catch (err) {
      toast(err.message);
      return;
    }
    const idx = eventList().findIndex((ev) => ev.id === next.id);
    if (idx >= 0)
      state.events[idx] = {
        ...existing,
        ...next,
        scores: existing.scores,
        racesCount: existing.racesCount
      };
    else state.events.push(next);
    state.events.sort((a, b) =>
      `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
    );
    state.fecha = next.id;
    resetFechaForm();
    saveAll();
    render();
    toast("Fecha guardada");
  }

  function editFecha(id) {
    const ev = eventList().find((e) => e.id === id);
    if (!ev) return;
    document.getElementById("editFechaId").value = ev.id;
    document.getElementById("evName").value = ev.name;
    document.getElementById("evDate").value = ev.date;
    document.getElementById("evTime").value = ev.time;
    document.getElementById("evAvisos").value = ev.avisos || "";
    document.getElementById("evAr").value = "";
    document.getElementById("evIr").value = "";
    setDocHints(ev);
    switchTab("fechas");
    document.getElementById("fechaForm").scrollIntoView({ behavior: "smooth" });
  }

  function setDocHints(ev) {
    const arHint = document.getElementById("evArHint");
    const irHint = document.getElementById("evIrHint");
    if (arHint) {
      arHint.textContent = ev?.ar?.name
        ? `Actual: ${ev.ar.name}. Si no elegís archivo, se mantiene.`
        : "Si no elegís archivo, se mantiene el actual.";
    }
    if (irHint) {
      irHint.textContent = ev?.ir?.name
        ? `Actual: ${ev.ir.name}. Si no elegís archivo, se mantiene.`
        : "Si no elegís archivo, se mantiene el actual.";
    }
  }

  function resetFechaForm() {
    document.getElementById("fechaForm").reset();
    document.getElementById("editFechaId").value = "";
    document.getElementById("evAvisos").value = DEFAULT_AVISOS;
    document.getElementById("evTime").value = "12:00";
    setDocHints(null);
  }

  function deleteFecha(id) {
    if (!isAdmin()) return;
    if (eventList().length <= 1) {
      toast("Dejá al menos una fecha");
      return;
    }
    if (!confirm("¿Eliminar esta fecha y sus resultados?")) return;
    state.events = eventList().filter((e) => e.id !== id);
    state.sailors.forEach((s) => {
      s.fechas = sailorFechas(s).filter((f) => f !== id);
    });
    if (state.fecha === id) state.fecha = eventList()[0].id;
    saveAll();
    render();
    toast("Fecha eliminada");
  }

  function openOfficialWhatsApp() {
    const url = officialWhatsApp();
    if (!url) {
      toast("La comisión aún no publicó el grupo");
      return;
    }
    window.open(url, "_blank", "noopener");
  }

  function focusWhatsappEditor() {
    if (!isAdmin()) {
      toast("PIN de comisión requerido");
      switchTab("carga");
      return;
    }
    switchTab("fechas");
    const input = document.getElementById("waUrl");
    if (input) {
      input.value = officialWhatsApp();
      input.focus();
      input.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function saveWhatsappChannel(e) {
    e.preventDefault();
    if (!isAdmin()) {
      toast("PIN de comisión requerido");
      return;
    }
    let url = document.getElementById("waUrl").value.trim();
    if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
    if (!/chat\.whatsapp\.com/i.test(url)) {
      toast("Usá un link de grupo chat.whatsapp.com");
      return;
    }
    state.whatsappUrl = url;
    saveAll();
    render();
    toast("Canal oficial actualizado");
  }

  function renderCanalOficial() {
    const adminBtn = document.getElementById("btnEditarCanal");
    if (adminBtn) adminBtn.classList.toggle("hidden", !isAdmin());
    const canalAdmin = document.getElementById("canalAdmin");
    if (canalAdmin) {
      canalAdmin.classList.toggle("hidden", !isAdmin());
      const wa = document.getElementById("waUrl");
      if (wa && isAdmin() && document.activeElement !== wa)
        wa.value = officialWhatsApp();
    }
  }

  function renderFechaBar() {
    const bar = document.getElementById("fechaBar");
    const list = eventList();
    if (!list.length) {
      bar.innerHTML = `<p class="text-xs text-slate-500 px-2 py-1">Sin fechas. Creálas en la pestaña Fechas.</p>`;
      return;
    }
    bar.innerHTML = list
      .map((ev) => {
        const on = ev.id === state.fecha;
        return `<button type="button" class="fecha-chip shrink-0 py-2 px-3 rounded-xl text-xs font-bold ${on ? "bg-cyan-500 text-sea-900" : "text-slate-400"}" onclick="setFecha('${ev.id}')">${escapeHtml(ev.name)}</button>`;
      })
      .join("");
  }

  function renderFechaSelect() {
    const sel = document.getElementById("regFecha");
    const list = eventList();
    sel.innerHTML = list
      .map(
        (ev) =>
          `<option value="${ev.id}">${escapeHtml(fechaLabel(ev.id))}</option>`
      )
      .join("");
    if (state.fecha) sel.value = state.fecha;
    document.getElementById("btnInscribir").disabled = !list.length;
  }

  function renderFechaBrief() {
    const box = document.getElementById("fechaBrief");
    const ev = currentEvent();
    if (!ev) {
      box.innerHTML = `<p class="text-slate-400 text-sm">Todavía no hay fechas del campeonato.</p>`;
      return;
    }
    box.innerHTML = `
      <div>
        <p class="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold">Próxima / seleccionada</p>
        <h3 class="font-bold">${escapeHtml(ev.name)}</h3>
        <p class="text-slate-300">${ev.date ? formatDay(ev.date) : "Día a confirmar"} · ${escapeHtml(ev.time || "")} hs</p>
      </div>
      <div class="flex gap-2">
        <button type="button" class="flex-1 bg-white/10 rounded-xl py-2 text-xs font-bold" onclick="downloadDoc('${ev.id}','ar')">Descargar AR</button>
        <button type="button" class="flex-1 bg-white/10 rounded-xl py-2 text-xs font-bold" onclick="downloadDoc('${ev.id}','ir')">Descargar IR</button>
      </div>`;
  }

  function renderBoatClasses() {
    const admin = isAdmin();
    const adminBox = document.getElementById("clasesAdmin");
    if (adminBox) adminBox.classList.toggle("hidden", !admin);
    const publicList = document.getElementById("clasesPublicList");
    if (publicList) {
      publicList.innerHTML =
        boatClasses()
          .map(
            (c) =>
              `<span class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/10 text-slate-200">${escapeHtml(c.name)}</span>`
          )
          .join("") ||
        `<span class="text-xs text-slate-400">Sin clases definidas.</span>`;
    }
    const adminList = document.getElementById("clasesAdminList");
    if (!adminList) return;
    adminList.innerHTML = boatClasses()
      .map(
        (c) => `
      <div class="py-2.5 flex items-start justify-between gap-2">
        <div>
          <p class="font-semibold text-sm">${escapeHtml(c.name)}</p>
          <p class="text-[10px] text-slate-400">${escapeHtml(c.categories.join(", "))}</p>
        </div>
        <div class="flex gap-1 shrink-0">
          <button type="button" class="text-xs bg-white/10 px-2 py-1 rounded-lg" onclick='editBoatClass(${JSON.stringify(c.name)})'>Editar</button>
          <button type="button" class="text-xs text-red-300 px-2 py-1" onclick='deleteBoatClass(${JSON.stringify(c.name)})'>Borrar</button>
        </div>
      </div>`
      )
      .join("");
  }

  function saveBoatClass(e) {
    e.preventDefault();
    if (!isAdmin()) {
      toast("PIN de comisión requerido");
      return;
    }
    const name = document.getElementById("clsName").value.trim();
    const original = document.getElementById("editClassOriginal").value.trim();
    const categories = document
      .getElementById("clsCats")
      .value.split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!name) return;
    const cats = categories.length ? categories : ["General"];
    const list = boatClasses().slice();
    const dup = list.find(
      (c) => c.name.toLowerCase() === name.toLowerCase() && c.name !== original
    );
    if (dup) {
      toast("Ya existe una clase con ese nombre");
      return;
    }
    if (original) {
      const idx = list.findIndex((c) => c.name === original);
      if (idx >= 0) {
        list[idx] = { name, categories: cats };
        if (original !== name) {
          state.sailors.forEach((s) => {
            if (s.boatClass === original) s.boatClass = name;
          });
          if (state.classFilter === original) state.classFilter = name;
        }
      } else {
        list.push({ name, categories: cats });
      }
    } else {
      list.push({ name, categories: cats });
    }
    state.classes = list;
    resetBoatClassForm();
    saveAll();
    toast("Clase guardada");
    render();
  }

  function editBoatClass(name) {
    const c = boatClasses().find((x) => x.name === name);
    if (!c) return;
    document.getElementById("editClassOriginal").value = c.name;
    document.getElementById("clsName").value = c.name;
    document.getElementById("clsCats").value = c.categories.join(", ");
    document
      .getElementById("clasesAdmin")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function deleteBoatClass(name) {
    if (!isAdmin()) return;
    if (boatClasses().length <= 1) {
      toast("Debe quedar al menos una clase");
      return;
    }
    const used = state.sailors.filter((s) => s.boatClass === name).length;
    const ok = used
      ? confirm(`Hay ${used} inscripto(s) en ${name}. ¿Borrar la clase igual?`)
      : confirm(`¿Borrar la clase ${name}?`);
    if (!ok) return;
    state.classes = boatClasses().filter((c) => c.name !== name);
    if (state.classFilter === name) state.classFilter = "ALL";
    saveAll();
    toast("Clase eliminada");
    render();
  }

  function resetBoatClassForm() {
    document.getElementById("claseForm")?.reset();
    const orig = document.getElementById("editClassOriginal");
    if (orig) orig.value = "";
  }

  function renderFechasTab() {
    const admin = isAdmin();
    document.getElementById("fechasAdmin").classList.toggle("hidden", !admin);
    const canalAdmin = document.getElementById("canalAdmin");
    if (canalAdmin) canalAdmin.classList.toggle("hidden", !admin);
    document.getElementById("fechasLock").classList.toggle("hidden", admin);
    const host = document.getElementById("fechasPublic");
    const list = eventList();
    if (!list.length) {
      host.innerHTML = `<div class="bg-sea-800 rounded-2xl p-4 border border-white/10 text-sm text-slate-400">No hay fechas. La comisión puede crearlas con el PIN.</div>`;
      return;
    }
    host.innerHTML = list
      .map(
        (ev) => `
      <article class="bg-sea-800 rounded-2xl p-4 border border-white/10 space-y-2">
        <div class="flex items-start justify-between gap-2">
          <div>
            <h3 class="font-bold">${escapeHtml(ev.name)}</h3>
            <p class="text-sm text-cyan-400">${ev.date ? formatDay(ev.date) : "Sin día"} · ${escapeHtml(ev.time || "—")} hs</p>
          </div>
          ${
            admin
              ? `<div class="flex gap-1">
            <button type="button" class="text-xs bg-white/10 px-2 py-1 rounded-lg" onclick="editFecha('${ev.id}')">Editar</button>
            <button type="button" class="text-xs text-red-300 px-2 py-1" onclick="deleteFecha('${ev.id}')">Borrar</button>
          </div>`
              : ""
          }
        </div>
        ${admin ? `<p class="text-[11px] text-slate-500">Archivo actual · AR: ${escapeHtml(ev.ar?.name || "—")} · IR: ${escapeHtml(ev.ir?.name || "—")}</p>` : ""}
        <div class="flex gap-2">
          <button type="button" class="flex-1 bg-white/10 rounded-xl py-2 text-xs font-bold" onclick="downloadDoc('${ev.id}','ar')">Descargar AR</button>
          <button type="button" class="flex-1 bg-white/10 rounded-xl py-2 text-xs font-bold" onclick="downloadDoc('${ev.id}','ir')">Descargar IR</button>
        </div>
      </article>`
      )
      .join("");
  }

  function renderInscriptos() {
    const ev = currentEvent();
    const title = ev ? `Inscriptos · ${ev.name}` : "Inscriptos";
    document.getElementById("listaInscriptosTitle").textContent = title;
    const list = ev ? sailorsInFecha(ev.id) : [];
    document.getElementById("countInscriptos").textContent = String(
      list.length
    );
    const box = document.getElementById("listaInscriptos");
    if (!ev) {
      box.innerHTML = `<p class="py-6 text-center text-xs text-slate-500">Creá una fecha para empezar.</p>`;
      return;
    }
    if (!list.length) {
      box.innerHTML = `<p class="py-6 text-center text-xs text-slate-500">Nadie inscripto aún en ${escapeHtml(ev.name)}.</p>`;
      return;
    }
    box.innerHTML = list
      .map(
        (s) => `
      <div class="py-2.5 flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <span class="font-mono font-bold text-cyan-400 bg-sea-900 border border-white/10 px-2 py-1 rounded-lg text-[11px]">${escapeHtml(s.sailNumber)}</span>
          <div class="min-w-0">
            <p class="font-semibold text-sm truncate">${escapeHtml(s.name)}</p>
            <p class="text-[10px] text-slate-400">${escapeHtml(s.boatClass)} · ${escapeHtml(s.category)} · ${escapeHtml(s.club)}</p>
            <p class="text-[10px] text-cyan-400/80">${sailorFechas(s).map(fechaLabel).map(escapeHtml).join(" · ")}</p>
          </div>
        </div>
        <button type="button" class="text-slate-500 text-xs px-2" onclick="deleteSailor('${s.id}')">✕</button>
      </div>`
      )
      .join("");
  }

  function renderCarga() {
    const locked = !isAdmin();
    document.getElementById("cargaLock").classList.toggle("hidden", !locked);
    document.getElementById("cargaPanel").classList.toggle("hidden", locked);
    if (locked) return;
    const ev = currentEvent();
    if (!ev) {
      document.getElementById("cargaSubtitle").innerText =
        "Creá una fecha en la pestaña Fechas.";
      document.getElementById("cargaBody").innerHTML = "";
      document.getElementById("cargaHead").innerHTML = "";
      return;
    }
    document.getElementById("cargaSubtitle").innerText =
      `${ev.name} · ${formatDay(ev.date)} ${ev.time} · ${ev.racesCount} regata${ev.racesCount > 1 ? "s" : ""}`;
    classChips("classChipsCarga");
    const sailors = filteredSailors(ev.id);
    document.getElementById("cargaHead").innerHTML =
      `<th class="p-2 sticky-col-header bg-sea-900 min-w-[120px]">Vela</th>` +
      Array.from(
        { length: ev.racesCount },
        (_, i) => `<th class="p-2 text-center min-w-[72px]">R${i + 1}</th>`
      ).join("");
    if (!sailors.length) {
      document.getElementById("cargaBody").innerHTML =
        `<tr><td class="p-4 text-center text-slate-500" colspan="${ev.racesCount + 1}">Sin inscriptos en este filtro.</td></tr>`;
      return;
    }
    document.getElementById("cargaBody").innerHTML = sailors
      .map((s) => {
        const scores = ev.scores[s.id] || [];
        return `<tr class="border-t border-white/5">
        <td class="p-2 sticky-col bg-sea-800">
          <p class="font-mono font-bold text-cyan-400">${escapeHtml(s.sailNumber)}</p>
          <p class="text-[10px] text-slate-400 truncate max-w-[110px]">${escapeHtml(s.name)}</p>
        </td>
        ${Array.from(
          { length: ev.racesCount },
          (_, i) => `
          <td class="p-1 text-center">
            <select onchange="updateScore('${s.id}', ${i}, this.value)" class="w-[4.25rem] h-10 bg-sea-900 border border-white/10 rounded-lg text-center font-bold">
              ${scoreOptions(scores[i])}
            </select>
          </td>`
        ).join("")}
      </tr>`;
      })
      .join("");
  }

  function renderPlacaOrRanking() {
    const isRanking = currentTab === "ranking";
    const card = document.getElementById("exportableCard");
    const host = isRanking
      ? document.getElementById("view-ranking")
      : document.getElementById("view-placa");
    if (card.parentElement !== host) host.appendChild(card);

    classChips("classChipsPlaca");
    classChips("classChipsRanking");
    document.getElementById("cardClass").textContent =
      state.classFilter === "ALL" ? "Todas las clases" : state.classFilter;
    document.getElementById("cardYear").textContent = String(
      new Date().getFullYear()
    );
    document.getElementById("cardStamp").textContent =
      new Date().toLocaleString("es-AR", {
        dateStyle: "short",
        timeStyle: "short"
      });

    if (isRanking) {
      const ids = eventList();
      document.getElementById("cardTitle").textContent = "RANKING GENERAL";
      document.getElementById("placaHead").innerHTML = `
        <th class="p-2 text-center">Pos</th>
        <th class="p-2">Vela</th>
        <th class="p-2">Timonel</th>
        <th class="p-2">Clase</th>
        ${ids.map((e, i) => `<th class="p-2 text-center">${escapeHtml(e.name.replace("Fecha ", "F") || `F${i + 1}`)}</th>`).join("")}
        <th class="p-2 text-center bg-sea-900 text-cyan-400">Netos</th>`;
      const rows = rankedOverall();
      document.getElementById("placaBody").innerHTML = rows.length
        ? rows
            .map((s, i) => rowHtml(i, s, s.breakdown.map(String), s.net))
            .join("")
        : emptyRow(5 + ids.length);
      return;
    }

    const ev = currentEvent();
    if (!ev) {
      document.getElementById("cardTitle").textContent = "SIN FECHAS";
      document.getElementById("placaBody").innerHTML = emptyRow(5);
      return;
    }
    document.getElementById("cardTitle").textContent =
      `PLACA ${ev.name.toUpperCase()}`;
    document.getElementById("cardClass").textContent =
      `${state.classFilter === "ALL" ? "Todas las clases" : state.classFilter} · ${formatDay(ev.date)} ${ev.time}`;
    document.getElementById("placaHead").innerHTML = `
      <th class="p-2 text-center">Pos</th>
      <th class="p-2">Vela</th>
      <th class="p-2">Timonel</th>
      <th class="p-2">Clase</th>
      ${Array.from({ length: ev.racesCount }, (_, i) => `<th class="p-2 text-center">R${i + 1}</th>`).join("")}
      <th class="p-2 text-center bg-sea-900 text-cyan-400">Netos</th>`;
    const rows = rankedForFecha(ev.id);
    document.getElementById("placaBody").innerHTML = rows.length
      ? rows
          .map((s, i) => {
            const display = Array.from({ length: ev.racesCount }, (_, idx) => {
              const v = (s.raw || [])[idx];
              return v === null || v === undefined || v === ""
                ? "DNC"
                : String(v);
            });
            return rowHtml(i, s, display, s.net);
          })
          .join("")
      : emptyRow(5 + ev.racesCount);
  }

  function rowHtml(i, s, cells, net) {
    const posColor =
      i === 0
        ? "text-amber-300"
        : i === 1
          ? "text-slate-200"
          : i === 2
            ? "text-amber-600"
            : "text-slate-400";
    return `<tr class="${i % 2 ? "bg-sea-900/40" : ""}">
      <td class="p-2 text-center font-bold ${posColor}">${i + 1}º</td>
      <td class="p-2 font-mono font-bold text-cyan-400">${escapeHtml(s.sailNumber)}</td>
      <td class="p-2">${escapeHtml(s.name)}</td>
      <td class="p-2 text-slate-400">${escapeHtml(s.boatClass)}</td>
      ${cells.map((c) => `<td class="p-2 text-center">${escapeHtml(c)}</td>`).join("")}
      <td class="p-2 text-center font-black text-cyan-300 bg-sea-900/60">${net}</td>
    </tr>`;
  }

  function emptyRow(cols) {
    return `<tr><td colspan="${cols}" class="p-6 text-center text-slate-500">Sin datos para este filtro.</td></tr>`;
  }

  function escapeHtml(v) {
    return String(v ?? "").replace(
      /[&<>"']/g,
      (ch) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        })[ch]
    );
  }

  function shareInscriptionLink() {
    const ev = currentEvent();
    const q = ev
      ? `?mode=register&fecha=${encodeURIComponent(ev.id)}`
      : "?mode=register";
    const url = `${location.origin}${location.pathname}${q}`;
    const text = ev
      ? `⛵ Inscripción ${ev.name} (${formatDay(ev.date)} ${ev.time}) · CNA Vela Ligera\n${url}`
      : `⛵ Inscripción CNA Vela Ligera\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  async function sharePlacaPng() {
    toast("Generando captura…");
    const node = document.getElementById("exportableCard");
    const canvas = await html2canvas(node, {
      backgroundColor: "#073A5A",
      scale: 2,
      useCORS: true
    });
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
    const name =
      currentTab === "ranking"
        ? "Ranking_General_CNA.png"
        : `Placa_${currentEvent()?.name || "fecha"}_CNA.png`;
    const file = new File([blob], name, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: name });
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }
    }
    const link = document.createElement("a");
    link.download = name;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
    toast("Imagen descargada: adjuntála en WhatsApp");
  }

  function logoutCommission() {
    sessionStorage.removeItem(ADMIN_KEY);
    toast("Sesión de comisión cerrada");
    render();
  }

  function render() {
    renderHeaderChrome();
    renderCanalOficial();
    renderFechaBar();
    fillBoatClassSelect();
    renderFechaSelect();
    renderFechaBrief();
    renderInscriptos();
    renderFechasTab();
    renderBoatClasses();
    renderCarga();
    if (currentTab === "placa" || currentTab === "ranking")
      renderPlacaOrRanking();
  }

  window.switchTab = switchTab;
  window.setFecha = setFecha;
  window.setClassFilter = setClassFilter;
  window.handleInscripcion = handleInscripcion;
  window.deleteSailor = deleteSailor;
  window.unlockAdmin = unlockAdmin;
  window.addRace = addRace;
  window.removeRace = removeRace;
  window.updateScore = updateScore;
  window.openOfficialWhatsApp = openOfficialWhatsApp;
  window.focusWhatsappEditor = focusWhatsappEditor;
  window.saveWhatsappChannel = saveWhatsappChannel;
  window.shareInscriptionLink = shareInscriptionLink;
  window.sharePlacaPng = sharePlacaPng;
  window.logoutCommission = logoutCommission;
  window.downloadDoc = downloadDoc;
  window.saveFechaForm = saveFechaForm;
  window.resetFechaForm = resetFechaForm;
  window.editFecha = editFecha;
  window.deleteFecha = deleteFecha;
  window.saveBoatClass = saveBoatClass;
  window.editBoatClass = editBoatClass;
  window.deleteBoatClass = deleteBoatClass;

  document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(location.search);
    const fechaParam = params.get("fecha");
    if (fechaParam && eventList().some((e) => e.id === fechaParam))
      state.fecha = fechaParam;
    fillCategories();
    resetFechaForm();
    switchTab(
      params.get("mode") === "register" ? "inscripcion" : "inscripcion"
    );
    initAppwrite();
    window.addEventListener("online", () => {
      toast("Red disponible: sincronizando…");
      if (appwriteReady) pushCloud();
      else initAppwrite();
    });
    window.addEventListener("offline", () => {
      setSyncBadge("error", "Sin señal");
    });
  });
})();
