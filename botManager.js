import EventEmitter from "events";
import mineflayer from "mineflayer";
import { ActionManager } from "./actionManager.js";
import { Vec3 } from "vec3";

function safeItemToLabel(item) {
  if (!item) return { name: "(empty)", count: 0 };
  return { name: item.displayName || item.name || `#${item.type}`, count: item.count || 1 };
}

let nextId = 1;

export class BotManager {
  constructor(defaults) {
    this.defaults = defaults;
    this.bots = new Map(); // id -> botRecord
    this.ee = new EventEmitter();
  }

  onAnyUpdate(fn) {
    this.ee.on("update", fn);
  }

  emit(type, data) {
    this.ee.emit("update", { type, data });
  }

  addBot(name) {
    const id = `${nextId++}`;
    const rec = {
      id,
      name: name?.trim() || `Bot${id}`,
      status: "stopped",
      autoReconnect: this.defaults.autoReconnect,
      hotbar: Array(9).fill({ name: "(empty)", count: 0 }),
      offhand: { name: "(empty)", count: 0 },
      health: null,
      food: null,
      actionMgr: null,
      mc: null,
      lastPos: null
    };
    this.bots.set(id, rec);
    this.emit("bots", this.summary());
    return rec;
  }

  removeBot(id) {
    const rec = this.bots.get(id);
    if (!rec) return;
    this.stopBot(id);
    this.bots.delete(id);
    this.emit("bots", this.summary());
  }

  summary() {
    return Array.from(this.bots.values()).map((b) => ({
      id: b.id,
      name: b.name,
      status: b.status,
      health: b.health,
      food: b.food,
      hotbar: b.hotbar,
      offhand: b.offhand
    }));
  }

  startBot(id) {
    const rec = this.bots.get(id);
    if (!rec || rec.status === "running") return;

    const bot = mineflayer.createBot({
      host: this.defaults.host,
      port: this.defaults.port,
      username: rec.name,      // cracked server => offline auth
      auth: "offline",
      version: this.defaults.version
    });

    rec.mc = bot;
    rec.status = "connecting";
    rec.actionMgr = new ActionManager(bot);
    this.emit("bots", this.summary());

    // events
    bot.once("login", () => {
      rec.status = "running";
      this.refreshInv(rec);
      this.emit("bots", this.summary());
    });

    bot.on("health", () => {
      rec.health = Math.round(bot.health);
      rec.food = bot.food;
      this.emit("botUpdate", { id: rec.id, health: rec.health, food: rec.food });
    });

    bot.on("spawn", () => {
      // auto-respawn is handled by "death" event
    });

    bot.on("death", () => {
      // respawn asap
      setTimeout(() => {
        try { bot.respawn(); } catch {}
      }, 1000);
    });

    bot.on("kicked", (reason) => {
      rec.status = `kicked: ${reason}`;
      this.emit("bots", this.summary());
    });

    bot.on("end", () => {
      rec.status = "disconnected";
      this.emit("bots", this.summary());
      rec.actionMgr?.stopAll();

      if (rec.autoReconnect) {
        setTimeout(() => this.startBot(id), 5000);
      }
    });

    bot.on("error", (err) => {
      rec.status = `error: ${err?.message || err}`;
      this.emit("bots", this.summary());
    });

    // inventory updates
    const invRefresh = () => this.refreshInv(rec);
    bot.on("windowUpdate", invRefresh);
    bot.on("setQuickBarSlot", invRefresh);

    // track last position for block-distance movement
    bot.on("move", () => {
      rec.lastPos = bot.entity?.position?.clone();
    });
  }

  stopBot(id) {
    const rec = this.bots.get(id);
    if (!rec || !rec.mc) return;
    rec.autoReconnect = false;        // user-initiated stop
    rec.actionMgr?.stopAll();
    try { rec.mc.quit("user stop"); } catch {}
    rec.mc = null;
    rec.status = "stopped";
    this.emit("bots", this.summary());
  }

  refreshInv(rec) {
    const bot = rec.mc;
    if (!bot) return;
    const h = [];
    // hotbar slots 36..44 in player inventory window
    for (let i = 0; i < 9; i++) {
      const item = bot.inventory.slots[36 + i];
      h.push(safeItemToLabel(item));
    }
    rec.hotbar = h;
    const off = bot.inventory.slots[45] || null; // offhand at slot 45 (modern versions)
    rec.offhand = safeItemToLabel(off);
    this.emit("inventory", { id: rec.id, hotbar: rec.hotbar, offhand: rec.offhand });
  }

  selectHotbar(id, slot) {
    const rec = this.bots.get(id);
    if (!rec?.mc) return;
    const s = Math.max(0, Math.min(8, slot|0));
    rec.mc.setQuickBarSlot(s);
    this.refreshInv(rec);
  }

  // Movement: control ∈ forward/back/left/right; mode ∈ once/continuous/stop
  setMovement(id, control, mode, blocks) {
    const rec = this.bots.get(id);
    if (!rec?.mc) return;
    const bot = rec.mc;

    const map = {
      forward: "forward",
      back: "back",
      left: "left",
      right: "right"
    };
    const ctrl = map[control];
    if (!ctrl) return;

    if (mode === "stop") {
      bot.setControlState(ctrl, false);
      return;
    }

    if (mode === "continuous") {
      bot.setControlState(ctrl, true);
      return;
    }

    // once => move X blocks in that direction, stop automatically
    const startPos = bot.entity.position.clone();
    bot.setControlState(ctrl, true);

    const tick = setInterval(() => {
      const p = bot.entity.position;
      const dx = p.x - startPos.x;
      const dz = p.z - startPos.z;
      const dist = Math.sqrt(dx*dx + dz*dz);
      if (dist >= Math.max(0, Number(blocks) || 1)) {
        bot.setControlState(ctrl, false);
        clearInterval(tick);
      }
    }, 100); // check 10 times per second
  }

  // Look adjustments in degrees
  nudgeLook(id, yawDeg, pitchDeg) {
    const rec = this.bots.get(id);
    if (!rec?.mc) return;
    const bot = rec.mc;
    // mineflayer uses yaw (horizontal) & pitch (vertical) in radians
    const yaw = bot.entity.yaw + (Number(yawDeg) * Math.PI / 180);
    let pitch = bot.entity.pitch + (Number(pitchDeg) * Math.PI / 180);
    // clamp pitch (~ straight up/down ≈ ±1.5 rad)
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    pitch = clamp(pitch, -Math.PI/2, Math.PI/2);
    bot.look(yaw, pitch, true);
  }

  lookAtBlock(id, x, y, z) {
    const rec = this.bots.get(id);
    if (!rec?.mc) return;
    const bot = rec.mc;
    const target = new Vec3(Number(x), Number(y), Number(z));
    bot.lookAt(target.offset(0.5, 0.5, 0.5), true);
  }

  doAction(id, action, mode = "once", intervalGt = 4) {
    const rec = this.bots.get(id);
    if (!rec?.mc || !rec?.actionMgr) return;
    rec.actionMgr.configure(action, mode, intervalGt);
  }
}
