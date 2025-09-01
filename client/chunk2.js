document.addEventListener('moveCommand', (e) => {
    socket.emit('moveBot', e.detail);
});
