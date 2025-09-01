// botManager.js
// Manages multiple mineflayer bots: spawn, reconnect, inventory, movement, looking.
// Emits 'update' and 'debug' events (EventEmitter) so server.js can forward to UI.

const mineflayer = require('mineflayer');
const { Vec3 } = require('vec3');
const EventEmitter = require('events');

class BotManager extends EventEmitter {
  constructor({ host = 'localhost', port = 25565, version = '1.21.4', io = null } = {}) {
    super();
    this.host = host;
    this.port = port;
    this.version = version;
    this.bots = new Map(); // username -> botObj
    // botObj: { username, bot, enabled, status, health, food, xp, position, spawnTime, moveIntervals, moveTimeout }
  }

  _debug(username, text) {
    const msg = { username, text, ts: Date.now() };
    this.emit('debug', msg);
  }

  addBot(username) {
    if (this.bots.has(username)) return false;
    const botObj = {
      username,
      bot: null,
      enabled: true,
      status: 'offline',
      health: 20,
      food: 20,
      xp: 0,
      position: null,
      spawnTime: null,
      moveIntervals: {}, // for continuous movement if needed
      moveBlockTask: null,
      goToTask: null
    };
    this.bots.set(username, botObj);
    this._spawn(botObj);
    return true;
  }

  removeBot(username) {
    const botObj = this.bots.get(username);
    if (!botObj) return false;
    botObj.enabled = false;
    if (botObj.bot) {
      try { botObj.bot.quit('Removed'); } catch (e) {}
      botObj.bot = null;
    }
    // clear any movement tasks
    this._clearMovementTasks(botObj);
    this.bots.delete(username);
    this.emit('update');
    return true;
  }

  toggleBot(username) {
    const botObj = this.bots.get(username);
    if (!botObj) return false;
    if (botObj.enabled) {
      // disable -> quit bot
      botObj.enabled = false;
      if (botObj.bot) {
        botObj.bot.quit('Toggled offline');
        botObj.bot = null;
      }
      botObj.status = 'offline';
      this._debug(username, 'Toggled offline by user');
      this.emit('update');
    } else {
      // enable -> spawn
      botObj.enabled = true;
      this._spawn(botObj);
    }
    return true;
  }

  _spawn(botObj) {
    if (!botObj.enabled) return;
    const username = botObj.username;
    this._debug(username, `Spawning bot ${username} -> ${this.host}:${this.port}`);
    const bot = mineflayer.createBot({
      host: this.host,
      port: this.port,
      username,
      version: this.version
    });

    botObj.bot = bot;
    botObj.status = 'connecting';
    botObj.spawnTime = Date.now();

    const cleanupAndReconnect = (reason) => {
      botObj.status = 'offline';
      this._debug(username, `Disconnected (${reason})`);
      botObj.bot = null;
      this._clearMovementTasks(botObj);
      if (botObj.enabled) {
        setTimeout(() => {
          this._debug(username, 'Attempting reconnect...');
          this._spawn(botObj);
        }, 3000);
      }
      this.emit('update');
    };

    bot.once('spawn', () => {
      botObj.status = 'online';
      botObj.position = bot.entity ? bot.entity.position.clone() : null;
      botObj.health = bot.health;
      botObj.food = bot.food;
      botObj.xp = bot.experience ? bot.experience.level : 0;
      botObj.spawnTime = Date.now();
      this._debug(username, 'Spawned and online');
      this.emit('update');
    });

    bot.on('health', () => {
      botObj.health = bot.health;
      botObj.food = bot.food;
      this.emit('update');
    });

    bot.on('experience', () => {
      botObj.xp = bot.experience.level;
      this.emit('update');
    });

    bot.on('move', () => {
      if (bot.entity) botObj.position = bot.entity.position.clone();
      // only emit occasionally to avoid spam — but we emit in 'move' to make UI snappy
      this.emit('update');
    });

    bot.on('kicked', (reason) => {
      cleanupAndReconnect('kicked: ' + reason);
    });

    bot.on('end', () => {
      cleanupAndReconnect('end');
    });

    bot.on('error', (err) => {
      this._debug(username, 'Error: ' + String(err));
    });

    // periodic status emitter in case some events are missed
    botObj._statusInterval = setInterval(() => {
      if (botObj.bot && botObj.bot.entity) {
        botObj.position = botObj.bot.entity.position.clone();
      }
      this.emit('update');
    }, 1000);
  }

