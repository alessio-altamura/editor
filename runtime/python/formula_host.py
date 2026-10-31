"""The Python side of the formulas (class 4), loaded into Pyodide inside the worker.

`run_job` takes a job as JSON and gives its result as JSON. A job is a formula value,
a computed field (the formula once per record) or a math line with names. Before
running, the code is read with `ast`: it may use only the names it declares, the
allowed builtins and the functions of the formula builder, and import only the
allowed modules. Number literals become decimals, with the context of the math lines.

This file is not a boundary: the worker it runs in is (a Chromium worker with a CSP
without eval, `jsglobals` empty, the network functions removed). The checks here keep
the code deterministic and its dependencies declared.
"""
import ast
import builtins
import datetime
import decimal
import json
import operator
from decimal import Decimal

# 34 digits, half-even, the exponent range of decimal128, as the math lines (§0.4).
CONTEXT = decimal.Context(prec=34, rounding=decimal.ROUND_HALF_EVEN, Emax=6144, Emin=-6143,
                          traps=[decimal.InvalidOperation, decimal.DivisionByZero, decimal.Overflow])
decimal.setcontext(CONTEXT)

# The standard library a formula may import: computation, text, dates. No files, no
# processes, no network, nothing that reads the clock or chance.
ALLOWED_MODULES = frozenset([
    'bisect', 'calendar', 'collections', 'datetime', 'decimal', 'fractions', 'functools',
    'heapq', 'itertools', 'json', 'math', 'operator', 're', 'statistics', 'string',
    'textwrap', 'unicodedata',
])

ALLOWED_BUILTINS = [
    'abs', 'all', 'any', 'bool', 'dict', 'divmod', 'enumerate', 'filter', 'float', 'frozenset',
    'int', 'isinstance', 'len', 'list', 'map', 'max', 'min', 'next', 'pow', 'range', 'reversed',
    'round', 'set', 'sorted', 'str', 'sum', 'tuple', 'zip',
    'ArithmeticError', 'Exception', 'IndexError', 'KeyError', 'TypeError', 'ValueError',
    'ZeroDivisionError',
]

# How many rounds a formula with recursion "infinite" may take before it stops (§0.17).
RECURSION_SAFETY = 1000


def restricted_import(name, globals=None, locals=None, fromlist=(), level=0):
    if level != 0 or name.split('.')[0] not in ALLOWED_MODULES:
        raise ImportError(f'il modulo {name} non è ammesso')
    return builtins.__import__(name, globals, locals, fromlist, level)


SAFE_BUILTINS = {name: getattr(builtins, name) for name in ALLOWED_BUILTINS}
SAFE_BUILTINS['__import__'] = restricted_import
SAFE_BUILTINS.update({'True': True, 'False': False, 'None': None})


class Integer(Decimal):
    """An integer literal: a decimal that can also index a sequence, as `x[0]`."""

    def __index__(self):
        return int(self)


# In the messages it is a decimal like the others.
Integer.__name__ = Integer.__qualname__ = 'Decimal'


# ---- Values from the runtime and back --------------------------------------------------

def to_python(value):
    kind = value['type']
    if kind == 'missing':
        return None
    if kind == 'number':
        return Decimal(value['value'])
    if kind in ('string', 'boolean', 'yearmonth'):
        return value['value']
    if kind == 'date':
        return datetime.date.fromisoformat(value['value'])
    if kind == 'datetime':
        return datetime.datetime.fromisoformat(value['value'])
    if kind == 'time':
        return datetime.time.fromisoformat(value['value'])
    if kind == 'year':
        return int(value['value'])
    raise TypeError(f'tipo sconosciuto {kind}')


class FormulaTypeError(TypeError):
    pass


