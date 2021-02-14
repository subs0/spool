/**
 * @module commands/register
 */

import { map } from "@thi.ng/transducers"
import { isFunction } from "@thi.ng/checks"
import { ISubscribable, Subscription, stream } from "@thi.ng/rstream"

import { CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO, CMD_SRC$, CMD_WORK, Command } from "@-0/keys"
import { xKeyError, diff_keys, stringify_fn, get_param_names } from "@-0/utils"

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
export const forwardUpstreamCMD$: any = (cmd: Command, downstream: ISubscribable<any>) => {
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

    const known_CMD_props = [ CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO, CMD_SRC$, CMD_WORK ]
    const [ unknown_CMD_props ] = diff_keys(known_CMD_props, command)
    // console.log({ known_CMD_props, unknown_CMD_props })

    if (unknown_CMD_props.length > 0) {
        throw new Error(xKeyError(err_str, command, unknown_CMD_props, undefined))
    }
    if (src$) forwardUpstreamCMD$(command, out$)

    const sans_src = { ...command, [CMD_SRC$]: undefined }

    const work_params = get_param_names(work, sans_src)
    const param_warn = work_params.length
        ? args => {
              const args_params = Object.keys(args)
              let missing = work_params.reduce((a, c) => (args_params.some(x => x === c) ? a : a.concat(c)), [])
              if (!missing.length) return
              console.warn(
                  `Command { \`${CMD_SUB$}\`: '${sub$}' } missing critical argument${missing.length === 1
                      ? ""
                      : "s"} specified by its \`${CMD_WORK}\` handler: ${missing.map(x => `\`${x}\``)}`
              )
              //  return args_params
          }
        : null

    const CMD = reso
        ? {
              [CMD_SUB$]: sub$,
              [CMD_ARGS]: args,
              [CMD_RESO]: reso,
              [CMD_ERRO]: erro
          }
        : { [CMD_SUB$]: sub$, [CMD_ARGS]: args }

    // @ts-ignore
    out$.subscribeTopic(
        sub$,
        {
            next: x => {
                param_warn && param_warn(x[CMD_ARGS]) // <- TODO: test
                log$.next(x) // send every Command to log$ stream
                return work(x[CMD_ARGS]) // execute side-effects, etc.
            },
            error: console.warn
        } // pluck the args from the incoming Command
        //map(x => x[CMD_ARGS])
    )

    return CMD
}