  _clearMovementTasks(botObj) {
    // clear move intervals
    if (botObj.moveBlockTask) {
      clearInterval(botObj.moveBlockTask.intervalId);
      clearTimeout(botObj.moveBlockTask.timeoutId);
      botObj.moveBlockTask = null;
    }
    if (botObj.goToTask) {
      clearInterval(botObj.goToTask.intervalId);
      clearTimeout(botObj.goToTask.timeoutId);
      botObj.goToTask = null;
    }
    // stop movement controls
    if (botObj.bot) {
      ['forward','back','left','right'].forEach(c => botObj.bot.setControlState(c, false));
    }
    if (botObj._statusInterval) {
      clearInterval(botObj._statusInterval);
      botObj._statusInterval = null;
    }
  }

  // list-send-friendly representation
  listBots() {
    const res = [];
    for (const botObj of this.bots.values()) {
      res.push({
        username: botObj.username,
        status: botObj.status,
        enabled: botObj.enabled,
        health: botObj.health,
        food: botObj.food,
        xp: botObj.xp,
        position: botObj.position ? { x: botObj.position.x, y: botObj.position.y, z: botObj.position.z } : null,
        uptime: botObj.spawnTime ? Math.floor((Date.now() - botObj.spawnTime) / 1000) : 0
      });
    }
    return res;
  }

  // select hotbar slot (0..8)
  selectHotbarSlot(username, slot) {
    const botObj = this.bots.get(username);
    if (!botObj || !botObj.bot) return false;
    if (slot < 0 || slot > 8) return false;
    try {
      botObj.bot.setQuickBarSlot(slot);
      this._debug(username, `Selected hotbar slot ${slot}`);
      return true;
    } catch (e) {
      this._debug(username, `Error selecting slot: ${e}`);
      return false;
    }
  }

  // swap main and offhand
  async swapMainOffhand(username) {
    const botObj = this.bots.get(username);
    if (!botObj || !botObj.bot) return false;
    try {
      const bot = botObj.bot;
      const offhand = bot.inventory.slots[45]; // offhand index
      const main = bot.heldItem;
      // simple approach: equip offhand to hand (this results in swapping)
      if (offhand) {
        await bot.equip(offhand, 'hand');
      } else {
        // if offhand empty, try to toss and equip? we keep it simple
        this._debug(username, 'No offhand item to swap.');
      }
      this.emit('update');
      return true;
    } catch (e) {
      this._debug(username, 'Swap error: ' + e);
      return false;
    }
  }

  // set continuous movement control
  setMoveState(username, direction, enable) {
    const botObj = this.bots.get(username);
    if (!botObj || !botObj.bot) return false;
    const valid = ['forward','back','left','right'];
    if (!valid.includes(direction)) return false;
    try {
      botObj.bot.setControlState(direction, !!enable);
      this._debug(username, `setMoveState ${direction} = ${enable}`);
      return true;
    } catch (e) {
      this._debug(username, 'setMoveState error: ' + e);
      return false;
    }
  }

