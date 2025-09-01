let moveMode = 'continuous'; 
let autoJump = false;

const toggleMoveModeBtn = document.getElementById('toggleMoveMode');
const autoJumpBtn = document.getElementById('autoJumpBtn');
const moveBtn = document.getElementById('moveBtn');

toggleMoveModeBtn.addEventListener('click', () => {
    moveMode = moveMode === 'continuous' ? 'distance' : 'continuous';
    toggleMoveModeBtn.textContent = moveMode;
});

autoJumpBtn.addEventListener('click', () => {
    autoJump = !autoJump;
    autoJumpBtn.textContent = autoJump ? 'Auto-Jump ON' : 'Auto-Jump OFF';
});

moveBtn.addEventListener('click', () => {
    const x = parseFloat(document.getElementById('gotoX').value);
    const y = parseFloat(document.getElementById('gotoY').value);
    const z = parseFloat(document.getElementById('gotoZ').value);
    const blocks = parseFloat(document.getElementById('moveBlocks').value);

    document.dispatchEvent(new CustomEvent('moveCommand', { detail: { x, y, z, blocks } }));
});
