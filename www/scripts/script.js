const blocks = document.querySelectorAll('.block')
const workspace = document.getElementById('workspace');
let program = [];
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

function createBlock(blockType, x = 50, y = 50){
    
    const placeholder = workspace.querySelector('p');
    if (placeholder) placeholder.style.display = 'none';

    const newBlock = document.createElement('div');
    newBlock.textContent = getBlockName(blockType);
    newBlock.className = 'block-active';
    newBlock.style.left = x + 'px';
    newBlock.style.top = y + 'px';
    newBlock.dataset.type = blockType;

    
    const newButton = document.createElement('button');
    newButton.textContent = "X";
    newButton.className = 'delete';
    addClickDel(newButton);

    newBlock.appendChild(newButton);
    workspace.appendChild(newBlock);

    
    program.push({
        type: blockType,
        data: {names: []}
    });
    
    
    if(blockType === 'variable-create'){

        const input = document.createElement('input');
        input.placeholder = "Введите 1 или несколько переменных через запятую";
        newBlock.appendChild(input);

        command.data.names = [];

        input.addEventListener('change', () => {
            const names = input.value
                .split(',')
                .map(n => n.trim())
                .filter(n => n.length > 0);

            command.data.names = names;
        });
    }
    
    makeDraggable(newBlock);
    
    console.log('Блок добавлен:', blockType);

    return newBlock;
}

function addClickDel(del){
    del.addEventListener('click', function() {
        const deleteObj = this.closest('.block-active');
        deleteObj.remove();
    })
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
    const x = event.offsetX;
    const y = event.offsetY;    
    createBlock(blockType, x, y);
}
 workspace.addEventListener('mousedown', function(e){
    const block = e.target.closest('.block-active');
    if(!block) return;

    const shiftX = e.clientX - block.getBoundingClientRect().left;
    const shiftY = e.clientY - block.getBoundingClientRect().top;

    function moveAt(pageX, pageY){
        block.style.left = pageX - workspace.getBoundingClientRect().left - shiftX + 'px';
        block.style.top = pageY - workspace.getBoundingClientRect().top - shiftY + 'px';
    }

    function onMouseMove(e){
        moveAt(e.pageX, e.pageY); 
    }

    document.addEventListener('mousemove', onMouseMove);

    document.addEventListener('mouseup', function(){
        document.removeEventListener('mousemove', onMouseMove);
    }, {once: true});

    
    block.ondragstart = () => false;
});




