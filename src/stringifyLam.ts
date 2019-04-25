import { Exp, ExpS } from './types';

type From = 'lam' | 'appl' | 'appr' | 'top';
type StringifyRes = { s: string, counter: number };

function findSplit(e: Exp): { e: ExpS, size: number } {
  switch (e.t) {
    case 'lam': {
      const { e: e0, size: size0 } = findSplit(e.b);
      return { e: { t: 'lam', b: e0 }, size: size0 - 1 };
    }
    case 'app': {
      const { e: ef, size: sizef } = findSplit(e.f);
      const { e: ea, size: sizea } = findSplit(e.arg);
      return { e: { t: 'app', f: ef, arg: ea, split: sizef }, size: sizef + sizea };
    }
    case 'var': return { e, size: 1 };
  }
}

function _stringifyLam(counter: number, G: string[], e: ExpS, frm: From, delim: string): StringifyRes {
  switch (e.t) {
    case 'lam': {
      const v = String.fromCharCode(counter + 97);
      const bind = frm == 'lam' ? '' : delim;
      const res = _stringifyLam(counter + 1, G.concat([v]), e.b, 'lam', delim);
      const rv = bind + v + res.s;
      return {
        s: (frm == 'lam' || frm == 'top') ? rv : '(' + rv + ')',
        counter: res.counter,
      };
    }
    case 'app': {
      const pref = frm == 'lam' ? '.' : '';
      const res1 = _stringifyLam(counter, G.slice(0, e.split), e.f, 'appl', delim);
      const res2 = _stringifyLam(res1.counter, G.slice(e.split), e.arg, 'appr', delim);
      const rv = (pref + res1.s + ' ' + res2.s);
      return {
        s: frm == 'appr' ? '(' + rv + ')' : rv,
        counter: res2.counter
      };
    }
    case 'var': return { s: G[0], counter };
  }
}

export function stringifyLam(e: Exp, delim = '\u03bb'): string {
  return _stringifyLam(0, [], findSplit(e).e, 'top', delim).s;
}
