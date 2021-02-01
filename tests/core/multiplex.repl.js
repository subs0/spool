import { stream } from "@thi.ng/rstream"
import { map } from "@thi.ng/transducers"

import { CMD_ARGS, CMD_ERRO, CMD_RESO, CMD_SRC$, CMD_SUB$, CMD_WORK } from "@-0/keys"
//import { run$, cmd$, out$, task$, multiplex } from "../../src/core"
//import { registerCMD, log$ } from "../../src/registers"

/**
 *
 * TODO:
 * 1. Create Commands with varying combinations of properties, e.g.:
 *
 *  No. | COMBINATION                                        | Err? | Description
 *      | ---                                                |---   | ---
 *  1   | { sub$ }                                           |  🔴  |  Noop
 *  2   | { args: 1 }                                        |  🔴  |  No sub$ for primitive
 *  3   | { args: {} }                                       |  💚  |  Static Val
 *  4   | { work }                                           |  🔴  |  Noop
 *  5   | { reso }                                           |  🔴  |  Noop
 *  6   | { erro }                                           |  🔴  |  Noop
 *  7   | { sub$, args: 1 }                                  |  💚  |  primitive dispatch to sub$
 *  8   | { sub$, args: {} }                                 |  💚  |  object dispatch to sub$
 *  9   | { sub$, args: (0) => }                             |  💚  |  function dispatch to sub$
 *  10  | { sub$, args: (1) => }                             |  💚  |  object dispatch to sub$
 *  11  | { sub$, args: Promise }                            |  💚  |
 *  12  | { sub$, args: Promise, work }                      |  💚  |
 *  13  | { sub$, args: Promise, reso }                      |  💛  |  no error handler
 *  14  | { sub$, args: Promise, erro }                      |  💚  |
 *  15  | { sub$, args: Promise, reso, erro: {} }            |  💚  |
 *  16  | { sub$, args: Promise, reso, erro: (0) => }        |  💚  |
 *  17  | { sub$, args: Promise, reso, erro: (1) => }        |  💚  |
 *  18  | { sub$, args: Promise, reso, erro: (>1) => }       |  💚  |
 *  19  | { sub$, args: Promise, reso, erro, work }          |  💚  |
 *
 * 2. Create a test for each.
 *
 */

const sub$_id = "ID_"
const args_prim = 1
const args_obj = { x: 2 }
const args_fn_0_prim = () => 1
const args_fn_0_obj_data = () => ({ y: 4 })
const args_fn_0_obj_worker = () => ({ [CMD_SUB$]: sub$_id + "F0OW", y: 4 })

const analytics$ = stream()
analytics$.subscribe(map(x => console.log("up your", x)))
const args_fn_0_$ = () => ({ [CMD_SUB$]: analytics$, args: "✅ test: ad-hoc stream" })
analytics$.next("ass")
