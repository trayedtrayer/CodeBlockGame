const BLOCK_CONFIG = {
    'var-declare': {
        label: 'int x, y, ...',
        colorClass: 'var',
        fields: [{ label: 'int', key: 'vars', placeholder: 'x, y, z' }]
    },
    'var-assign': {
        label: 'x = выражение',
        colorClass: 'var',
        fields: [
            { label: '',  key: 'varName', placeholder: 'переменная' },
            { label: '=', key: 'expr',    placeholder: 'выражение' }
        ]
    },
    'array-declare': {
        label: 'int arr[n]',
        colorClass: 'var',
        fields: [
            { label: 'int', key: 'arrName', placeholder: 'имя' },
            { label: '[',   key: 'size',    placeholder: 'размер' }
        ]
    },
    'array-set': {
        label: 'arr[i] = выражение',
        colorClass: 'var',
        fields: [
            { label: '',  key: 'arrName', placeholder: 'массив' },
            { label: '[', key: 'index',   placeholder: 'индекс' },
            { label: '=', key: 'expr',    placeholder: 'выражение' }
        ]
    },
    'if-block': {
        label: 'если (if)',
        colorClass: 'if',
        hasBody: true,
        fields: [{ label: 'если', key: 'condition', placeholder: 'условие' }]
    },
    'if-else-block': {
        label: 'если-иначе (if-else)',
        colorClass: 'if',
        hasBody: true,
        hasThenElse: true,
        fields: [{ label: 'если', key: 'condition', placeholder: 'условие' }]
    },
    'while-block': {
        label: 'while (пока)',
        colorClass: 'loop',
        hasBody: true,
        fields: [{ label: 'пока', key: 'condition', placeholder: 'условие' }]
    },
    'for-block': {
        label: 'for ( ; ; )',
        colorClass: 'loop',
        hasBody: true,
        fields: [
            { label: 'int', key: 'varName', placeholder: 'i' },
            { label: '=',   key: 'from',    placeholder: '0' },
            { label: 'до',  key: 'to',      placeholder: '10' },
            { label: 'шаг', key: 'step',    placeholder: '1' }
        ]
    },
    'print': {
        label: 'print( )',
        colorClass: 'output',
        fields: [{ label: 'print', key: 'expr', placeholder: 'выражение или переменная' }]
    },
    'break':    { label: 'break',    colorClass: 'flow', fields: [] },
    'continue': { label: 'continue', colorClass: 'flow', fields: [] }
};

const SNAP_DISTANCE = 28;
const program = [];
let blockCounter = 0;

const workspace = document.getElementById('workspace');
const hint      = workspace.querySelector('.workspace-hint');
const runButton = document.getElementById('run-button');
const outputEl  = document.getElementById('output-content');

function generateId() { return `block-${++blockCounter}`; }

function updateHint() {
    hint.style.display = workspace.querySelector(':scope > .block-active') ? 'none' : 'block';
}

function addToProgram(id, type) {
    program.push({ id, type, data: {}, nextId: null, bodyId: null, elseBodyId: null });
}

function removeFromProgram(id) {
    program.forEach(e => {
        if (e.nextId === id)     e.nextId = null;
        if (e.bodyId === id)     e.bodyId = null;
        if (e.elseBodyId === id) e.elseBodyId = null;
    });
    const idx = program.findIndex(e => e.id === id);
    if (idx !== -1) program.splice(idx, 1);
}

function getProgramEntry(id)  { return program.find(e => e.id === id); }
function getBlockEl(id)       { return workspace.querySelector(`[data-id="${id}"]`); }

function getAbsoluteRect(el) {
    const wr = workspace.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    return {
        left:   er.left - wr.left,
        top:    er.top  - wr.top,
        width:  er.width,
        height: er.height
    };
}

function isInZone(el) {
    return el.parentElement?.classList.contains('block-zone');
}

function getZoneOf(el) {
    return isInZone(el) ? el.parentElement : null;
}

