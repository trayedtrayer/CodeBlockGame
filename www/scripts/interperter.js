function tokenize(expr) {
    const tokens = [];
    let i = 0;
    const src = String(expr).trim();

    while (i < src.length) {
        if (/\s/.test(src[i])) { i++; continue; }

        if (src.slice(i, i+3) === 'AND') { tokens.push({ type: 'AND' }); i += 3; continue; }
        if (src.slice(i, i+2) === 'OR')  { tokens.push({ type: 'OR'  }); i += 2; continue; }
        if (src.slice(i, i+3) === 'NOT') { tokens.push({ type: 'NOT' }); i += 3; continue; }

        if (src.slice(i, i+2) === '>=') { tokens.push({ type: 'CMP', op: '>=' }); i += 2; continue; }
        if (src.slice(i, i+2) === '<=') { tokens.push({ type: 'CMP', op: '<=' }); i += 2; continue; }
        if (src.slice(i, i+2) === '!=') { tokens.push({ type: 'CMP', op: '!=' }); i += 2; continue; }
        if (src.slice(i, i+2) === '==') { tokens.push({ type: 'CMP', op: '==' }); i += 2; continue; }
        if (src[i] === '>')             { tokens.push({ type: 'CMP', op: '>'  }); i++; continue; }
        if (src[i] === '<')             { tokens.push({ type: 'CMP', op: '<'  }); i++; continue; }

        if ('+-*/%'.includes(src[i]))   { tokens.push({ type: 'OP', op: src[i] }); i++; continue; }
        if (src[i] === '(')             { tokens.push({ type: 'LPAREN' }); i++; continue; }
        if (src[i] === ')')             { tokens.push({ type: 'RPAREN' }); i++; continue; }
        if (src[i] === '[')             { tokens.push({ type: 'LBRACKET' }); i++; continue; }
        if (src[i] === ']')             { tokens.push({ type: 'RBRACKET' }); i++; continue; }

        if (/\d/.test(src[i])) {
            let num = '';
            while (i < src.length && /\d/.test(src[i])) { num += src[i++]; }
            tokens.push({ type: 'NUM', value: parseInt(num, 10) });
            continue;
        }

        if (src[i] === '"' || src[i] === "'") {
            const quote = src[i++];
            let str = '';
            while (i < src.length && src[i] !== quote) { str += src[i++]; }
            i++;
            tokens.push({ type: 'STR', value: str });
            continue;
        }

        if (/[a-zA-Zа-яА-ЯёЁ_]/.test(src[i])) {
            let name = '';
            while (i < src.length && /[a-zA-Zа-яА-ЯёЁ_0-9]/.test(src[i])) { name += src[i++]; }
            tokens.push({ type: 'ID', name });
            continue;
        }

        i++;
    }

    return tokens;
}

