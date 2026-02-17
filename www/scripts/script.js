const blocks = document.querySelectorAll('.block')
const workspace = document.getElementById('workspace');

const blockNames = {
    'variable-create': 'Создать переменную',
    'variable-set': 'Установить значение',
    'loop-for': 'Цикл for',
    'loop-while': 'Цикл while',
    'if-block': 'Если (if)',
    'if-else-block': 'Если-иначе (if-else)',
    'create-function': 'Создать функцию',
    'call-function': 'Вызвать функцию',
    'console-log': 'console.log()',
    'alert': 'alert()'
};

function getBlockName(blockType){
    const blockName = blockNames[blockType];
    return blockName;
}

function createBlock(blockType){
    const newBlock = document.createElement('div');
    newBlock.textContent = getBlockName(blockType);
    newBlock.className = 'block-active';
    newBlock.backgroundColor = '#2196F3';
    workspace.appendChild(newBlock);
    console.log('Блок добавлен:', blockType);
}

blocks.forEach(block => {
    block.addEventListener('dragstart', (e) => {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', block.dataset.type);
        console.log('Перетаскиваешь блок:', block.dataset.type);
    });
});

workspace.addEventListener('dragover', (e) => {
    dragabove(e);
});

workspace.addEventListener('dragleave', () => {
    workspace.style.backgroundColor = '#ffffff';
});

workspace.addEventListener('drop', (e) => {
    dragdrop(e);
});

function dragabove(event){
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    workspace.style.backgroundColor = '#f0f8ff';
}

function dragdrop(event){
    event.preventDefault();
    workspace.style.backgroundColor = '#ffffff';
    const blockType = event.dataTransfer.getData('text/plain');
    createBlock(blockType);
}