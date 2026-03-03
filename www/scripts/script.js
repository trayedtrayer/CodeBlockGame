const BLOCK_CONFIG = {
    'var-declare':   { label: 'let x = ...', colorClass: 'var',      fields: [{ label: 'let', key: 'varName', placeholder: 'имя' }, { label: '=', key: 'value', placeholder: 'значение' }] },
    'var-assign':    { label: 'x = ...',     colorClass: 'var',      fields: [{ label: '', key: 'varName', placeholder: 'переменная' }, { label: '=', key: 'value', placeholder: 'новое значение' }] },
    'var-change':    { label: 'x += ...',    colorClass: 'var',      fields: [{ label: '', key: 'varName', placeholder: 'переменная' }, { label: '+=', key: 'value', placeholder: 'на сколько' }] },
    'loop-for':      { label: 'for ( ; ; )', colorClass: 'loop',     fields: [{ label: 'let', key: 'varName', placeholder: 'i' }, { label: '=', key: 'from', placeholder: '0' }, { label: 'до', key: 'to', placeholder: '10' }, { label: 'шаг', key: 'step', placeholder: '1' }] },
    'loop-for-of':   { label: 'for...of',   colorClass: 'loop',     fields: [{ label: 'для', key: 'varName', placeholder: 'элемент' }, { label: 'из', key: 'list', placeholder: 'массив' }] },
    'loop-while':    { label: 'while (...)', colorClass: 'loop',     fields: [{ label: 'пока', key: 'condition', placeholder: 'условие' }] },
    'if-block':      { label: 'если (if)',   colorClass: 'if',       fields: [{ label: 'если', key: 'condition', placeholder: 'условие' }] },
    'else-if-block': { label: 'иначе если', colorClass: 'if',       fields: [{ label: 'иначе если', key: 'condition', placeholder: 'условие' }] },
    'else-block':    { label: 'иначе (else)',colorClass: 'else',     fields: [] },
    'func-declare':  { label: 'function f( )', colorClass: 'func',   fields: [{ label: 'function', key: 'funcName', placeholder: 'имяФункции' }, { label: '(', key: 'params', placeholder: 'параметры' }] },
    'func-call':     { label: 'вызов f( )', colorClass: 'func',     fields: [{ label: '', key: 'funcName', placeholder: 'имяФункции' }, { label: '(', key: 'args', placeholder: 'аргументы' }] },
    'func-return':   { label: 'return',     colorClass: 'func',     fields: [{ label: 'return', key: 'value', placeholder: 'значение (необяз.)' }] },
    'break':         { label: 'break',      colorClass: 'break',    fields: [] },
    'continue':      { label: 'continue',   colorClass: 'continue', fields: [] },
    'console-log':   { label: 'console.log( )', colorClass: 'console', fields: [{ label: 'log', key: 'message', placeholder: 'сообщение или переменная' }] },
    'alert':         { label: 'alert( )',   colorClass: 'alert',    fields: [{ label: 'alert', key: 'message', placeholder: 'сообщение' }] }
};

const SNAP_DISTANCE = 30;

const program = [];
let blockCounter = 0;

const workspace = document.getElementById('workspace');
const hint      = workspace.querySelector('.workspace-hint');
const runButton = document.getElementById('run-button');
const outputEl  = document.getElementById('output-content');

function generateId() {
    return `block-${++blockCounter}`;
}

function updateHint() {
    hint.style.display = workspace.querySelector('.block-active') ? 'none' : 'block';
}

function addToProgram(id, type) {
    program.push({ id, type, data: {}, nextId: null });
}

function removeFromProgram(id) {
    program.forEach(e => { if (e.nextId === id) e.nextId = null; });
    const index = program.findIndex(e => e.id === id);
    if (index !== -1) program.splice(index, 1);
}

function getProgramEntry(id) {
    return program.find(e => e.id === id);
}

function getBlockEl(id) {
    return workspace.querySelector(`[data-id="${id}"]`);
}

