import json
out = {}
def probe(name, fn):
    try:
        out[name] = 'riuscito: ' + repr(fn())[:120]
    except BaseException as e:
        out[name] = 'bloccato: ' + type(e).__name__ + ': ' + str(e)[:120]
import js
probe('js_ha_fetch', lambda: hasattr(js, 'fetch'))
probe('js_contenuto', lambda: [k for k in dir(js) if not k.startswith('_')][:10])
probe('run_js_typeof_fetch', lambda: __import__('pyodide.code', fromlist=['run_js']).run_js('typeof fetch'))
import pyodide_js
probe('function_constructor', lambda: pyodide_js.constructor.constructor('return typeof globalThis')())
probe('file_host', lambda: open('/etc/hostname').read())
probe('pyfetch', lambda: __import__('pyodide.http', fromlist=['open_url']).open_url('http://127.0.0.1:8765/bench/page.html').read()[:20])
json.dumps(out)
