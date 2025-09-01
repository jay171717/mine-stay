const hotbarContainer = document.getElementById('hotbarSlots');
const offhandContainer = document.getElementById('offhandSlot');

document.addEventListener('botStatusUpdate', (e) => {
    const bot = e.detail;
    if (!bot.inventory) return;

    hotbarContainer.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const item = bot.inventory[i];
        const slot = document.createElement('div');
        slot.className = 'hotbar-slot';
        slot.textContent = item ? `${item.name} x${item.count}` : 'Empty';
        slot.addEventListener('click', () => socket.emit('selectSlot', i));
        hotbarContainer.appendChild(slot);
    }

    const offhand = bot.inventory.offhand;
    offhandContainer.textContent = offhand ? `Offhand: ${offhand.name} x${offhand.count}` : 'Offhand: Empty';
    document.getElementById('swapOffhandBtn').onclick = () => socket.emit('swapOffhand');
});
