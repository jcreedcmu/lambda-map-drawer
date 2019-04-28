import { Exp, ExpS } from './types';

type From = 'lam' | 'appl' | 'appr' | 'top';
type StringifyRes = { s: string, counter: number };

export function nameFromNum(n: number): string {
  return String.fromCharCode(n + 97);
}

function _stringifyLam(e: Exp, frm: From, delim: string): string {
  switch (e.t) {
    case 'lam': {
      const v = nameFromNum(e.name);
      const bind = frm == 'lam' ? '' : delim;
      const rv = bind + v + _stringifyLam(e.b, 'lam', delim);
      return (frm == 'lam' || frm == 'top') ? rv : '(' + rv + ')';
    }
    case 'app': {
      const pref = frm == 'lam' ? '.' : '';
      const res1 = _stringifyLam(e.f, 'appl', delim);
      const res2 = _stringifyLam(e.arg, 'appr', delim);
      const rv = (pref + res1 + ' ' + res2);
      return frm == 'appr' ? '(' + rv + ')' : rv;
    }
    case 'var': return nameFromNum(e.name);
    case 'error': return 'ERROR';
  }
}

export function stringifyLam(e: Exp, delim = '\u03bb'): string {
  return _stringifyLam(e, 'top', delim);
}
