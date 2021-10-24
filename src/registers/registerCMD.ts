/**
 * @module commands/register
 */

//import { map } from "@thi.ng/transducers"
import { isFunction } from "@thi.ng/checks"
import { stream } from "@thi.ng/rstream"

import { CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO, CMD_SRC$, CMD_WORK, ICommand, ICommandObject } from "@-0/keys"
import { xKeyError, diff_keys, stringify_fn } from "@-0/utils"

import { out$ } from "../core"

/**
 * A stream that will be forwarded all events emitted from
 * the out$ stream - hooked together during registration
 * (i.e., `registerCMD`)
 */
export const log$ = stream()

/**
 *
 * if a command has a `src$` key it is connected to an
 * upstream producer stream, which enables that source to
 * push values into the command stream and trigger the work
 * registered.
 */
export const forwardUpstreamCMD$ = (command, downstream) => {
    const upstream = command[CMD_SRC$]
    const sub$ = command[CMD_SUB$]
    const args = command[CMD_ARGS]
    const isFn = isFunction(args)
    /**
     * if args is a function, payloads sent from upstream
     * are thereby transformed. If the arg is static, that
     * payload will be delivered upon every
     * upstream.next(<value>) injected regardless of
     * <value>.
     */
    const load = (dynamic = false) => ({
        [CMD_SUB$]: sub$,
        [CMD_ARGS]: dynamic ? args(dynamic) : args,
    })
    /**
     * for each emission from upstream source, export it
     * downstream
     */
    return upstream.subscribe({
        next: x => {
            //console.log("forwardUpstreamCMD$ upstream emission from", sub$, ":", x)
            downstream.next(isFn ? load(x) : load())
        },
        error: e => {
            console.warn(`registerCMD (forwardUpstreamCMD$): Error from upstream \`${CMD_SRC$}\`: ${upstream.id}:`, e)
            return false
        },
    })
}

const err_str = "command Registration `registerCMD`"

const no_work_error = cmd => {
    const { [CMD_SUB$]: sub, ...no_sub } = cmd
    return `
    Error registering 
    ${stringify_fn(cmd)}
    Commands with no \`${CMD_WORK}\` handler 
    can/need not be registered:
    
    \`${CMD_WORK}\`: registers side-effecting handlers
    
    Without the \`${CMD_WORK}\` handler, nothing will be done 
    when this Command is triggered.
    
    if your Command is for data acquisition/transformation only, 
    you can, e.g., run$.next(${stringify_fn(no_sub)}) without registration.
    `
}

///**
// * TODO: enable dynamic typechecking on static defined
// * CMD_ARGs (either {...} or ({...}) => ({...})) during
// * incoming to stream. Possibly in registerCMD:
// * ```
// * if (dev) log$.next(x)
// * ```
// */
//const warnOnIncongruentInput = (work, sub$) => (args, CMD) => {
//    const work_params = get_shallow_static_destructured_params(work, CMD)
//    const args_params = Object.keys(args)
//    let missing = work_params.reduce((a, c) => (args_params.some(x => x === c) ? a : a.concat(c)), [])
//    if (!missing.length) return
//    console.warn(
//        `Command { \`${CMD_SUB$}\`: '${sub$}' } missing argument${
//            missing.length === 1 ? "" : "s"
//        } specified by its \`${CMD_WORK}\` handler: ${missing.map(x => `\`${x}\``)}

//${stringify_fn(CMD, 2)}
//        `
//    )
//    //  return args_params
//}

/**
 *
 * Takes a Command object with some additional information
 * and returns a Command `run`able in a Task or as-is.
 *
 * A Command object can be registered with up to six keys:
 * 1. `sub$` (required)
 * 2. `args` (optional, sets default) during registration
 * 3. `work` (required)
 * 4. `src$` (optional, enables stream to feed Command)
 * 5. `reso` (optional, for successful promise resolution)
 * 6. `erro` (optional, for unsuccessful promise handling)
 *
 * Upon registration, any `work` and/or `src$` properties
 * will be digested out of the returned Command object,
 * which you can use to trigger the Command with later.
 *
 * @example
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
 * //=> 🧞 says: your wish is my command
 * ```
 * If you wish to provide a registered Command with a
 * dynamic value, you should spread over the `args` of the
 * returned Command:
 *
 * @example
 * ```js
 * run({ ...GENIE, args: "DESIRE" })
 * //=> 🧞 says: DESIRE is my command
 * ```
 * If you wish to compose two Commands together, the `args`
 * can also take a function that is passed an accumulation of
 * the prior Commands `args` or `reso` (if `args` is a Promise)
 * within a "Task" (an Array of Commands)
 *
 * @example
 * ```js
 * run([
 *      {
 *          args: new Promise((res, rej) => res("whatever")),
 *          reso: (acc, res) => ({ give: res }) //<- { give } is spread into Task accumulator
 *      },
 *      {
 *          args: { wish: "you ask for" } //<- { wish } is spread into Task accumulator
 *      },
 *      {
 *          ...GENIE,
 *          args: ({ give, wish }) => give + " " + wish //<- grab it w/function as `args`
 *      }
 * ])
 * //=> 🧞 says: whatever you ask for is my command
 */
export const registerCMD = (command: ICommand, dev = true) => {
    const sub$ = command[CMD_SUB$]

    const args = command[CMD_ARGS]
    const erro = command[CMD_ERRO]
    const reso = command[CMD_RESO]
    const src$ = command[CMD_SRC$]
    const work = command[CMD_WORK]
    const CMD = reso
    ? {
          [CMD_SUB$]: sub$,
          [CMD_ARGS]: args,
          [CMD_RESO]: reso,
          [CMD_ERRO]: erro,
      }
    : {
          [CMD_SUB$]: sub$,
          [CMD_ARGS]: args,
      }
          /**
     * 0: {"_SET_STATE" => Subscription}
     * 1: {"_NOTIFY_PRERENDER_DOM" => Subscription}
     * 2: {"_SET_LINK_ATTRS_DOM" => Subscription}
     * 3: {"_HREF_PUSHSTATE_DOM" => Subscription}
     * 4: {"_NAV" => Subscription}
     * 5: {"_INJECT_HEAD" => Subscription}
     * 6: {"_URL_NAVIGATED$_DOM" => Subscription}
     */
    if (out$.topics.has(sub$)) {
        console.warn(`⚠ REGISTRATION FAILED: ${CMD_SUB$}: ${sub$} already registered! ⚠`)
        return CMD
    }
    if (!work) throw new Error(no_work_error(command))

    const known_CMD_props = [CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO, CMD_SRC$, CMD_WORK]
    const [unknown_CMD_props] = diff_keys(known_CMD_props, command)
    // console.log({ known_CMD_props, unknown_CMD_props })

    if (unknown_CMD_props.length > 0) {
        throw new Error(xKeyError(err_str, command, unknown_CMD_props, undefined))
    }

    if (src$) forwardUpstreamCMD$(command, out$)

    

    out$.subscribeTopic(sub$, {
        next: x => {
            if (dev) log$.next(x) // send every Command to log$ stream if in dev mode
            return work(x[CMD_ARGS]) // execute side-effects, etc.
        },
        error: e => {
            console.warn("error in `out$` stream:", e)
            return false
        },
    })

    return CMD
}
