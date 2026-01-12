/* ---------- config ---------- */
const STORAGE_KEY = "sketure_apps_v1";

/* ---------- helpers ---------- */
const qs = (s) => document.querySelector(s);
const qsa = (s) => Array.from(document.querySelectorAll(s));
const now = () => new Date().toISOString();

/* ---------- FORM: index.html ---------- */
const form = qs("#appForm");
if (form) {
  // ensure inputs are always blank on load (prevent any accidental prefill)
  ["name","email","phone","location","role","experience","portfolio","instagram","why","availability","startDate"].forEach(id=>{
    const el = qs("#"+id);
    if(el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT")){
      el.value = "";
    }
  });

  // conditional: require instagram if no portfolio
  const portfolio = qs("#portfolio");
  const instagram = qs("#instagram");
  const instWrap = qs("#instWrap");

  const validateFallback = () => {
    // if portfolio empty, instagram needed (non-empty)
    const p = (portfolio && portfolio.value && portfolio.value.trim() !== "");
    if (!p) {
      instagram.setAttribute("required","required");
      instWrap.style.opacity = "1";
    } else {
      instagram.removeAttribute("required");
      instWrap.style.opacity = "0.85";
    }
  };

  if (portfolio) portfolio.addEventListener("input", validateFallback);
  // initialize fallback state
  validateFallback();

  form.addEventListener("submit", function(e){
    e.preventDefault();

    // collect form values
    const data = {
      id: Date.now().toString(),
      timestamp: now(),
      name: qs("#name").value.trim(),
      email: qs("#email").value.trim(),
      phone: qs("#phone").value.trim(),
      location: qs("#location").value.trim(),
      role: qs("#role").value,
      experience: qs("#experience").value,
      portfolio: qs("#portfolio").value.trim(),
      instagram: qs("#instagram").value.trim(),
      why: qs("#why").value.trim(),
      availability: qs("#availability").value,
      startDate: qs("#startDate").value || "",
    };

    // validation: if portfolio empty and no instagram -> block
    if (!data.portfolio && !data.instagram) {
      alert("Please provide a Portfolio link or your Instagram ID.");
      return;
    }
    if (!data.name || !data.email || !data.why) {
      alert("Please fill name, email and the short note about why you want to join.");
      return;
    }

    // read-storage, push, save
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    stored.push(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    // clear inputs (prevent showing data on revisit)
    form.reset();

    // go to dashboard
    window.location.href = "dashboard.html";
  });
}

/* ---------- DASHBOARD: dashboard.html ---------- */
const listEl = qs("#list");
if (listEl) {
  const loadAndRender = () => {
    listEl.innerHTML = "";
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]").reverse(); // newest first

    if (!data.length) {
      listEl.innerHTML = `<div class="card"><div class="meta"><div class="title">No applications yet</div><div class="small">Open the application form and submit one.</div></div></div>`;
      return;
    }

    data.forEach(item => {
      const card = document.createElement("article");
      card.className = "card";
      const date = new Date(item.timestamp);
      const dateStr = date.toLocaleString();

      // portfolio link or instagram fallback
      let contactLine = "";
      if (item.portfolio) {
        contactLine = `<a class="link" href="${escapeHtml(item.portfolio)}" target="_blank" rel="noopener">Portfolio</a>`;
      } else if (item.instagram) {
        const handle = item.instagram.startsWith("@") ? item.instagram : ("@" + item.instagram);
        contactLine = `<a class="link" href="https://instagram.com/${encodeURI(item.instagram.replace(/^@/,''))}" target="_blank" rel="noopener">${escapeHtml(handle)}</a>`;
      }

      card.innerHTML = `
        <div class="meta">
          <div class="title">${escapeHtml(item.name)} <span class="small">· ${escapeHtml(item.role)}</span></div>
          <div class="small">${escapeHtml(item.email)}${item.phone ? " · "+escapeHtml(item.phone):""} ${item.location? "· "+escapeHtml(item.location):""}</div>
          <div style="margin-top:8px">
            <span class="badge">${escapeHtml(item.experience)}</span>
            <span class="badge">${escapeHtml(item.availability)}</span>
            ${item.startDate ? `<span class="badge">Start: ${escapeHtml(item.startDate)}</span>` : ""}
          </div>

          <div style="margin-top:10px">${escapeHtml(item.why)}</div>

          <div class="actions-row">
            ${contactLine ? `<span style="margin-right:12px">${contactLine}</span>` : ""}
            <button class="btn" data-action="view" data-id="${item.id}">View raw</button>
            <button class="btn ghost" data-action="copy" data-id="${item.id}">Copy</button>
            <button class="btn danger" data-action="delete" data-id="${item.id}">Delete</button>
          </div>

          <div class="small" style="margin-top:8px;color:var(--muted)">Submitted: ${dateStr}</div>
        </div>
      `;
      listEl.appendChild(card);
    });
  };

  // escape helper (prevent injection)
  function escapeHtml(str){
    if(!str) return "";
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  // actions (delegation)
  listEl.addEventListener("click", function(e){
    const btn = e.target.closest("button");
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    let data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

    if (action === "delete") {
      if (!confirm("Delete this application?")) return;
      data = data.filter(x => x.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      loadAndRender();
    }

    if (action === "view") {
      const entry = data.find(x => x.id === id);
      if (!entry) return;
      alert(JSON.stringify(entry, null, 2));
    }

    if (action === "copy") {
      const entry = data.find(x => x.id === id);
      if (!entry) return;
      const copyText = `Name: ${entry.name}\nEmail: ${entry.email}\nRole: ${entry.role}\nPortfolio: ${entry.portfolio || entry.instagram}\nWhy: ${entry.why}`;
      navigator.clipboard && navigator.clipboard.writeText(copyText).then(()=>{
        btn.textContent = "Copied";
        setTimeout(()=> btn.textContent = "Copy", 1200);
      }).catch(()=> alert("Copy failed"));
    }
  });

  // search
  const search = qs("#search");
  if (search) {
    search.addEventListener("input", function(){
      const q = this.value.trim().toLowerCase();
      const cards = q ? JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]").filter(item=>{
        return (item.name+ " "+ item.email + " "+ item.role + " "+ item.why).toLowerCase().includes(q);
      }).reverse() : JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]").reverse();

      // render filtered
      listEl.innerHTML = "";
      if (!cards.length) {
        listEl.innerHTML = `<div class="card"><div class="meta"><div class="title">No matches</div><div class="small">Try a different search.</div></div></div>`;
        return;
      }
      cards.forEach(item => {
        const card = document.createElement("article");
        card.className = "card";
        const date = new Date(item.timestamp).toLocaleString();
        card.innerHTML = `
          <div class="meta">
            <div class="title">${escapeHtml(item.name)} <span class="small">· ${escapeHtml(item.role)}</span></div>
            <div class="small">${escapeHtml(item.email)}</div>
            <div style="margin-top:8px">${escapeHtml(item.why)}</div>
            <div class="actions-row" style="margin-top:10px;">
              ${item.portfolio? `<a class="link" href="${escapeHtml(item.portfolio)}" target="_blank">Portfolio</a>` : (item.instagram? `<a class="link" href="https://instagram.com/${encodeURI(item.instagram.replace(/^@/,''))}" target="_blank">${escapeHtml(item.instagram)}</a>` : "")}
              <button class="btn" data-action="view" data-id="${item.id}">View raw</button>
              <button class="btn ghost" data-action="copy" data-id="${item.id}">Copy</button>
              <button class="btn danger" data-action="delete" data-id="${item.id}">Delete</button>
            </div>
            <div class="small" style="margin-top:8px;color:var(--muted)">Submitted: ${date}</div>
          </div>
        `;
        listEl.appendChild(card);
      });
    });
  }

  // clear all
  const clearAll = qs("#clearAll");
  if (clearAll) {
    clearAll.addEventListener("click", function(){
      if (!confirm("Clear ALL applications from this browser? This cannot be undone.")) return;
      localStorage.removeItem(STORAGE_KEY);
      loadAndRender();
    });
  }

  // print
  const printBtn = qs("#printBtn");
  if (printBtn) printBtn.addEventListener("click", ()=> window.print());

  // initial render
  loadAndRender();
}