function detachFromParent(id) {
    program.forEach(e => {
        if (e.nextId === id)     e.nextId = null;
        if (e.bodyId === id)     e.bodyId = null;
        if (e.elseBodyId === id) e.elseBodyId = null;
    });
    workspace.querySelectorAll(`.block-active[data-snap-next="${id}"]`).forEach(el => {
        el.dataset.snapNext = '';
    });
    workspace.querySelectorAll('.block-zone').forEach(zone => {
        if (zone.dataset.firstBlockId === id) {
            zone.dataset.firstBlockId = '';
        }
        updateZoneAppearance(zone);
    });
}

function updateZoneAppearance(zone) {
    const hasBlocks = zone.querySelector('.block-active');
    if (hasBlocks) {
        zone.classList.add('has-blocks');
        const placeholder = zone.querySelector('.zone-placeholder');
        if (placeholder) placeholder.style.display = 'none';
    } else {
        zone.classList.remove('has-blocks');
        const placeholder = zone.querySelector('.zone-placeholder');
        if (placeholder) placeholder.style.display = '';
    }
}

function repositionOuterChain(blockEl) {
    let el = blockEl;
    while (el) {
        const id = el.dataset.id;
        let parentFound = null;
        for (const entry of program) {
            if (entry.nextId === id) {
                parentFound = getBlockEl(entry.id);
                break;
            }
        }
        if (!parentFound) break;
        el = parentFound;
    }
    snapChainBelow(el);
}

function snapChainBelow(startEl) {
    let current = startEl;
    while (current) {
        const nextId = current.dataset.snapNext;
        if (!nextId) break;
        const nextEl = getBlockEl(nextId);
        if (!nextEl) break;

        if (!isInZone(nextEl)) {
            const cr = getAbsoluteRect(current);
            nextEl.style.left = `${cr.left}px`;
            nextEl.style.top  = `${cr.top + cr.height}px`;
        }
        current = nextEl;
    }
}

function attachToZone(zone, blockEl) {
    const parentId    = zone.dataset.parentId;
    const zoneType    = zone.dataset.zoneType;
    const blockId     = blockEl.dataset.id;
    const parentEntry = getProgramEntry(parentId);
    if (!parentEntry) return;

    detachFromParent(blockId);

    if (isInZone(blockEl)) blockEl.parentElement.removeChild(blockEl);
    else workspace.removeChild(blockEl);

    blockEl.style.left = '';
    blockEl.style.top  = '';
    blockEl.style.zIndex = '';

    const existingFirstId = zone.dataset.firstBlockId;

    if (!existingFirstId) {
        zone.dataset.firstBlockId = blockId;
        if (zoneType === 'else') parentEntry.elseBodyId = blockId;
        else                     parentEntry.bodyId     = blockId;
    } else {
        let lastId    = existingFirstId;
        let lastEntry = getProgramEntry(lastId);
        while (lastEntry?.nextId) {
            lastId    = lastEntry.nextId;
            lastEntry = getProgramEntry(lastId);
        }
        if (lastEntry) lastEntry.nextId = blockId;
        const lastEl = getBlockEl(lastId);
        if (lastEl)   lastEl.dataset.snapNext = blockId;
    }

    zone.appendChild(blockEl);
    updateZoneAppearance(zone);
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

    const sameZone = isInZone(parentEl) && isInZone(childEl) &&
                     parentEl.parentElement === childEl.parentElement;

    detachFromParent(childId);

    const parentEntry = getProgramEntry(parentId);
    if (parentEntry) parentEntry.nextId = childId;
    parentEl.dataset.snapNext = childId;

    if (isInZone(parentEl)) {
        const zone = parentEl.parentElement;
        if (isInZone(childEl) && !sameZone) childEl.parentElement.removeChild(childEl);
        else if (!isInZone(childEl))        workspace.removeChild(childEl);

        childEl.style.left = '';
        childEl.style.top  = '';

        const allInZone = Array.from(zone.querySelectorAll(':scope > .block-active'));
        const parentIdx = allInZone.indexOf(parentEl);
        const afterEl   = allInZone[parentIdx + 1] || null;
        zone.insertBefore(childEl, afterEl);
        updateZoneAppearance(zone);
    } else {
        if (isInZone(childEl)) {
            const oldZone = childEl.parentElement;
            oldZone.removeChild(childEl);
            updateZoneAppearance(oldZone);
            workspace.appendChild(childEl);
        }
        const pr = getAbsoluteRect(parentEl);
        childEl.style.left = `${pr.left}px`;
        childEl.style.top  = `${pr.top + pr.height}px`;
        childEl.style.zIndex = '';
        snapChainBelow(childEl);
    }
}