function getBlockPos(el) {
    return {
        left:   parseInt(el.style.left),
        top:    parseInt(el.style.top),
        width:  el.offsetWidth,
        height: el.offsetHeight
    };
}

function detachFromParent(id) {
    program.forEach(e => { if (e.nextId === id) e.nextId = null; });
    workspace.querySelectorAll('.block-active').forEach(el => {
        if (el.dataset.snapNext === id) el.dataset.snapNext = '';
    });
}

function repositionChain(startEl) {
    let current = startEl;
    while (current) {
        const nextId = current.dataset.snapNext;
        if (!nextId) break;
        const nextEl = getBlockEl(nextId);
        if (!nextEl) break;
        const r = getBlockPos(current);
        nextEl.style.left = `${r.left}px`;
        nextEl.style.top  = `${r.top + r.height}px`;
        current = nextEl;
    }
}

function attachBlocks(parentEl, childEl) {
    const parentId = parentEl.dataset.id;
    const childId  = childEl.dataset.id;

    if (parentId === childId) return;

    let check = getProgramEntry(childId);
    while (check) {
        if (check.nextId === parentId) return;
        check = check.nextId ? getProgramEntry(check.nextId) : null;
    }

    detachFromParent(childId);

    const parentEntry = getProgramEntry(parentId);
    if (parentEntry) parentEntry.nextId = childId;

    parentEl.dataset.snapNext = childId;

    const r = getBlockPos(parentEl);
    childEl.style.left = `${r.left}px`;
    childEl.style.top  = `${r.top + r.height}px`;

    repositionChain(childEl);
}

function findSnapTarget(draggingEl) {
    const r = getBlockPos(draggingEl);
    const bottomX = r.left + 16;
    const bottomY = r.top + r.height;
    const topX    = r.left + 16;
    const topY    = r.top;

    let best = null;
    let bestDist = SNAP_DISTANCE;
    let bestMode = null;

    workspace.querySelectorAll('.block-active').forEach(el => {
        if (el === draggingEl) return;
        const er = getBlockPos(el);
        const elTopX = er.left + 16;
        const elTopY = er.top;
        const elBotX = er.left + 16;
        const elBotY = er.top + er.height;

        const distBottom = Math.sqrt((bottomX - elTopX) ** 2 + (bottomY - elTopY) ** 2);
        if (distBottom < bestDist) {
            bestDist = distBottom;
            best = el;
            bestMode = 'parent';
        }

        const distTop = Math.sqrt((topX - elBotX) ** 2 + (topY - elBotY) ** 2);
        if (distTop < bestDist) {
            bestDist = distTop;
            best = el;
            bestMode = 'child';
        }
    });

    return best ? { el: best, mode: bestMode } : null;
}

function buildBlockBody(blockEl, blockType, blockId) {
    const entry  = getProgramEntry(blockId);
    const config = BLOCK_CONFIG[blockType];
    if (!config || !entry || config.fields.length === 0) return;

    const body = document.createElement('div');
    body.className = 'block-body';

    config.fields.forEach(({ label, key, placeholder }) => {
        const row = document.createElement('div');
        row.className = 'block-row';
        if (label) {
            const lbl = document.createElement('span');
            lbl.className = 'block-label';
            lbl.textContent = label;
            row.appendChild(lbl);
        }
        const input = document.createElement('input');
        input.className = 'block-input';
        input.placeholder = placeholder;
        input.addEventListener('change', () => { entry.data[key] = input.value.trim(); });
        input.addEventListener('mousedown', e => e.stopPropagation());
        row.appendChild(input);
        body.appendChild(row);
    });

    blockEl.appendChild(body);
}

