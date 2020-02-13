/**
 * @module tasks/routing
 */

import { isObject } from "@thi.ng/checks"
import { IAtom } from "@thi.ng/atom"

import { parse } from "@-0/utils"
import {
  // msTaskPromiseDelay,
  // SET_STATE,
  set$$tateHOC
} from "../commands"

import { registerCMDtoStore } from "../registers"
import {
  $$_PATH,
  URL_FULL,
  URL_DATA,
  URL_PATH,
  URL_PAGE,
  ROUTER_PREP,
  ROUTER_POST,
  ROUTER_PRFX,
  CFG_RUTR,
  CMD_ARGS,
  CMD_RESO,
  CMD_ERRO,
  STATE_DATA,
  STATE_PATH
} from "@-0/keys"

/**
 *
 * Universal router (cross-platform) Subtask.
 *
 * This can be used in both a browser and Node context. The
 * parts that handle browser side-effects are included in an
 * Supertask `_URL__ROUTE`
 *
 * Pseudo
 * ```
 * ( router ) => ({ URL }) => [
 *  - set `router_loading` path in global atom to `true`
 *  - call provided `router` with the `URL` and await payload
 *  - `parse_URL(URL)` for `URL_*` components
 *  - set `route_path` in global store/atom to current `URL_path`
 *  - set page state (data, path & page component name) in store
 *  - once promise(s) resolved, set `router_loading` to `false`
 * ]
 * ```
 * reserved Command keys:
 *  - `URL_page`
 *  - `URL_data`
 *  - `URL_path`
 *  - `URL`
 *  - `DOM`
 *
 * TODO: Type ROuter CFG
 */
export const URL__ROUTE = (CFG: Function | Object, store: IAtom<any>) => {
  let router, preroute, postroute, prefix

  if (isObject(CFG)) {
    const ruts = CFG[CFG_RUTR]
    const prep = CFG[ROUTER_PREP]
    const post = CFG[ROUTER_POST]
    const prfx = CFG[ROUTER_PRFX] || null

    const escRGX = /[-/\\^$*+?.()|[\]{}]/g
    const escaped = string => string.replace(escRGX, "\\$&")

    // console.log({ router, pre, post })

    router = ruts
    preroute = isObject(prep) ? [prep] : prep || []
    postroute = isObject(post) ? [post] : post || []
    prefix = prfx ? new RegExp(escaped(prfx), "g") : null
  } else {
    router = CFG
    preroute = []
    postroute = []
    prefix = null
  }
  const _SET_STATE = registerCMDtoStore(store)(set$$tateHOC)
  const task = acc => [
    ...preroute, // 📌 TODO enable progress observation
    /**
     * ## `_SET_ROUTER_LOADING_STATE`cod
     *
     * Routing Command: Universal
     *
     * ### Payload: static
     * default payload `args` signature:
     * ```
     * args: true,
     * ```
     * Simple true or false payload to alert handler
     *
     * ### Handler: side-effecting
     * Sets `route_loading` path in global Atom to true || false
     *
     */
    {
      [CMD_ARGS]: prefix ? router(acc[URL_FULL].replace(prefix, "")) : router(acc[URL_FULL]),
      [CMD_RESO]: (_acc, _res) => ({
        // 🤔: no page in core... can it be migrated/refactored into DOM Router?
        [URL_PAGE]: _res[URL_PAGE],
        [URL_DATA]: _res[URL_DATA]
      }),
      [CMD_ERRO]: (_acc, _err) => console.warn("Error in URL__ROUTE:", _err, "constructed:", _acc)
    },
    {
      [CMD_ARGS]: prefix ? parse(acc[URL_FULL], prefix) : parse(acc[URL_FULL])
    },
    /**
     * ## `_SET_ROUTER_PATH`
     *
     * Routing Command: Universal
     *
     * ### Payload: function
     * default payload `args` signature:
     * ```
     * args: ({ URL_path }) => ({ URL_path }),
     * ```
     * Consumes the `URL_path` property from a `parse_URL`
     * object, handed off from a prior Command
     *
     * ### Handler: side-effecting
     * Sets the current/loading router's `route_path` in the
     * global Atom
     *
     */
    {
      ..._SET_STATE,
      [CMD_ARGS]: _acc => ({
        [STATE_DATA]: _acc[URL_PATH],
        [STATE_PATH]: [$$_PATH]
      })
    },
    ...postroute
  ]
  return [task, _SET_STATE]
}