function findSnapTarget(draggingEl) {
    const dr = draggingEl.getBoundingClientRect();
    const dragBottomX = dr.left + 16;
    const dragBottomY = dr.bottom;
    const dragTopX    = dr.left + 16;
    const dragTopY    = dr.top;

    let best = null, bestDist = SNAP_DISTANCE, bestMode = null;

    workspace.querySelectorAll('.block-active').forEach(el => {
        if (el === draggingEl) return;
        if (draggingEl.contains(el) || el.contains(draggingEl)) return;

        const er = el.getBoundingClientRect();
        const elTopX  = er.left + 16;
        const elBotX  = er.left + 16;

        const dBottom = Math.hypot(dragBottomX - elTopX, dragBottomY - er.top);
        if (dBottom < bestDist) { bestDist = dBottom; best = el; bestMode = 'parent'; }

        const dTop = Math.hypot(dragTopX - elBotX, dragTopY - er.bottom);
        if (dTop < bestDist)    { bestDist = dTop;    best = el; bestMode = 'child';  }
    });

    return best ? { el: best, mode: bestMode } : null;
}

function findZoneTarget(draggingEl) {
    const dr = draggingEl.getBoundingClientRect();
    const cx = dr.left + dr.width  / 2;
    const cy = dr.top  + dr.height / 2;

    let bestZone = null, bestArea = Infinity;

    workspace.querySelectorAll('.block-zone').forEach(zone => {
        if (zone.closest('[data-id]') === draggingEl) return;

        const parentBlockEl = zone.closest('.block-active');
        if (parentBlockEl && draggingEl.contains(parentBlockEl)) return;

        const zr = zone.getBoundingClientRect();
        if (cx > zr.left && cx < zr.right && cy > zr.top && cy < zr.bottom) {
            const area = zr.width * zr.height;
            if (area < bestArea) { bestArea = area; bestZone = zone; }
        }
    });

    return bestZone;
}

function buildBlockUI(blockEl, blockType, blockId) {
    const entry  = getProgramEntry(blockId);
    const config = BLOCK_CONFIG[blockType];
    if (!config || !entry) return;

    if (config.fields.length > 0) {
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

    if (config.hasBody) {
        const makeZone = (zoneType, labelText) => {
            const lbl = document.createElement('div');
            lbl.className = 'body-label';
            lbl.textContent = labelText;
            blockEl.appendChild(lbl);

            const zone = document.createElement('div');
            zone.className = 'block-zone';
            zone.dataset.zoneType     = zoneType;
            zone.dataset.parentId     = blockId;
            zone.dataset.firstBlockId = '';

            const ph = document.createElement('span');
            ph.className = 'zone-placeholder';
            ph.textContent = 'перетащи блоки сюда';
            zone.appendChild(ph);

            blockEl.appendChild(zone);
            return zone;
        };

        if (config.hasThenElse) {
            makeZone('then', 'тогда:');
            makeZone('else', 'иначе:');
        } else {
            makeZone('body', 'тело:');
        }
    }
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
    buildBlockUI(blockEl, blockType, id);
    updateHint();
    return blockEl;
}

function deleteBlock(blockEl, id) {
    detachFromParent(id);
    if (isInZone(blockEl)) {
        const zone = blockEl.parentElement;
        blockEl.remove();
        updateZoneAppearance(zone);
    } else {
        blockEl.remove();
    }
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
    const wr = workspace.getBoundingClientRect();
    createBlock(blockType, e.clientX - wr.left + workspace.scrollLeft, e.clientY - wr.top + workspace.scrollTop);
});