def from_python(value):
    if value is None:
        return {'type': 'missing'}
    if isinstance(value, bool):
        return {'type': 'boolean', 'value': value}
    if isinstance(value, (Decimal, int, float)):
        if isinstance(value, float):
            if value != value or value in (float('inf'), float('-inf')):
                raise FormulaTypeError('il valore non è un numero finito')
            value = Decimal(repr(value))
        number = CONTEXT.plus(Decimal(value))
        if not number.is_finite():
            raise FormulaTypeError('il valore non è un numero finito')
        return {'type': 'number', 'value': str(number)}
    if isinstance(value, str):
        return {'type': 'string', 'value': value}
    if isinstance(value, datetime.datetime):
        return {'type': 'datetime', 'value': value.isoformat()}
    if isinstance(value, datetime.date):
        return {'type': 'date', 'value': value.isoformat()}
    if isinstance(value, datetime.time):
        return {'type': 'time', 'value': value.isoformat()}
    if isinstance(value, Column):
        raise FormulaTypeError('il valore è una colonna: riducila con total, mean, minimum, maximum o count')
    if isinstance(value, Collection):
        raise FormulaTypeError('il valore è una collection: scegli un field e riducilo')
    raise FormulaTypeError(f'il valore è di tipo {type(value).__name__}: dai un numero, un testo, un booleano o una data')


def fits(field_type, value):
    """Whether a value of a computed field has the type its schema declares."""
    if value is None:
        return True
    if field_type in ('number', 'integer'):
        if isinstance(value, bool) or not isinstance(value, (Decimal, int, float)):
            return False
        return field_type == 'number' or Decimal(value) == Decimal(value).to_integral_value()
    if field_type == 'boolean':
        return isinstance(value, bool)
    if field_type == 'date':
        return isinstance(value, datetime.date) and not isinstance(value, datetime.datetime)
    if field_type == 'datetime':
        return isinstance(value, datetime.datetime)
    if field_type == 'time':
        return isinstance(value, datetime.time)
    if field_type == 'year':
        return isinstance(value, int) and not isinstance(value, bool)
    return isinstance(value, str)


# ---- The values a formula sees -----------------------------------------------------------

def _elementwise(function):
    def apply(self, other):
        if isinstance(other, Column):
            if len(other) != len(self):
                raise ValueError(f'le colonne hanno {len(self)} e {len(other)} valori')
            return Column(None if a is None or b is None else function(a, b) for a, b in zip(self, other))
        return Column(None if a is None or other is None else function(a, other) for a in self)
    return apply


def _swap(function):
    return lambda a, b: function(b, a)


class Column(tuple):
    """The values of a field, in the order of the records; a missing value is None.
    The four operations work value by value, with a number or with a column as long."""
    __add__ = _elementwise(operator.add)
    __radd__ = _elementwise(_swap(operator.add))
    __sub__ = _elementwise(operator.sub)
    __rsub__ = _elementwise(_swap(operator.sub))
    __mul__ = _elementwise(operator.mul)
    __rmul__ = _elementwise(_swap(operator.mul))
    __truediv__ = _elementwise(operator.truediv)
    __rtruediv__ = _elementwise(_swap(operator.truediv))

    def __neg__(self):
        return Column(None if a is None else -a for a in self)


class Record:
    """A record: its fields by name, with the hyphen as underscore."""
    __slots__ = ('_values',)

    def __init__(self, values):
        object.__setattr__(self, '_values', values)

    def __getattr__(self, name):
        try:
            return self._values[name]
        except KeyError:
            raise AttributeError(f'il record non ha il field {name}') from None

    def __getitem__(self, name):
        return self._values[name.replace('-', '_')]

    def __repr__(self):
        return f'Record({self._values!r})'