function createBlock(blockType, x = 50, y = 50) {
    const config = BLOCK_CONFIG[blockType];
    if (!config) return;

    const id = generateId();

    const blockEl = document.createElement('div');
    blockEl.className = `block-active block-active--${config.colorClass}`;
    blockEl.style.left = `${x}px`;
    blockEl.style.top  = `${y}px`;
    blockEl.dataset.type     = blockType;
    blockEl.dataset.id       = id;
    blockEl.dataset.snapNext = '';

    const header = document.createElement('div');
    header.className = 'block-header';

    const label = document.createElement('span');
    label.className = 'block-title';
    label.textContent = config.label;
    header.appendChild(label);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '✕';
    deleteBtn.className = 'delete';
    deleteBtn.addEventListener('click', () => deleteBlock(blockEl, id));
    header.appendChild(deleteBtn);

    blockEl.appendChild(header);
    workspace.appendChild(blockEl);

    addToProgram(id, blockType);
    buildBlockBody(blockEl, blockType, id);
    updateHint();

    return blockEl;
}

function deleteBlock(blockEl, id) {
    const nextId = blockEl.dataset.snapNext;
    detachFromParent(id);
    if (nextId) {
        const nextEl = getBlockEl(nextId);
        if (nextEl) nextEl.dataset.snapNext = '';
    }
    blockEl.remove();
    removeFromProgram(id);
    updateHint();
}

document.querySelectorAll('.block').forEach(block => {
    block.addEventListener('dragstart', e => {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', block.dataset.type);
    });
});

workspace.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    workspace.classList.add('workspace--drag-over');
});

workspace.addEventListener('dragleave', () => {
    workspace.classList.remove('workspace--drag-over');
});

workspace.addEventListener('drop', e => {
    e.preventDefault();
    workspace.classList.remove('workspace--drag-over');
    const blockType = e.dataTransfer.getData('text/plain');
    if (!blockType) return;
    createBlock(blockType, e.offsetX, e.offsetY);
});

workspace.addEventListener('mousedown', e => {
    const blockEl = e.target.closest('.block-active');
    if (!blockEl) return;
    if (e.target.tagName === 'INPUT' || e.target.classList.contains('delete')) return;

    detachFromParent(blockEl.dataset.id);

    const workspaceRect = workspace.getBoundingClientRect();
    const shiftX = e.clientX - blockEl.getBoundingClientRect().left;
    const shiftY = e.clientY - blockEl.getBoundingClientRect().top;
    blockEl.style.zIndex = 1000;

    function onMouseMove(e) {
        blockEl.style.left = `${e.pageX - workspaceRect.left - shiftX}px`;
        blockEl.style.top  = `${e.pageY - workspaceRect.top  - shiftY}px`;
        repositionChain(blockEl);

        workspace.querySelectorAll('.block-active').forEach(el => el.classList.remove('snap-preview'));
        const snap = findSnapTarget(blockEl);
        if (snap) snap.el.classList.add('snap-preview');
    }

    function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        blockEl.style.zIndex = '';
        workspace.querySelectorAll('.block-active').forEach(el => el.classList.remove('snap-preview'));

        const snap = findSnapTarget(blockEl);
        if (snap) {
            if (snap.mode === 'parent') {
                attachBlocks(blockEl, snap.el);
            } else {
                attachBlocks(snap.el, blockEl);
            }
        }
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp, { once: true });
    blockEl.ondragstart = () => false;
});

document.querySelectorAll('.category-title').forEach(btn => {
    btn.addEventListener('click', () => {
        const content = btn.nextElementSibling;
        content.style.display = content.style.display === 'none' ? 'flex' : 'none';
    });
});

function getRootBlocks() {
    const hasParent = new Set(program.map(e => e.nextId).filter(Boolean));
    return program
        .filter(e => !hasParent.has(e.id))
        .sort((a, b) => {
            const elA = getBlockEl(a.id);
            const elB = getBlockEl(b.id);
            return parseInt(elA?.style.top || 0) - parseInt(elB?.style.top || 0);
        });
}

function getChain(startId) {
    const chain = [];
    let current = getProgramEntry(startId);
    while (current) {
        chain.push({ type: current.type, data: current.data });
        current = current.nextId ? getProgramEntry(current.nextId) : null;
    }
    return chain;
}

runButton.addEventListener('click', () => {
    const roots = getRootBlocks();
    const chains = roots.map(r => getChain(r.id));
    outputEl.textContent = JSON.stringify(chains, null, 2);
});