function Parser(tokens) {
    let pos = 0;

    function peek()    { return tokens[pos]; }
    function consume() { return tokens[pos++]; }
    function expect(type) {
        const t = consume();
        if (!t || t.type !== type) throw new Error(`Ожидался ${type}`);
        return t;
    }

    function parseExpr()    { return parseOr(); }

    function parseOr() {
        let left = parseAnd();
        while (peek()?.type === 'OR') {
            consume();
            const right = parseAnd();
            left = { node: 'OR', left, right };
        }
        return left;
    }

    function parseAnd() {
        let left = parseNot();
        while (peek()?.type === 'AND') {
            consume();
            const right = parseNot();
            left = { node: 'AND', left, right };
        }
        return left;
    }

    function parseNot() {
        if (peek()?.type === 'NOT') {
            consume();
            return { node: 'NOT', operand: parseNot() };
        }
        return parseCompare();
    }

    function parseCompare() {
        let left = parseAdd();
        if (peek()?.type === 'CMP') {
            const op = consume().op;
            const right = parseAdd();
            return { node: 'CMP', op, left, right };
        }
        return left;
    }

    function parseAdd() {
        let left = parseMul();
        while (peek()?.type === 'OP' && '+-'.includes(peek().op)) {
            const op = consume().op;
            const right = parseMul();
            left = { node: 'BINOP', op, left, right };
        }
        return left;
    }

    function parseMul() {
        let left = parseUnary();
        while (peek()?.type === 'OP' && '*/%'.includes(peek().op)) {
            const op = consume().op;
            const right = parseUnary();
            left = { node: 'BINOP', op, left, right };
        }
        return left;
    }

    function parseUnary() {
        if (peek()?.type === 'OP' && peek().op === '-') {
            consume();
            return { node: 'NEG', operand: parsePrimary() };
        }
        return parsePrimary();
    }

    function parsePrimary() {
        const t = peek();
        if (!t) throw new Error('Неожиданный конец выражения');

        if (t.type === 'NUM') {
            consume();
            return { node: 'NUM', value: t.value };
        }

        if (t.type === 'LPAREN') {
            consume();
            const inner = parseExpr();
            expect('RPAREN');
            return inner;
        }

        if (t.type === 'STR') {
            consume();
            return { node: 'STR', value: t.value };
        }

        if (t.type === 'ID') {
            consume();
            if (peek()?.type === 'LBRACKET') {
                consume();
                const idx = parseExpr();
                expect('RBRACKET');
                return { node: 'ARRAY_GET', name: t.name, index: idx };
            }
            return { node: 'VAR', name: t.name };
        }

        throw new Error(`Неожиданный токен: ${t.type}`);
    }

    return { parse: parseExpr };
}

function evalNode(node, env) {
    switch (node.node) {
        case 'NUM':       return node.value;
        case 'STR':       return node.value;
        case 'VAR': {
            if (!(node.name in env)) throw new Error(`Переменная "${node.name}" не объявлена`);
            return env[node.name];
        }
        case 'ARRAY_GET': {
            if (!(node.name in env)) throw new Error(`Массив "${node.name}" не объявлен`);
            const arr = env[node.name];
            const idx = evalNode(node.index, env);
            if (!Array.isArray(arr)) throw new Error(`"${node.name}" не является массивом`);
            if (idx < 0 || idx >= arr.length) throw new Error(`Индекс ${idx} выходит за пределы массива "${node.name}"`);
            return arr[idx];
        }
        case 'NEG':    return -evalNode(node.operand, env);
        case 'BINOP': {
            const l = evalNode(node.left, env);
            const r = evalNode(node.right, env);
            switch (node.op) {
                case '+': return l + r;
                case '-': return l - r;
                case '*': return l * r;
                case '/': if (r === 0) throw new Error('Деление на ноль'); return Math.trunc(l / r);
                case '%': if (r === 0) throw new Error('Остаток от деления на ноль'); return l % r;
            }
            break;
        }
        case 'CMP': {
            const l = evalNode(node.left, env);
            const r = evalNode(node.right, env);
            switch (node.op) {
                case '>':  return l > r;
                case '<':  return l < r;
                case '>=': return l >= r;
                case '<=': return l <= r;
                case '==': return l === r;
                case '!=': return l !== r;
            }
            break;
        }
        case 'AND': return evalNode(node.left, env) && evalNode(node.right, env);
        case 'OR':  return evalNode(node.left, env) || evalNode(node.right, env);
        case 'NOT': return !evalNode(node.operand, env);
    }
    throw new Error(`Неизвестный узел: ${node.node}`);
}

function evalExpr(exprStr, env) {
    if (!exprStr || exprStr.trim() === '') return 0;
    const tokens = tokenize(exprStr);
    const parser = Parser(tokens);
    const ast    = parser.parse();
    return evalNode(ast, env);
}

const LOOP_LIMIT = 10000;

function execChain(chain, env, output) {
    for (const block of chain) {
        const result = execBlock(block, env, output);
        if (result === 'break' || result === 'continue' || result === 'return') return result;
    }
}

