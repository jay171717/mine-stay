const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { Vec3 } = require('vec3');

class BotManager {
    constructor() {
        this.bot = null;
        this.manualStop = false;
        this.reconnectDelay = 5000;
        this.statusData = {};
        this.movements = null;
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

        this.bot.once('spawn', () => {
            this.movements = new Movements(this.bot);
            this.bot.pathfinder.setMovements(this.movements);
            this._updateStatus();
        });

        this.bot.on('end', () => {
            if (!this.manualStop) setTimeout(() => this._spawnBot(options), this.reconnectDelay);
        });

        ['health', 'move', 'experience', 'entityEffect', 'inventoryUpdate'].forEach(ev => {
            this.bot.on(ev, () => this._updateStatus());
        });

        // Handle moveBot events
        this.bot.on('moveBot', data => this.moveBot(data));
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

    moveBot(data) {
        if (!this.bot) return;

        const { x, y, z, blocks, moveMode, autoJump } = data;
        const goal = x !== undefined && y !== undefined && z !== undefined
            ? new goals.GoalBlock(x, y, z)
            : null;

        if (goal) {
            this.bot.pathfinder.setGoal(goal);
        }
    }
}

module.exports = BotManager;
