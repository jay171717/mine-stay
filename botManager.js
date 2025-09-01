const mineflayer = require('mineflayer');
const Vec3 = require('vec3');

class BotManager {
  constructor(io){
    this.io = io;
    this.bots = {};
  }

  addBot(username){
    if(this.bots[username]) return;
    const bot = this.createBot(username);
    this.bots[username] = { bot, username, online:false, hotbar:[], offhand:null, health:20, hunger:20, tasks:{} };
    this.emitBots();
  }

  removeBot(username){
    const b = this.bots[username];
    if(!b) return;
    b.bot.end();
    delete this.bots[username];
    this.emitBots();
  }

  toggleBot(username){
    const b = this.bots[username];
    if(!b) return;
    if(b.online){
      b.bot.end();
    } else {
      this.bots[username].bot = this.createBot(username);
    }
  }

  createBot(username){
    const bot = mineflayer.createBot({
      host: 'fakesalmon.aternos.me',
      port: 25565,
      username
    });

    bot.on('login', ()=> {
      const data = this.bots[username];
      if(!data) return;
      data.online = true;
      data.health = bot.health;
      data.hunger = bot.food;
      this.emitBots();
    });

    bot.on('spawn', ()=>{
      const data = this.bots[username];
      if(!data) return;
      data.tasks = {}; // reset tasks
      this.emitBots();
    });

    bot.on('end', ()=>{
      const data = this.bots[username];
      if(!data) return;
      data.online = false;
      this.emitBots();
      // Attempt reconnect after 3 seconds
      setTimeout(()=> {
        if(this.bots[username]){
          this.bots[username].bot = this.createBot(username);
        }
      }, 3000);
    });

    bot.on('health', ()=> {
      const data = this.bots[username];
      if(!data) return;
      data.health = bot.health;
      data.hunger = bot.food;
      this.emitBots();
    });

    bot.on('inventoryUpdate', ()=> {
      const data = this.bots[username];
      if(!data) return;
      const hotbar = [];
      for(let i=0;i<9;i++){
        hotbar[i] = bot.inventory.slots[i]?bot.inventory.slots[i].name:null;
      }
      data.hotbar = hotbar;
      data.offhand = bot.inventory.slots[bot.inventory.offHand]?.name||null;
      this.emitBots();
    });

    return bot;
  }

  emitBots(){
    const list = Object.values(this.bots).map(b=>({
      username:b.username,
      online:b.online,
      hotbar:b.hotbar,
      offhand:b.offhand,
      health:b.health,
      hunger:b.hunger
    }));
    this.io.emit('bots', list);
  }

  handleMove(username, data){
    const b = this.bots[username];
    if(!b || !b.online) return;
    const bot = b.bot;
    const t = b.tasks;
    if(data.stop){
      ['forward','back','left','right'].forEach(d=>bot.setControlState(d,false));
      return;
    }
    if(data.dir && data.on!==undefined){
      bot.setControlState(data.dir, data.on);
    }
    if(data.blocks){
      const vec = {
        forward: new Vec3(0,0,1),
        back: new Vec3(0,0,-1),
        left: new Vec3(-1,0,0),
        right: new Vec3(1,0,0)
      }[data.dir];
      if(!vec) return;
      const start = bot.entity.position.clone();
      const target = start.plus(vec.scaled(data.blocks));
      if(t.moveTo) clearInterval(t.moveTo);
      t.moveTo = setInterval(()=>{
        const pos = bot.entity.position;
        const dist = pos.distanceTo(target);
        if(dist<0.2){
          clearInterval(t.moveTo);
          delete t.moveTo;
        } else {
          const dx = target.x-pos.x;
          const dy = target.y-pos.y;
          const dz = target.z-pos.z;
          bot.look(dx,dy,dz,true);
          bot.setControlState('forward',true);
        }
      },100);
    }
  }

  handleLookDelta(username, data){
    const b = this.bots[username];
    if(!b || !b.online) return;
    const bot = b.bot;
    if(data.dx!==undefined) bot.look(bot.entity.yaw + data.dx*Math.PI/180, bot.entity.pitch, true);
    if(data.dy!==undefined) bot.look(bot.entity.yaw, bot.entity.pitch + data.dy*Math.PI/180, true);
  }

  handleLookAt(username, data){
    const b = this.bots[username];
    if(!b || !b.online) return;
    const bot = b.bot;
    bot.lookAt(new Vec3(data.x,data.y,data.z));
  }

  handleGoTo(username, data){
    const b = this.bots[username];
    if(!b || !b.online) return;
    const bot = b.bot;
    const t = b.tasks;
    const target = new Vec3(data.x,data.y,data.z);
    if(t.goTo) clearInterval(t.goTo);
    t.goTo = setInterval(()=>{
      const pos = bot.entity.position;
      const dist = pos.distanceTo(target);
      if(dist<0.3){
        clearInterval(t.goTo);
        delete t.goTo;
        bot.setControlState('forward',false);
      } else {
        const dx = target.x-pos.x;
        const dy = target.y-pos.y;
        const dz = target.z-pos.z;
        bot.look(dx,dy,dz,true);
        bot.setControlState('forward',true);
      }
    },100);
  }
}

module.exports = BotManager;