function execBlock(block, env, output) {
    switch (block.type) {

        case 'var-declare': {
            const names = (block.data.vars || '').split(',').map(s => s.trim()).filter(Boolean);
            for (const name of names) {
                if (!name) continue;
                env[name] = 0;
            }
            break;
        }

        case 'var-assign': {
            const name = block.data.varName;
            if (!name) throw new Error('Не указана переменная в блоке присваивания');
            if (!(name in env)) throw new Error(`Переменная "${name}" не объявлена`);
            env[name] = evalExpr(block.data.expr, env);
            break;
        }

        case 'array-declare': {
            const name = block.data.arrName;
            const size = evalExpr(block.data.size, env);
            if (!name) throw new Error('Не указано имя массива');
            if (size <= 0) throw new Error(`Размер массива должен быть > 0`);
            env[name] = new Array(size).fill(0);
            break;
        }

        case 'array-set': {
            const name  = block.data.arrName;
            const index = evalExpr(block.data.index, env);
            const value = evalExpr(block.data.expr, env);
            if (!name) throw new Error('Не указано имя массива');
            if (!(name in env) || !Array.isArray(env[name])) throw new Error(`"${name}" не является массивом`);
            if (index < 0 || index >= env[name].length) throw new Error(`Индекс ${index} выходит за пределы`);
            env[name][index] = value;
            break;
        }

        case 'if-block': {
            const cond = evalExpr(block.data.condition, env);
            if (cond && block.body?.length) {
                const r = execChain(block.body, env, output);
                if (r) return r;
            }
            break;
        }

        case 'if-else-block': {
            const cond = evalExpr(block.data.condition, env);
            if (cond) {
                if (block.body?.length) {
                    const r = execChain(block.body, env, output);
                    if (r) return r;
                }
            } else {
                if (block.elseBody?.length) {
                    const r = execChain(block.elseBody, env, output);
                    if (r) return r;
                }
            }
            break;
        }

        case 'while-block': {
            let iterations = 0;
            while (true) {
                if (++iterations > LOOP_LIMIT) throw new Error('Превышен лимит итераций цикла (10000)');
                const cond = evalExpr(block.data.condition, env);
                if (!cond) break;
                if (block.body?.length) {
                    const r = execChain(block.body, env, output);
                    if (r === 'break') break;
                    if (r === 'continue') continue;
                    if (r) return r;
                }
            }
            break;
        }

        case 'for-block': {
            const varName = block.data.varName || 'i';
            const from    = evalExpr(block.data.from || '0', env);
            const to      = evalExpr(block.data.to   || '0', env);
            const step    = evalExpr(block.data.step || '1', env);
            if (step === 0) throw new Error('Шаг цикла не может быть 0');

            env[varName] = from;
            let iterations = 0;

            const condition = step > 0
                ? () => env[varName] < to
                : () => env[varName] > to;

            while (condition()) {
                if (++iterations > LOOP_LIMIT) throw new Error('Превышен лимит итераций цикла (10000)');
                if (block.body?.length) {
                    const r = execChain(block.body, env, output);
                    if (r === 'break') break;
                    if (r === 'continue') { env[varName] += step; continue; }
                    if (r) return r;
                }
                env[varName] += step;
            }
            break;
        }

        case 'print': {
            let val;
            try {
                val = evalExpr(block.data.expr, env);
            } catch(e) {
                val = block.data.expr;
            }
            const display = Array.isArray(val) ? `[${val.join(', ')}]` : String(val);
            output.push(display);
            break;
        }

        case 'break':    return 'break';
        case 'continue': return 'continue';

        default:
            throw new Error(`Неизвестный блок: ${block.type}`);
    }
}

function runProgram(chains, outputEl) {
    outputEl.textContent = '';
    const output = [];
    const env = {};

    try {
        for (const chain of chains) {
            execChain(chain, env, output);
        }
        if (output.length === 0) {
            outputEl.textContent = '(нет вывода)';
        } else {
            outputEl.textContent = output.join('\n');
        }
        outputEl.style.color = '#8b949e';
    } catch (err) {
        outputEl.textContent = 'Ошибка: ' + err.message;
        outputEl.style.color = '#f85149';
    }
}