class Collection:
    """A collection: its records, a column for each field (`vendite_mesi.euro`), a range."""

    def __init__(self, label, fields, rows):
        self._label = label
        self._fields = fields
        self._rows = rows

    def _field(self, name):
        name = name.replace('-', '_')
        for index, field in enumerate(self._fields):
            if field['py'] == name:
                return index, field
        raise AttributeError(f'{self._label} non ha il field {name}')

    def __getattr__(self, name):
        if name.startswith('_'):
            raise AttributeError(name)
        index, _ = self._field(name)
        return Column(row[index] for row in self._rows)

    def __getitem__(self, name):
        index, _ = self._field(name)
        return Column(row[index] for row in self._rows)

    def __len__(self):
        return len(self._rows)

    def __iter__(self):
        return iter(self.records)

    @property
    def records(self):
        return tuple(Record({field['py']: row[i] for i, field in enumerate(self._fields)}) for row in self._rows)

    def range(self, field, start, end):
        """The records from the one whose `field` is `start` to the one where it is `end`:
        in the order of its categories when it has them, else in the order of the file."""
        index, spec = self._field(field)
        start, end = self._as(spec, start), self._as(spec, end)
        values = [row[index] for row in self._rows]
        categories = spec.get('categories')
        if categories:
            order = [self._as(spec, category) for category in categories]
            for bound in (start, end):
                if bound not in order:
                    raise ValueError(f'{bound} non è fra le categorie di {spec["name"]}')
            low, high = order.index(start), order.index(end)
            rows = [row for row, value in zip(self._rows, values) if value in order and low <= order.index(value) <= high]
        else:
            for bound in (start, end):
                if bound not in values:
                    raise ValueError(f'{bound} non è fra i valori di {spec["name"]}')
            first = values.index(start)
            last = len(values) - 1 - values[::-1].index(end)
            if first > last:
                raise ValueError(f'{start} viene dopo {end} in {spec["name"]}')
            rows = self._rows[first:last + 1]
        return Collection(self._label, self._fields, rows)

    @staticmethod
    def _as(spec, value):
        """A bound as a value of the field: '2026-03-01' for a date, 3 for a number."""
        kind = spec['type']
        if kind in ('number', 'integer') and not isinstance(value, Decimal):
            return Decimal(str(value))
        if kind in ('date', 'datetime', 'time') and isinstance(value, str):
            return to_python({'type': kind, 'value': value})
        if kind == 'year' and not isinstance(value, int):
            return int(value)
        return value

    def __repr__(self):
        return f'Collection({self._label}, {len(self._rows)} record)'


# ---- The functions of the formula builder ------------------------------------------------

def _present(arguments):
    items = arguments[0] if len(arguments) == 1 and isinstance(arguments[0], (list, tuple)) else arguments
    return [item for item in items if item is not None]


def total(*values):
    """The sum of the values, without the missing ones; 0 with none."""
    result = Decimal(0)
    for value in _present(values):
        result += value
    return result


def mean(*values):
    """The mean in decimals, without the missing values: total / count."""
    present = _present(values)
    if not present:
        raise ValueError('mean di nessun valore')
    return total(present) / Decimal(len(present))


def minimum(*values):
    present = _present(values)
    if not present:
        raise ValueError('minimum di nessun valore')
    return min(present)


def maximum(*values):
    present = _present(values)
    if not present:
        raise ValueError('maximum di nessun valore')
    return max(present)


def count(*values):
    """How many values are not missing."""
    return Decimal(len(_present(values)))


BUILDER = {'total': total, 'mean': mean, 'minimum': minimum, 'maximum': maximum, 'count': count}


# ---- Reading the code --------------------------------------------------------------------

class Problem(Exception):
    def __init__(self, code, message, position=None, target=None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.position = position
        self.target = target


class Positions:
    """Line and column of a node in UTF-16 units, as the runtime counts them (LSP)."""

    def __init__(self, source):
        self.lines = source.split('\n')

    def utf16(self, line, byte_offset):
        text = self.lines[line - 1] if 0 < line <= len(self.lines) else ''
        prefix = text.encode('utf-8')[:byte_offset].decode('utf-8', errors='ignore')
        return len(prefix.encode('utf-16-le')) // 2

    def of(self, line, col, end_line, end_col):
        if line is None:
            return None
        end_line = end_line or line
        return {'line': line, 'column': self.utf16(line, col or 0),
                'endLine': end_line, 'endColumn': self.utf16(end_line, end_col if end_col is not None else col or 0)}

    def node(self, node):
        return self.of(node.lineno, node.col_offset, getattr(node, 'end_lineno', None), getattr(node, 'end_col_offset', None))


def bound_names(tree):
    """The names the code binds itself: assignments, loops, functions, imports."""
    names = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Name) and isinstance(node.ctx, (ast.Store, ast.Del)):
            names.add(node.id)
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            names.add(node.name)
        elif isinstance(node, ast.arg):
            names.add(node.arg)
        elif isinstance(node, (ast.Import, ast.ImportFrom)):
            for alias in node.names:
                names.add(alias.asname or alias.name.split('.')[0])
        elif isinstance(node, ast.ExceptHandler) and node.name:
            names.add(node.name)
        elif isinstance(node, (ast.MatchAs, ast.MatchStar)) and node.name:
            names.add(node.name)
        elif isinstance(node, ast.MatchMapping) and node.rest:
            names.add(node.rest)
    return names


