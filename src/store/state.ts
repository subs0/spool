/**
 * @module store/state
 */

import { Atom } from "@thi.ng/atom"
import { isPlainObject } from "@thi.ng/checks"

import { $$_DEFAULT, $$_LOAD } from "@-0/keys"

// Global $store$ Container from [@thi.ng/atom](http://thi.ng/atom)
export const $store$ = new Atom($$_DEFAULT)

/**
 *
 * Swaps the current value at the given path/lens into the
 * global store with that of the given value. Checks to see
 * if that value should be either spread into an existing
 * object or a complete replacement
 */
export const set$$tate = (path, val, store = $store$) =>
  store.swapIn(path, (x: Object) =>
    !path.length && !isPlainObject(val)
      ? { ...x, [Object.keys(val)[0]]: val }
      : isPlainObject(x) && isPlainObject(val)
      ? { ...x, ...val }
      : val
  )