workspace.addEventListener('mousedown', e => {
    const blockEl = e.target.closest('.block-active');
    if (!blockEl) return;
    if (e.target.tagName === 'INPUT' || e.target.classList.contains('delete')) return;

    const wasInZone = isInZone(blockEl);
    const oldZone   = wasInZone ? blockEl.parentElement : null;

    detachFromParent(blockEl.dataset.id);

    const wr = workspace.getBoundingClientRect();
    const br = blockEl.getBoundingClientRect();

    if (wasInZone) {
        blockEl.style.left = `${br.left - wr.left + workspace.scrollLeft}px`;
        blockEl.style.top  = `${br.top  - wr.top  + workspace.scrollTop}px`;
        workspace.appendChild(blockEl);
        if (oldZone) updateZoneAppearance(oldZone);
    }

    const shiftX = e.clientX - br.left;
    const shiftY = e.clientY - br.top;
    blockEl.style.zIndex = 1000;

    function onMouseMove(ev) {
        blockEl.style.left = `${ev.clientX - wr.left - shiftX + workspace.scrollLeft}px`;
        blockEl.style.top  = `${ev.clientY - wr.top  - shiftY + workspace.scrollTop}px`;
        snapChainBelow(blockEl);

        workspace.querySelectorAll('.block-active').forEach(el => el.classList.remove('snap-preview'));
        workspace.querySelectorAll('.block-zone').forEach(z => z.classList.remove('drag-over'));

        const zone = findZoneTarget(blockEl);
        if (zone) {
            zone.classList.add('drag-over');
        } else {
            const snap = findSnapTarget(blockEl);
            if (snap) snap.el.classList.add('snap-preview');
        }
    }

    function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        blockEl.style.zIndex = '';
        workspace.querySelectorAll('.block-active').forEach(el => el.classList.remove('snap-preview'));
        workspace.querySelectorAll('.block-zone').forEach(z => z.classList.remove('drag-over'));

        const zone = findZoneTarget(blockEl);
        if (zone) {
            attachToZone(zone, blockEl);
        } else {
            const snap = findSnapTarget(blockEl);
            if (snap) {
                if (snap.mode === 'parent') attachBlocks(blockEl, snap.el);
                else                        attachBlocks(snap.el, blockEl);
            }
        }
        updateHint();
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

function getChain(startId) {
    const chain = [];
    let current = getProgramEntry(startId);
    while (current) {
        const node = { type: current.type, data: current.data };
        if (current.bodyId)     node.body     = getChain(current.bodyId);
        if (current.elseBodyId) node.elseBody = getChain(current.elseBodyId);
        chain.push(node);
        current = current.nextId ? getProgramEntry(current.nextId) : null;
    }
    return chain;
}

function getRootBlocks() {
    const nested = new Set();
    program.forEach(e => {
        if (e.nextId)     nested.add(e.nextId);
        if (e.bodyId)     nested.add(e.bodyId);
        if (e.elseBodyId) nested.add(e.elseBodyId);
    });
    return program
        .filter(e => !nested.has(e.id))
        .sort((a, b) => {
            const ta = parseInt(getBlockEl(a.id)?.style.top  || 0);
            const tb = parseInt(getBlockEl(b.id)?.style.top  || 0);
            return ta - tb;
        });
}

runButton.addEventListener('click', () => {
    const roots  = getRootBlocks();
    const chains = roots.map(r => getChain(r.id));
    runProgram(chains, outputEl);
});