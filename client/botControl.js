const socket = io();

const startBtn = document.getElementById('startStopBtn');
let botRunning = false;

startBtn.addEventListener('click', () => {
    if (!botRunning) {
        const options = {
            username: document.getElementById('username').value,
            host: document.getElementById('host').value,
            port: parseInt(document.getElementById('port').value),
            version: document.getElementById('version').value
        };
        socket.emit('startBot', options);
        botRunning = true;
        startBtn.textContent = 'Stop';
    } else {
        socket.emit('stopBot');
        botRunning = false;
        startBtn.textContent = 'Start';
    }
});

socket.on('botStatus', (status) => {
    document.dispatchEvent(new CustomEvent('botStatusUpdate', { detail: status }));
});
