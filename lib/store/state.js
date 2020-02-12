import { Atom } from "@thi.ng/atom";
import { isPlainObject } from "@thi.ng/checks";
import { $$_DEFAULT } from "@-0/keys";
export const $store$ = new Atom($$_DEFAULT);
export const set$$tate = (path, val, store = $store$) => store.swapIn(path, (x) => !path.length && !isPlainObject(val)
    ? Object.assign(Object.assign({}, x), { [Object.keys(val)[0]]: val }) : isPlainObject(x) && isPlainObject(val)
    ? Object.assign(Object.assign({}, x), val) : val);
