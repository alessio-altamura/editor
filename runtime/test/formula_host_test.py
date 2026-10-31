"""The Python side of the formulas, tested with the CPython of the system: the same standard
library that runs inside Pyodide. Only this module's own checks, on code written here.
Run with: python3 -I test/formula_host_test.py"""
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'python'))
import formula_host as host  # noqa: E402


def job(**fields):
    return json.loads(host.run_job(json.dumps(fields)))


def number(value):
    return {'type': 'number', 'value': value}


MESI = ['gennaio', 'febbraio', 'marzo', 'aprile']
TABLE = {'table': {
    'fields': [{'name': 'mese', 'type': 'string', 'categories': MESI}, {'name': 'euro', 'type': 'number'}],
    'rows': [[{'type': 'string', 'value': m}, number(v)] for m, v in [('aprile', '1300'), ('gennaio', '1000'), ('marzo', '1200'), ('febbraio', '1100')]],
}}


class Decimals(unittest.TestCase):
    def test_spec_values(self):
        for code, want in [('0.1 + 0.2', '0.3'), ('3830 / 3', '1276.666666666666666666666666666667'), ('1.200 * 2', '2.400')]:
            self.assertEqual(job(kind='line', code=code, inputs={}), {'value': number(want)})

    def test_traps(self):
        self.assertEqual(job(kind='line', code='1 / 0', inputs={})['error']['code'], 'formula-error')
        self.assertEqual(job(kind='line', code='9e6144 * 10', inputs={})['error']['code'], 'formula-error')

    def test_integer_literal_indexes(self):
        self.assertEqual(job(kind='value', code='x = [5, 6]\nx[1]', inputs={}), {'value': number('6')})


class Collections(unittest.TestCase):
    def test_total_mean(self):
        self.assertEqual(job(kind='value', code='total(v.euro)', inputs={'v': TABLE}), {'value': number('4600')})
        self.assertEqual(job(kind='value', code='mean([1, 2, 2])', inputs={}), {'value': number('1.666666666666666666666666666666667')})
        self.assertEqual(job(kind='value', code='count(v.euro)', inputs={'v': TABLE}), {'value': number('4')})

    def test_range_in_categories_order(self):
        result = job(kind='value', code="total(v.range('mese', 'febbraio', 'aprile').euro)", inputs={'v': TABLE})
        self.assertEqual(result, {'value': number('3600')})

    def test_range_missing_bound(self):
        self.assertEqual(job(kind='value', code="v.range('mese', 'maggio', 'aprile')", inputs={'v': TABLE})['error']['code'], 'formula-error')

    def test_column_is_not_a_value(self):
        self.assertEqual(job(kind='value', code='v.euro', inputs={'v': TABLE})['error']['code'], 'formula-type')

    def test_computed_field(self):
        result = job(kind='column', code='euro * 0.22', inputs={}, type='number',
                     records={'names': ['euro'], 'rows': [[number('1200')], [{'type': 'missing'}]]})
        self.assertEqual(result, {'values': [number('264.00'), {'type': 'missing'}]})


class Checks(unittest.TestCase):
    def code(self, code):
        return job(kind='value', code=code, inputs={}).get('error', {})

    def test_forbidden(self):
        self.assertEqual(self.code('import os\nos.getcwd()')['code'], 'formula-import-forbidden')
        self.assertEqual(self.code('import js\njs')['target'], 'js')
        self.assertEqual(self.code("__import__('os')")['code'], 'formula-name-undeclared')
        self.assertEqual(self.code('().__class__')['code'], 'formula-name-undeclared')
        self.assertEqual(self.code("open('/etc/hostname')")['target'], 'open')

    def test_undeclared_at_its_place(self):
        error = self.code('x = 1\nx + aliquota')
        self.assertEqual((error['code'], error['line'], error['column'], error['endColumn']), ('formula-name-undeclared', 2, 4, 12))

    def test_last_line_gives_the_value(self):
        self.assertEqual(self.code('a = 1')['code'], 'formula-syntax')

    def test_recursion(self):
        self.assertEqual(job(kind='value', code='(n or 0) + 1', inputs={}, recursion={'name': 'n', 'limit': 3}), {'value': number('3')})
        self.assertEqual(job(kind='value', code='min((n or 0) + 1, 5)', inputs={}, recursion={'name': 'n', 'limit': None}), {'value': number('5')})


if __name__ == '__main__':
    unittest.main()
