const mineflayer = require('mineflayer');
const { pathfinder } = require('mineflayer-pathfinder');

class BotManager {
    constructor() {
        this.bot = null;
        this.manualStop = false;
        this.reconnectDelay = 5000;
        this.statusData = {};
    }

    startBot(options) {
        this.manualStop = false;
        this._spawnBot(options);
    }

    stopBot() {
        this.manualStop = true;
        if (this.bot) this.bot.quit();
    }

    _spawnBot(options) {
        this.bot = mineflayer.createBot(options);
        this.bot.loadPlugin(pathfinder);

        this.bot.once('spawn', () => this._updateStatus());
        this.bot.on('end', () => {
            if (!this.manualStop) setTimeout(() => this._spawnBot(options), this.reconnectDelay);
        });

        this.bot.on('health', () => this._updateStatus());
        this.bot.on('move', () => this._updateStatus());
        this.bot.on('experience', () => this._updateStatus());
        this.bot.on('entityEffect', () => this._updateStatus());
        this.bot.on('inventoryUpdate', () => this._updateStatus());
    }

    _updateStatus() {
        if (!this.bot) return;
        const pos = this.bot.entity ? this.bot.entity.position : { x: 0, y: 0, z: 0 };
        this.statusData = {
            position: pos,
            dimension: this.bot.dimension || 'unknown',
            health: this.bot.health,
            hunger: this.bot.food,
            xp: this.bot.experience.level,
            effects: this.bot.entity ? Array.from(this.bot.entity.effects.values()) : [],
            inventory: this.bot.inventory ? this.bot.inventory.slots : null
        };
    }

    getStatus() {
        return this.statusData;
    }
}

module.exports = BotManager;
