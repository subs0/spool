/**
 * @module commands/register
 */

import { map } from "@thi.ng/transducers"
import { isFunction } from "@thi.ng/checks"
import { ISubscribable, Subscription, stream } from "@thi.ng/rstream"

import { CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO, CMD_SRC$, CMD_WORK, Command } from "@-0/keys"
import { xKeyError, diff_keys, stringify_fn } from "@-0/utils"

import { out$ } from "../core"

/**
 * A stream that will be forwarded all events emitted from
 * the out$ stream - hooked together during registration
 * (i.e., `registerCMD`)
 */
export const log$: Subscription<any, any> = stream()

/**
 *
 * if a command has a `src$` key it is connected to an
 * upstream producer stream, which enables that source to
 * push values into the command stream and trigger the work
 * registered.
 */
export const supplement$CMD: any = (cmd: Command, downstream: ISubscribable<any>) => {
    const upstream: ISubscribable<any> = cmd[CMD_SRC$]
    const sub$ = cmd[CMD_SUB$]
    const args = cmd[CMD_ARGS]
    const isFn = isFunction(args)
    /**
     * if the args are a function, construct payload from
     * args, else use static args
     */
    const load = (x = null) => ({ [CMD_SUB$]: sub$, [CMD_ARGS]: x ? args(x) : args })
    /**
     * for each emission from upstream source, export it
     * downstream via
     * upstream.subscribe(xf.map(x => downstream.next(x)))
     */
    const xport = downstream => map(x => downstream.next(isFn ? load(x) : load()))
    return upstream.subscribe(xport(downstream))
}

const err_str = "command Registration `registerCMD`"

const no_work_or_src_error = `
Error registering ${CMD_SUB$}:
Commands with no \`${CMD_WORK}\` & no \`${CMD_SRC$}\` handler 
can/need not be registered:

- \`${CMD_WORK}\`: registers side-effecting handlers
- \`${CMD_SRC$}\`: registers upstream Command producers

if your Command is for data acquisition/transformation, 
you can run$.next(YOUR_COMMAND) without registration.
`
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
export const registerCMD = (command: Command = null) => {
    const sub$ = command[CMD_SUB$]
    const args = command[CMD_ARGS]
    const erro = command[CMD_ERRO]
    const reso = command[CMD_RESO]
    const src$ = command[CMD_SRC$]
    const work = command[CMD_WORK]

    if (!work && !src$) {
        throw new Error(no_work_or_src_error)
    }

    const knowns = [ CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO, CMD_SRC$, CMD_WORK ]
    const [ unknowns ] = diff_keys(knowns, command)
    // console.log({ knowns, unknowns })

    if (unknowns.length > 0) {
        throw new Error(xKeyError(err_str, command, unknowns, sub$, undefined))
    }

    if (src$) supplement$CMD(command, out$)

    const CMD = reso
        ? {
              [CMD_SUB$]: sub$,
              [CMD_ARGS]: args,
              [CMD_RESO]: reso,
              [CMD_ERRO]: erro
          }
        : { [CMD_SUB$]: sub$, [CMD_ARGS]: args }

    const CMD_s = reso
        ? {
              [CMD_SUB$]: sub$,
              [CMD_ARGS]: stringify_fn(args),
              [CMD_RESO]: stringify_fn(reso),
              [CMD_ERRO]: stringify_fn(erro)
          }
        : { [CMD_SUB$]: sub$, [CMD_ARGS]: stringify_fn(args) }

    // @ts-ignore
    out$.subscribeTopic(
        sub$,
        {
            next: x => {
                log$.next(CMD_s) // send every Command to log$ stream
                return work(x) // execute side-effects, etc.
            },
            error: console.warn
        }, // pluck the args from the incoming Command
        map(x => x[CMD_ARGS])
    )

    return CMD
}
