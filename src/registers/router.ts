/**
 * @module core/registers
 */
import { fromAtom } from "@thi.ng/rstream"
import { peek } from "@thi.ng/arrays"
import { map } from "@thi.ng/transducers"

import {
  URL_FULL,
  ROUTER_PRFX,
  CFG_RUTR,
  CMD_SUB$,
  CMD_ARGS,
  CMD_WORK,
  CFG_ROOT,
  CFG_VIEW,
  CFG_DRFT,
  CFG_LOG$,
  CFG_KICK
} from "@-0/keys"

import { $store$ } from "../store"

import { registerCMD } from "./registerCMD"

import { URL__ROUTE } from "../tasks"

import { diff_keys } from "@-0/utils"

import { run$ } from "../core"

// TODO: server router must be fed from `http` or something (req/res), not `DOMnavigated$`

export const registerRouter = router => {
  console.log("Router Registered")

  const taskFrom = URL__ROUTE(router)
  return registerCMD({
    [CMD_SUB$]: "_URL_NAVIGATED$",
    // [CMD_SRC$]: DOMnavigated$,
    [CMD_ARGS]: x => x,
    [CMD_WORK]: args => run$.next(taskFrom({ [URL_FULL]: args[URL_FULL] }))
  })
}

// prettier-ignore
/**
 *
 * Options Object keys
 * - root   : DOM mount node
 * - app    : root application node
 * - draft  : state scaffolding Object
 * - router : url matching function or config Object
 * - trace  : string triggers logs prepended with it
 * - kick   : boolean triggers kickstart (for some sandboxes)
 * - prefix : ignore a part of the URL (e.g., gitub.io/<prefix>)
 *
 */
export const router = (CFG: Object) => {

  const draft      = CFG[CFG_DRFT]
  const router     = CFG[CFG_RUTR]
  const log$       = CFG[CFG_LOG$]
  const kick       = CFG[CFG_KICK]
  const knowns     = [CFG_ROOT, CFG_VIEW, CFG_DRFT, CFG_RUTR, CFG_LOG$]
  const prfx       = router[ROUTER_PRFX] || null

  const [, others] = diff_keys(knowns, CFG)
  const escRGX     = /[-/\\^$*+?.()|[\]{}]/g
  const escaped    = str => str.replace(escRGX, "\\$&")
  const RGX        = prfx ? new RegExp(escaped(prfx || ""), "g") : null

  if (router) registerRouter(router)

  const state$ = fromAtom($store$)

  if (draft) $store$.swap(x => ({ ...draft, ...x }))

  state$.subscribe(map(peek))
}
