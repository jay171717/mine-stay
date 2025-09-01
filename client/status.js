const statusContainer = document.getElementById('statusInfo');

document.addEventListener('botStatusUpdate', (e) => {
    const status = e.detail;
    statusContainer.innerHTML = `
        Position: (${status.position.x.toFixed(2)}, ${status.position.y.toFixed(2)}, ${status.position.z.toFixed(2)}) [${status.dimension}]<br>
        Health: ${status.health}<br>
        Hunger: ${status.hunger}<br>
        XP: ${status.xp}<br>
        Effects: ${status.effects.map(e => e.type).join(', ')}
    `;
});
