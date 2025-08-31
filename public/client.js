const sock = io();

let state = {
  server: null,
  bots: [],
  activeId: null
};

const el = (q) => document.querySelector(q);
const list = (q) => Array.from(document.querySelectorAll(q));

function toast(msg) {
  const t = el("#toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 2000);
}

// bootstrap
sock.on("bootstrap", (data) => {
  state.server = data.server;
  state.bots = data.bots;
  renderServer();
  renderBots();
});

// server status
sock.on("serverStatus", (s) => {
  state.server = s;
  renderServer();
});

sock.on("bots", (bots) => {
  state.bots = bots;
  renderBots();
  renderDetail();
});

sock.on("inventory", ({ id, hotbar, offhand }) => {
  const b = state.bots.find((x) => x.id === id);
  if (!b) return;
  b.hotbar = hotbar;
  b.offhand = offhand;
  if (state.activeId === id) renderDetail();
});

sock.on("botUpdate", ({ id, health, food }) => {
  const b = state.bots.find((x) => x.id === id);
  if (!b) return;
  b.health = health;
  b.food = food;
  if (state.activeId === id) renderDetail();
});

sock.on("errorMsg", (m) => toast(m));

function renderServer() {
  const s = state.server;
  el("#serverStatus").innerHTML = `
    <div>Status: <b>${s?.online ? "Online ✅" : "Offline ⛔"}</b></div>
    <div>MOTD: ${s?.motd || "-"}</div>
    <div>Players: ${s?.players?.online || 0} / ${s?.players?.max || 0}</div>
    <div>Version: ${s?.version || "-"}</div>
  `;
}

function renderBots() {
  const box = el("#botsList");
  if (!state.bots?.length) {
    box.innerHTML = `<div class="muted">No bots yet. Add one ↑</div>`;
    return;
  }
  box.innerHTML = state.bots.map(b => `
    <div class="botRow ${state.activeId === b.id ? "active" : ""}">
      <div class="name" data-pick="${b.id}">${b.name}</div>
      <div class="grow"></div>
      <div class="mini">HP:${b.health ?? "-"} Food:${b.food ?? "-"}</div>
      <button data-start="${b.id}">Start</button>
      <button data-stop="${b.id}">Stop</button>
      <button data-del="${b.id}">Delete</button>
    </div>
  `).join("");

  // wire
  list("[data-pick]").forEach(n => n.onclick = () => { state.activeId = n.dataset.pick; renderDetail(); });
  list("[data-start]").forEach(n => n.onclick = () => sock.emit("startBot", { id: n.dataset.start }));
  list("[data-stop]").forEach(n => n.onclick = () => sock.emit("stopBot", { id: n.dataset.stop }));
  list("[data-del]").forEach(n => n.onclick = () => {
    if (confirm("Delete this bot?")) sock.emit("removeBot", { id: n.dataset.del });
    if (state.activeId === n.dataset.del) state.activeId = null;
    renderDetail();
  });
}

function renderDetail() {
  const panel = el("#botDetail");
  const title = el("#activeTitle");
  const bot = state.bots.find(b => b.id === state.activeId);
  if (!bot) {
    title.textContent = "[No bot selected]";
    panel.classList.add("hidden");
    return;
  }
  title.textContent = `[${bot.name}] — ${bot.status}`;
  panel.classList.remove("hidden");

  // hotbar
  el("#hotbar").innerHTML = bot.hotbar.map((it, i) => `
    <button class="slot" data-slot="${i}">
      <div class="slotName">${i+1}. ${it.name}</div>
      <div class="slotCnt">${it.count}</div>
    </button>
  `).join("");

  list("[data-slot]").forEach(n => n.onclick = () => {
    sock.emit("selectHotbar", { id: bot.id, slot: Number(n.dataset.slot) });
    toast(`Selected hotbar slot ${Number(n.dataset.slot)+1}`);
  });

  // offhand
  el("#offhand").innerHTML = `
    <div class="slot">
      <div class="slotName">${bot.offhand.name}</div>
      <div class="slotCnt">${bot.offhand.count}</div>
    </div>
  `;
}

// controls
el("#addBotBtn").onclick = () => {
  const name = el("#newBotName").value.trim();
  sock.emit("addBot", { name: name || undefined });
  el("#newBotName").value = "";
};

list("[data-move]").forEach(btn => {
  btn.onclick = () => {
    const control = btn.dataset.move;
    const mode = el("#moveMode").value;
    const blocks = Number(el("#moveBlocks").value || "1");
    const id = state.activeId;
    if (!id) return toast("Select a bot first");
    sock.emit("setMovement", { id, control, mode, blocks });
  };
});

list("[data-look]").forEach(btn => {
  btn.onclick = () => {
    const id = state.activeId;
    if (!id) return toast("Select a bot first");
    const deg = Number(el("#lookDeg").value || "15");
    const dir = btn.dataset.look;
    let yaw = 0, pitch = 0;
    if (dir === "left") yaw = -deg;
    if (dir === "right") yaw = deg;
    if (dir === "up") pitch = -deg;
    if (dir === "down") pitch = deg;
    sock.emit("nudgeLook", { id, yawDeg: yaw, pitchDeg: pitch });
  };
});

el("#lookAtBtn").onclick = () => {
  const id = state.activeId;
  if (!id) return toast("Select a bot first");
  const x = Number(el("#blkX").value);
  const y = Number(el("#blkY").value);
  const z = Number(el("#blkZ").value);
  sock.emit("lookAtBlock", { id, x, y, z });
};

el("#runAction").onclick = () => {
  const id = state.activeId;
  if (!id) return toast("Select a bot first");
  const action = el("#actionSel").value;
  const mode = el("#actionMode").value;
  const intervalGt = Number(el("#intervalGt").value || "10");
  sock.emit("doAction", { id, action, mode, intervalGt });
};
