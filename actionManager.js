// 1 game tick = 50ms (20 ticks/sec)
const gtToMs = (gt) => Math.max(1, Math.floor(gt)) * 50;

export class ActionManager {
  constructor(bot) {
    this.bot = bot;
    this.timers = new Map(); // action -> timerId
    this.states = new Map(); // action -> continuous state boolean
  }

  stopAll() {
    for (const t of this.timers.values()) clearInterval(t);
    this.timers.clear();
    // release continuous control states
    this._setControl("jump", false);
    this._setControl("sneak", false);
    this.bot.deactivateItem();
    this.states.clear();
  }

  configure(action, mode, intervalGt) {
    if (mode === "stop") return this._stop(action);
    if (mode === "once") return this._runOnce(action);
    if (mode === "continuous") return this._setContinuous(action, true);
    if (mode === "interval") return this._setInterval(action, gtToMs(intervalGt || 4));
  }

  _stop(action) {
    // clear intervals
    const t = this.timers.get(action);
    if (t) {
      clearInterval(t);
      this.timers.delete(action);
    }
    // release controls if needed
    if (action === "jump" || action === "sneak") {
      this._setControl(action, false);
    }
    if (action === "rightClick" || action === "useItem") {
      this.bot.deactivateItem();
    }
    this.states.set(action, false);
  }

  _runOnce(action) {
    switch (action) {
      case "jump":
        this._pulseControl("jump", 150);
        break;
      case "sneak":
        this._pulseControl("sneak", 300);
        break;
      case "leftClick":
        // swing arm (generic attack/mining swing)
        this.bot.swingArm("right");
        break;
      case "rightClick":
      case "useItem":
        this.bot.activateItem();
        setTimeout(() => this.bot.deactivateItem(), 120);
        break;
      case "drop":
        this._dropSelected(1);
        break;
      case "dropStack":
        this._dropSelected("all");
        break;
      default:
        break;
    }
  }

  _setContinuous(action, on) {
    switch (action) {
      case "jump":
      case "sneak":
        this._setControl(action, on);
        break;
      case "leftClick":
        if (on) {
          // simulate held left click by swinging every ~2gt
          const t = setInterval(() => this.bot.swingArm("right"), 100);
          this.timers.set(action, t);
        } else {
          const t = this.timers.get(action);
          if (t) clearInterval(t);
          this.timers.delete(action);
        }
        break;
      case "rightClick":
      case "useItem":
        if (on) this.bot.activateItem(); else this.bot.deactivateItem();
        break;
      default:
        break;
    }
    this.states.set(action, !!on);
  }

  _setInterval(action, ms) {
    // clear existing
    const old = this.timers.get(action);
    if (old) clearInterval(old);

    const tick = () => this._runOnce(action);
    const t = setInterval(tick, ms);
    this.timers.set(action, t);
  }

  _setControl(action, on) {
    const ctrlMap = { jump: "jump", sneak: "sneak" };
    const ctrl = ctrlMap[action];
    if (ctrl) this.bot.setControlState(ctrl, on);
  }

  _pulseControl(action, durationMs) {
    this._setControl(action, true);
    setTimeout(() => this._setControl(action, false), durationMs);
  }

  _dropSelected(count) {
    const idx = this.bot.quickBarSlot;
    const item = this.bot.inventory.slots[36 + idx];
    if (!item) return;
    if (count === "all") {
      this.bot.tossStack(item).catch(() => {});
    } else {
      this.bot.toss(item.type, null, 1).catch(() => {});
    }
  }
}