def check(tree, declared, positions):
    """Only the declared names, the allowed builtins and modules; nothing hidden (`__x__`)."""
    bound = bound_names(tree)
    known = set(declared) | bound | set(SAFE_BUILTINS) | set(BUILDER)
    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            modules = [alias.name for alias in node.names] if isinstance(node, ast.Import) else [node.module or '.']
            for module in modules:
                if getattr(node, 'level', 0) or module.split('.')[0] not in ALLOWED_MODULES:
                    raise Problem('formula-import-forbidden', f'il modulo {module} non è ammesso', positions.node(node), module)
        elif isinstance(node, ast.Name) and isinstance(node.ctx, ast.Load):
            if node.id.startswith('__') or node.id not in known:
                raise Problem('formula-name-undeclared', f'il nome {node.id} non è fra gli ingressi', positions.node(node), node.id)
        elif isinstance(node, ast.Attribute) and node.attr.startswith('__'):
            raise Problem('formula-name-undeclared', f'il nome {node.attr} non è ammesso', positions.node(node), node.attr)


class Literals(ast.NodeTransformer):
    """A number literal becomes a decimal with the text as written: 1.200 stays 1.200."""

    def __init__(self, source):
        self.source = source

    def visit_Constant(self, node):
        if isinstance(node.value, (int, float)) and not isinstance(node.value, bool):
            text = ast.get_source_segment(self.source, node) or repr(node.value)
            constructor = '__integer__' if isinstance(node.value, int) else '__decimal__'
            call = ast.Call(func=ast.Name(constructor, ast.Load()), args=[ast.Constant(text)], keywords=[])
            return ast.copy_location(call, node)
        return node


def compile_job(job, declared):
    source = job['code']
    positions = Positions(source)
    expression = job['kind'] == 'line'
    try:
        tree = ast.parse(source, filename='<formula>', mode='eval' if expression else 'exec')
    except SyntaxError as error:
        position = positions.of(error.lineno, None, error.end_lineno, None)
        if position is not None:
            # SyntaxError counts columns in characters from 1.
            line = positions.lines[error.lineno - 1] if error.lineno and error.lineno <= len(positions.lines) else ''
            start = max((error.offset or 1) - 1, 0)
            end = max((error.end_offset or error.offset or 1) - 1, start)
            if error.end_lineno not in (None, error.lineno):
                end = start
            position['column'] = len(line[:start].encode('utf-16-le')) // 2
            position['endColumn'] = len(line[:end].encode('utf-16-le')) // 2
            position['endLine'] = error.lineno
        raise Problem('formula-syntax', f'{error.msg}', position) from None
    if not expression:
        if not tree.body or not isinstance(tree.body[-1], ast.Expr):
            last = tree.body[-1] if tree.body else None
            raise Problem('formula-syntax', "l'ultima riga del codice dà il valore: scrivila come espressione",
                          positions.node(last) if last is not None else None)
    check(tree, declared, positions)
    tree = Literals(source).visit(tree)
    if not expression:
        last = tree.body[-1]
        tree.body[-1] = ast.copy_location(ast.Assign(targets=[ast.Name('__value__', ast.Store())], value=last.value), last)
    ast.fix_missing_locations(tree)
    return compile(tree, '<formula>', 'eval' if expression else 'exec'), positions