  // move X blocks in direction (forward/back/left/right)
  moveBlocks(username, direction, blocks = 1) {
    const botObj = this.bots.get(username);
    if (!botObj || !botObj.bot || !botObj.bot.entity) return false;
    if (!['forward','back','left','right'].includes(direction)) return false;
    // clear previous task if any
    if (botObj.moveBlockTask) {
      clearInterval(botObj.moveBlockTask.intervalId);
      clearTimeout(botObj.moveBlockTask.timeoutId);
      botObj.moveBlockTask = null;
    }

    const startPos = botObj.bot.entity.position.clone();
    const targetDistance = Math.max(0, Number(blocks));
    const bot = botObj.bot;
    let lastPos = startPos.clone();
    let stuckCounter = 0;

    bot.setControlState(direction, true);
    const intervalId = setInterval(() => {
      if (!bot.entity) return;
      const pos = bot.entity.position;
      const dist = pos.distanceTo(startPos);
      // if progressed less than 0.01 for several checks, consider stuck
      if (pos.distanceTo(lastPos) < 0.015) stuckCounter++; else stuckCounter = 0;
      lastPos = pos.clone();

      if (dist >= targetDistance || stuckCounter >= 10) {
        bot.setControlState(direction, false);
        clearInterval(intervalId);
        if (botObj.moveBlockTask) {
          clearTimeout(botObj.moveBlockTask.timeoutId);
          botObj.moveBlockTask = null;
        }
        this._debug(username, `Finished moveBlocks direction=${direction}, dist=${dist.toFixed(2)}`);
        this.emit('update');
      } else {
        // keep moving
      }
    }, 100); // check 10x/sec

    // safety timeout: stop after blocks*4 seconds (heuristic)
    const timeoutId = setTimeout(() => {
      bot.setControlState(direction, false);
      clearInterval(intervalId);
      botObj.moveBlockTask = null;
      this._debug(username, 'moveBlocks timeout - stopped');
      this.emit('update');
    }, Math.max(4000, blocks * 4000));

    botObj.moveBlockTask = { intervalId, timeoutId };
    this._debug(username, `Started moveBlocks direction=${direction} blocks=${blocks}`);
    return true;
  }

  // look in degrees (yaw, pitch) — absolute (not relative)
  lookDegrees(username, yawDeg, pitchDeg) {
    const botObj = this.bots.get(username);
    if (!botObj || !botObj.bot) return false;
    try {
      const yaw = (yawDeg * Math.PI) / 180;
      const pitch = (pitchDeg * Math.PI) / 180;
      botObj.bot.look(yaw, pitch, true);
      this._debug(username, `Look yaw=${yawDeg}°, pitch=${pitchDeg}°`);
      this.emit('update');
      return true;
    } catch (e) {
      this._debug(username, 'lookDegrees error: ' + e);
      return false;
    }
  }

  // look at a vector
  lookAt(username, vec) {
    const botObj = this.bots.get(username);
    if (!botObj || !botObj.bot) return false;
    try {
      const target = new Vec3(vec.x, vec.y, vec.z);
      botObj.bot.lookAt(target);
      this._debug(username, `LookAt ${vec.x},${vec.y},${vec.z}`);
      this.emit('update');
      return true;
    } catch (e) {
      this._debug(username, 'lookAt error: ' + e);
      return false;
    }
  }

  // simplistic goTo: face the target and move forward until within 0.6 blocks (no pathfinder)
  goTo(username, target) {
    const botObj = this.bots.get(username);
    if (!botObj || !botObj.bot || !botObj.bot.entity) return false;
    // clear existing goTo
    if (botObj.goToTask) {
      clearInterval(botObj.goToTask.intervalId);
      clearTimeout(botObj.goToTask.timeoutId);
      botObj.goToTask = null;
    }

    const bot = botObj.bot;
    const start = bot.entity.position.clone();
    const tgt = new Vec3(target.x, target.y, target.z);

    const intervalId = setInterval(() => {
      if (!bot.entity) return;
      const pos = bot.entity.position;
      const dx = tgt.x - pos.x;
      const dz = tgt.z - pos.z;
      const horizDist = Math.sqrt(dx * dx + dz * dz);
      if (horizDist < 0.6) {
        bot.setControlState('forward', false);
        clearInterval(intervalId);
        if (botObj.goToTask) {
          clearTimeout(botObj.goToTask.timeoutId);
          botObj.goToTask = null;
        }
        this._debug(username, `Reached target ${tgt.x},${tgt.y},${tgt.z}`);
        this.emit('update');
        return;
      }
      // look towards target
      const yaw = Math.atan2(-dx, -dz); // mineflayer uses -z forward
      bot.look(yaw, 0, true);
      // move forward
      bot.setControlState('forward', true);
    }, 150);

    // safety timeout: stop after 60s
    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      if (botObj.goToTask) botObj.goToTask = null;
      bot.setControlState('forward', false);
      this._debug(username, 'goTo timeout');
      this.emit('update');
    }, 60000);

    botObj.goToTask = { intervalId, timeoutId };
    this._debug(username, `goTo started to ${tgt.x},${tgt.y},${tgt.z}`);
    return true;
  }
}

module.exports = BotManager;
