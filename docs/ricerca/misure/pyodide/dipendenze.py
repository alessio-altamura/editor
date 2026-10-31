"""Le dipendenze di un insieme di formule, lette con ast senza eseguire nulla.

Codice ristretto: ogni formula è un'espressione con numeri, nomi, + - * / ** e
parentesi, e chiamate a funzioni note. Tutto il resto (attributi, indici,
lambda, comprensioni, import) è rifiutato. Il risultato: per ogni formula i nomi
che usa, i nomi che mancano e i cicli. Uso: python3 dipendenze.py
"""
import ast
import json

KNOWN_FUNCTIONS = {'somma', 'media', 'minimo', 'massimo', 'arrotonda'}
ALLOWED = (ast.Expression, ast.BinOp, ast.UnaryOp, ast.Name, ast.Constant, ast.Call, ast.Load,
           ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow, ast.USub, ast.UAdd)


def names_of(source: str) -> set[str]:
    tree = ast.parse(source, mode='eval')
    used: set[str] = set()
    for node in ast.walk(tree):
        if not isinstance(node, ALLOWED):
            raise ValueError(f'fuori dal codice ristretto: {type(node).__name__}')
        if isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name) or node.func.id not in KNOWN_FUNCTIONS or node.keywords:
                raise ValueError('chiamata a una funzione non nota')
        elif isinstance(node, ast.Name) and node.id not in KNOWN_FUNCTIONS:
            used.add(node.id)
    return used


def analyse(formulas: dict[str, str], data: set[str]) -> dict:
    """data: i nomi che vengono dai dati (i field di una collection), non da formule."""
    deps = {name: sorted(names_of(code)) for name, code in formulas.items()}
    missing = {name: [d for d in used if d not in formulas and d not in data] for name, used in deps.items()}
    cycles: list[list[str]] = []
    state: dict[str, int] = {}
    stack: list[str] = []

    def visit(name: str) -> None:
        state[name] = 1
        stack.append(name)
        for dep in deps.get(name, []):
            if dep not in formulas:
                continue
            if state.get(dep) == 1:
                cycles.append(stack[stack.index(dep):] + [dep])
            elif dep not in state:
                visit(dep)
        stack.pop()
        state[name] = 2

    for name in formulas:
        if name not in state:
            visit(name)
    order = [] if cycles else topological(deps, formulas)
    return {'deps': deps, 'missing': {k: v for k, v in missing.items() if v}, 'cycles': cycles, 'order': order}


def topological(deps: dict[str, list[str]], formulas: dict[str, str]) -> list[str]:
    done: list[str] = []
    seen: set[str] = set()

    def go(name: str) -> None:
        if name in seen:
            return
        seen.add(name)
        for dep in deps[name]:
            if dep in formulas:
                go(dep)
        done.append(name)

    for name in formulas:
        go(name)
    return done


examples = {
    'senza problemi': ({'totale': 'somma(euro)', 'iva': 'totale * 0.22', 'lordo': 'totale + iva'}, {'euro'}),
    'un nome mancante': ({'totale': 'somma(euro)', 'netto': 'totale - sconto'}, {'euro'}),
    'un ciclo fra nomi': ({'a': 'b + 1', 'b': 'c * 2', 'c': 'a / 3', 'd': 'somma(euro)'}, {'euro'}),
}
result = {label: analyse(formulas, data) for label, (formulas, data) in examples.items()}
for source in ['__import__("os")', 'x.y', 'open("f")', '[i for i in range(3)]']:
    try:
        names_of(source)
        result.setdefault('rifiutati', {})[source] = 'accettato'
    except (ValueError, SyntaxError) as error:
        result.setdefault('rifiutati', {})[source] = str(error)
print(json.dumps(result, indent=2, ensure_ascii=False))
