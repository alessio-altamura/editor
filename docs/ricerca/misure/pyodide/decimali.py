"""Prototipo: i numeri letterali del codice diventano Decimal("...") con il modulo ast,
e si valuta con il contesto della specifica (34 cifre, arrotondamento al pari,
Emax 6144, Emin -6143). Uso: python3 decimali.py [valori-runtime.json]

Eseguito con il CPython del sistema, non con Pyodide (vedi il rapporto): la logica è la
stessa, perché decimal è la libreria standard e _decimal è compilato anche in Pyodide.
"""
import ast
import decimal
import json
import random
import sys

CONTEXT = decimal.Context(prec=34, rounding=decimal.ROUND_HALF_EVEN, Emax=6144, Emin=-6143,
                          traps=[decimal.InvalidOperation, decimal.DivisionByZero, decimal.Overflow])


class Literals(ast.NodeTransformer):
    """Un numero letterale diventa Decimal con il testo com'è scritto: 1.200 resta 1.200."""

    def __init__(self, source: str):
        self.source = source

    def visit_Constant(self, node: ast.Constant) -> ast.AST:
        if isinstance(node.value, (int, float)) and not isinstance(node.value, bool):
            text = ast.get_source_segment(self.source, node)
            call = ast.Call(func=ast.Name('Decimal', ast.Load()), args=[ast.Constant(text)], keywords=[])
            return ast.copy_location(call, node)
        return node


def evaluate(source: str) -> decimal.Decimal:
    tree = ast.parse(source, mode='eval')
    tree = ast.fix_missing_locations(Literals(source).visit(tree))
    with decimal.localcontext(CONTEXT):
        return eval(compile(tree, '<riga>', 'eval'), {'__builtins__': {}, 'Decimal': decimal.Decimal})


def plain(value: decimal.Decimal) -> str:
    """La forma del value della specifica: senza esponente, senza zeri finali."""
    if value.is_zero():
        return '0'
    return format(value.normalize(CONTEXT), 'f')


def generated(count: int, seed: int) -> list[str]:
    """Espressioni come le righe di calcolo: numeri con decimali, + - * /, parentesi."""
    rng = random.Random(seed)

    def number() -> str:
        whole = str(rng.randint(0, 999999))
        return whole if rng.random() < 0.4 else f'{whole}.{rng.randint(0, 999):0{rng.randint(1, 3)}d}'

    def expression(depth: int) -> str:
        if depth == 0 or rng.random() < 0.3:
            return number()
        left, right = expression(depth - 1), expression(depth - 1)
        op = rng.choice(['+', '-', '*', '/'])
        text = f'{left} {op} {right}'
        return f'({text})' if rng.random() < 0.3 else text

    return [expression(rng.randint(1, 3)) for _ in range(count)]


def main() -> None:
    out: dict = {'python': sys.version, 'checks': [], 'spec': [], 'generated': {}}
    for source, expected in [('0.1 + 0.2', '0.3'), ('3830 / 3', '1276.666666666666666666666666666667'), ('1.200 * 2', '2.400')]:
        got = str(evaluate(source))
        out['checks'].append({'source': source, 'got': got, 'expected': expected, 'ok': got == expected})
    # Fuori intervallo: Overflow, perché la trappola è accesa.
    for source in ['9e6144 * 10', '1e-6143 / 1e10']:
        try:
            out['checks'].append({'source': source, 'got': str(evaluate(source))})
        except decimal.DecimalException as error:
            out['checks'].append({'source': source, 'raised': type(error).__name__})
    # Gli esempi delle righe di calcolo della specifica (§0.4).
    for source, value in [('1.5 + 0.9', '2.4'), ('1.200 * 2', '2.4'), ('10 / 3', '3.333333333333333333333333333333333'),
                          ('1200 + 1350 + 1280', '3830'), ('1 / 0', None)]:
        try:
            got = plain(evaluate(source))
        except decimal.DecimalException as error:
            got = None
            out['spec'].append({'source': source, 'raised': type(error).__name__, 'expected': value, 'ok': value is None})
            continue
        out['spec'].append({'source': source, 'got': got, 'expected': value, 'ok': got == value})
    # 1000 espressioni generate, confrontate con i value del runtime se c'è il file.
    sources = generated(1000, 20261031)
    runtime = json.load(open(sys.argv[1])) if len(sys.argv) > 1 else None
    same = differ = 0
    first: list = []
    for index, source in enumerate(sources):
        try:
            got = plain(evaluate(source))
        except decimal.DecimalException as error:
            got = f'!{type(error).__name__}'
        if runtime is not None:
            want = runtime[index]
            match = (want is None and got.startswith('!')) or want == got
            same += match
            differ += not match
            if not match and len(first) < 10:
                first.append({'source': source, 'python': got, 'runtime': want})
    out['generated'] = {'count': len(sources), 'seed': 20261031, 'same': same, 'differ': differ, 'first_differences': first}
    json.dump(out, sys.stdout, indent=2, ensure_ascii=False)
    print()


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--sources':
        json.dump(generated(1000, 20261031), sys.stdout)
    else:
        main()
