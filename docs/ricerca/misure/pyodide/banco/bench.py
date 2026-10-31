"""Misure dentro Pyodide: decimali, tempi, impronta per il determinismo."""
import decimal, math, json, time, hashlib, io, sys, ast, contextlib
from decimal import Decimal
import decimali

def decimal_checks():
    out = io.StringIO()
    sys.argv = ['decimali.py', '/work/valori-runtime.json']
    with contextlib.redirect_stdout(out):
        decimali.main()
    data = json.loads(out.getvalue())
    return {'checks': data['checks'], 'spec_ok': all(s['ok'] for s in data['spec']), 'generated': data['generated']}

def timings():
    src = '(a * 1.22 - b) / 3'
    res = {}
    t = time.perf_counter()
    for i in range(1000):
        tree = ast.fix_missing_locations(decimali.Literals(src).visit(ast.parse(src, mode='eval')))
        code = compile(tree, '<f>', 'eval')
        with decimal.localcontext(decimali.CONTEXT):
            eval(code, {'__builtins__': {}, 'Decimal': Decimal, 'a': Decimal(i) + Decimal('0.5'), 'b': Decimal(i)})
    res['formula_1000_parse_and_eval_ms'] = (time.perf_counter() - t) * 1000
    tree = ast.fix_missing_locations(decimali.Literals(src).visit(ast.parse(src, mode='eval')))
    code = compile(tree, '<f>', 'eval')
    t = time.perf_counter()
    with decimal.localcontext(decimali.CONTEXT):
        for i in range(1000):
            eval(code, {'__builtins__': {}, 'Decimal': Decimal, 'a': Decimal(i) + Decimal('0.5'), 'b': Decimal(i)})
    res['formula_1000_eval_only_ms'] = (time.perf_counter() - t) * 1000
    vals = [Decimal(f'{i}.{i % 100:02d}') for i in range(100000)]
    t = time.perf_counter()
    with decimal.localcontext(decimali.CONTEXT):
        s = sum(vals, Decimal(0))
    res['sum_100000_ms'] = (time.perf_counter() - t) * 1000
    res['sum_100000'] = str(s)
    return res

def sum_strings(strings):
    t = time.perf_counter()
    with decimal.localcontext(decimali.CONTEXT):
        s = sum((Decimal(x) for x in strings), Decimal(0))
    return {'python_ms': (time.perf_counter() - t) * 1000, 'sum': str(s)}

def fingerprint():
    parts = []
    for src in decimali.generated(1000, 20261031):
        try:
            parts.append(decimali.plain(decimali.evaluate(src)))
        except decimal.DecimalException as e:
            parts.append('!' + type(e).__name__)
    for i in range(1000):
        x = i * 0.37 - 150.0
        parts.append(repr(math.sin(x)))
        parts.append(repr(math.exp(x / 50)))
        parts.append(repr(math.log1p(abs(x))))
        parts.append(repr(math.atan2(x, 7.0)))
    text = '\n'.join(parts)
    return {'sha256': hashlib.sha256(text.encode()).hexdigest(), 'count': len(parts), 'sample': parts[1000:1004]}
