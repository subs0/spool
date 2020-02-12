/**
 * @module commands/register
 */

import { map } from "@thi.ng/transducers"
import { isFunction } from "@thi.ng/checks"

import { CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO, CMD_SRC$, CMD_WORK } from "@-0/keys"

import { command$, out$ } from "../core"

import { xKeyError, stringify_w_functions, diff_keys } from "@-0/utils"

const feedCMD$fromSource$ = cmd => {
  const sub$ = cmd[CMD_SUB$]
  const args = cmd[CMD_ARGS]
  const isFn = isFunction(args)
  const deliver = x => ({ [CMD_SUB$]: sub$, [CMD_ARGS]: args(x) })
  const delivery = { [CMD_SUB$]: sub$, [CMD_ARGS]: args }

  const feed = $ => (isFn ? map(x => $.next(deliver(x))) : map(() => $.next(delivery)))

  return cmd[CMD_SRC$].subscribe(feed(command$))
}

let registered = new Map()

const err_str = "command Registration `registerCMD`"
/**
 *
 *
 * Takes a Command object with some additional information
 * and returns a Command `run`able in a Task or as-is.
 *
 * ### Example
 *
 * ```js
 * const genie = {
 *   sub$: "GENIE",
 *   args: "your wish"
 *   work: x => console.log("🧞 says:", x, "is my command")
 * }
 *
 * const GENIE = registerCMD(genie)
 *
 * run(GENIE)
 * // 🧞 says: your wish is my command
 * ```
 *
 * A Command object can have four keys:
 *  1. `sub$` (required)
 *  2. `args` (optional, sets default) during registration
 *  3. `work` (required)
 *  4. `src$` (optional, enables stream to feed Command)
 *
 */
export function registerCMD(command) {
  const sub$ = command[CMD_SUB$]
  const args = command[CMD_ARGS]
  const erro = command[CMD_ERRO]
  const reso = command[CMD_RESO]
  const src$ = command[CMD_SRC$]
  const work = command[CMD_WORK]

  const knowns = [CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO, CMD_SRC$, CMD_WORK]
  const [unknowns] = diff_keys(knowns, command)
  // console.log({ knowns, unknowns })

  if (unknowns.length > 0) {
    throw new Error(xKeyError(err_str, command, unknowns, sub$, undefined))
  }

  if (src$) feedCMD$fromSource$(command)

  // @ts-ignore
  out$.subscribeTopic(
    sub$,
    { next: work, error: console.warn },
    map(puck => puck[CMD_ARGS])
  )

  const CMD = reso
    ? {
        [CMD_SUB$]: sub$,
        [CMD_ARGS]: args,
        [CMD_RESO]: reso,
        [CMD_ERRO]: erro
      }
    : { [CMD_SUB$]: sub$, [CMD_ARGS]: args }
  // Set.add not supported by IE
  if (registered.set) {
    if (registered.has(sub$)) {
      throw new Error(
        `

  🔥 duplicate \`sub$\` value detected in Command:
  ${stringify_w_functions(CMD)}
  existing registered Commands:
  ${JSON.stringify([...registered.keys()], null, 2)}
  🔥 Please use a different/unique Command \`sub$\` string

  🔎 Inspect existing Commands using js Map API \`registerCMD.all\`
  🔎 (\`registerCMD.all.entries()\`, \`registerCMD.all.has("X")\`, etc.)

        `
      )
    }
    registered.set(sub$, CMD)
  }
  return CMD
}
/**
 * enables inspection of the existing Command registrations
 * if using Chrome, there's an additional advantage of being
 * able to find the `[[FunctionLocation]]` of the Command
 */
registerCMD.all = () => registered.entries()