def where(error, positions):
    """The place in the code of the frame of the formula that raised."""
    traceback = error.__traceback__
    found = None
    while traceback is not None:
        code = traceback.tb_frame.f_code
        if code.co_filename == '<formula>':
            found = traceback
        traceback = traceback.tb_next
    if found is None:
        return None
    try:
        line, end_line, col, end_col = list(found.tb_frame.f_code.co_positions())[found.tb_lasti // 2]
    except (IndexError, ValueError):
        return positions.of(found.tb_lineno, 0, found.tb_lineno, 0)
    return positions.of(line, col, end_line, end_col)


MESSAGES = {
    decimal.DivisionByZero: 'divisione per zero',
    decimal.Overflow: "il risultato esce dall'intervallo dei decimali",
    decimal.InvalidOperation: 'operazione non valida sui decimali',
}


def problem_of(error, positions):
    if isinstance(error, Problem):
        return error
    position = where(error, positions)
    for kind, message in MESSAGES.items():
        if isinstance(error, kind):
            return Problem('formula-error', message, position)
    if isinstance(error, (TypeError, FormulaTypeError)):
        return Problem('formula-type', str(error), position)
    if isinstance(error, NameError):
        return Problem('formula-name-undeclared', str(error), position, getattr(error, 'name', None))
    if isinstance(error, ImportError):
        return Problem('formula-import-forbidden', str(error), position, getattr(error, 'name', None))
    return Problem('formula-error', f'{type(error).__name__}: {error}', position)


# ---- Running a job -----------------------------------------------------------------------

def value_of(input_value, label):
    if 'table' in input_value:
        table = input_value['table']
        fields = [dict(field, py=field['name'].replace('-', '_')) for field in table['fields']]
        rows = [tuple(to_python(value) for value in row) for row in table['rows']]
        return Collection(label, fields, rows)
    return to_python(input_value)


def run(code, expression, scope):
    with decimal.localcontext(CONTEXT):
        if expression:
            return eval(code, scope)
        exec(code, scope)
        return scope['__value__']


def run_job(text):
    job = json.loads(text)
    inputs = {name: value_of(value, name) for name, value in job.get('inputs', {}).items()}
    records = job.get('records')
    recursion = job.get('recursion')
    declared = set(inputs) | set(records['names'] if records else []) | ({recursion['name']} if recursion else set())
    positions = Positions(job['code'])
    try:
        code, positions = compile_job(job, declared)
    except BaseException as error:  # noqa: BLE001 - every problem becomes a diagnostic
        return json.dumps({'error': describe(problem_of(error, positions))})
    base = {'__builtins__': SAFE_BUILTINS, '__decimal__': Decimal, '__integer__': Integer, **BUILDER, **inputs}
    expression = job['kind'] == 'line'
    if records is not None:
        return json.dumps(run_column(job, code, positions, base, records))
    try:
        if recursion is None:
            value = run(code, expression, dict(base))
        else:
            value, warning = run_recursion(code, base, recursion)
            if warning is not None:
                return json.dumps({'value': from_python(value), 'warning': warning})
        return json.dumps({'value': from_python(value)})
    except BaseException as error:  # noqa: BLE001
        return json.dumps({'error': describe(problem_of(error, positions))})


def run_recursion(code, base, recursion):
    """The formula sees its own value of the round before, None at first: n rounds, or
    with "infinite" until two rounds agree, at most RECURSION_SAFETY."""
    limit = recursion.get('limit')
    previous = None
    for round_number in range(limit if limit is not None else RECURSION_SAFETY):
        value = run(code, False, dict(base, **{recursion['name']: previous}))
        if limit is None and round_number > 0 and value == previous:
            return value, None
        previous = value
    if limit is None:
        return previous, {'code': 'formula-recursion-limit', 'message': f'il valore cambia ancora dopo {RECURSION_SAFETY} giri'}
    return previous, None


def run_column(job, code, positions, base, records):
    """The formula once per record, with its fields by name; the first problem is kept."""
    names = records['names']
    field_type = job.get('type', 'string')
    values = []
    first = None
    for index, row in enumerate(records['rows']):
        scope = dict(base)
        scope.update({name: to_python(value) for name, value in zip(names, row)})
        try:
            value = run(code, False, scope)
            if not fits(field_type, value):
                raise FormulaTypeError(f'il field è {field_type}, il valore è di tipo {type(value).__name__}')
            values.append(from_python(value))
        except BaseException as error:  # noqa: BLE001
            values.append({'type': 'missing'})
            # A record with a missing input has a missing value, without a problem.
            if any(value['type'] == 'missing' for value in row):
                continue
            if first is None:
                first = dict(describe(problem_of(error, positions)), record=index)
    result = {'values': values}
    if first is not None:
        result['error'] = first
    return result


def describe(problem):
    out = {'code': problem.code, 'message': problem.message}
    if problem.position:
        out.update(problem.position)
    if problem.target:
        out['target'] = problem.target
    return out
