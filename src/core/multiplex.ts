/**
 * @module core
 */

import { isFunction, isPromise, isArray } from "@thi.ng/checks"
import { pubsub, Subscription, PubSub, ISubscription } from "@thi.ng/rstream"
import { EquivMap } from "@thi.ng/associative"

import { CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO, CMD_SRC$, CMD_WORK } from "@-0/keys"
import { stringify_type, xKeyError, key_index_err, diff_keys, stringify_fn } from "@-0/utils"
import { getIn } from "@thi.ng/paths"
import { no_args_error, NA_keys, noSubEr, noEroEr, err_str, task_not_array_error } from "./errors"

// prettier-ignore
/**
 * Uses a `thi.ng/associative` `EquivMap` as
 * pattern-matcher. Takes a Command and returns a label of
 * the properties and high-level functionality of the
 * Command
 *
 * @example
 * keys_match({ sub$: "a" }) 
 * //=> "NO_ARGS"
 *
 * @example
 * keys_match({ args: 1 }) 
 * //=> "A"
 *
 * @example
 * keys_match({ sub$: "a", args: 1 }) 
 * //=> "AS"
 */
export const keys_match = C => new EquivMap([
    [ [],                                         "NO_ARGS" ],
    [ [ CMD_SUB$ ],                               "NO_ARGS" ],
    [ [ CMD_RESO ],                               "NO_ARGS" ],
    [ [ CMD_ERRO ],                               "NO_ARGS" ],
    [ [ CMD_RESO, CMD_SUB$ ],                     "NO_ARGS" ],
    [ [ CMD_ERRO, CMD_SUB$ ],                     "NO_ARGS" ],
    [ [ CMD_ERRO, CMD_RESO ],                     "NO_ARGS" ],
    [ [ CMD_ERRO, CMD_RESO, CMD_SUB$ ],           "NO_ARGS" ],
    [ [ CMD_ARGS ],                               "A"       ],
    [ [ CMD_ARGS, CMD_ERRO ],                     "AE"      ],
    [ [ CMD_ARGS, CMD_RESO ],                     "AR"      ],
    [ [ CMD_ARGS, CMD_SUB$ ],                     "AS"      ],
    [ [ CMD_ARGS, CMD_ERRO, CMD_SUB$ ],           "AES"     ],
    [ [ CMD_ARGS, CMD_ERRO, CMD_RESO ],           "AER"     ],
    [ [ CMD_ARGS, CMD_RESO, CMD_SUB$ ],           "ARS"     ],
    [ [ CMD_ARGS, CMD_ERRO, CMD_RESO, CMD_SUB$ ], "AERS"    ]
]).get(Object.keys(C).sort()) || "UNKNOWN"

// prettier-ignore
/**
 * recursive function that resolves any non-static Command
 * arguments and returns the resolved type (as a String) and
 * the value.
 *
 * @example
 * processArgs({ x: 1 }, ({ x }) => ({ y: x })) 
 * //=> { args_type: "OBJECT", args: { y: 1 } }
 *
 * @example
 * processArgs({}, true) 
 * //=> { args_type: "PRIMITIVE", args: true }
 *
 * @example
 * processArgs({}, ({ x }) => ({ a: x + 1 }))
 * //=> { args_type: "ERROR", args: { Error: "Cannot destructure x..." } }
 */

export const processArgs = async (acc, args) => {
    const args_type = stringify_type(args)
    switch (args_type) {
        case "PRIMITIVE": case "OBJECT": case "ERROR": case "ARRAY":
            return { args_type, args }
        case "BINARY": case "N-ARY":
            console.warn(`${CMD_ARGS} function arity !== 1: ${stringify_fn(args)}`)
            break
        case "UNARY":
            return await processArgs(acc, args(acc))
        case "PROMISE": {
            const resolved = await args.catch(e => e)
            return await processArgs(acc, resolved)
        }
        case "NULLARY":
            return await processArgs(acc, args())
        default:
            return "UNDEFINED"
    }
}

const work_in_command_error = C => `${CMD_WORK} key found while running a Command
${stringify_fn(C)}
Check to make sure you've registered this Command ${C[CMD_SUB$] || ""}
using the \`registerCMD\` function
`
// prettier-ignore
/**
 *
 * Uses a `thi.ng/associative` `EquivMap` as core pattern-
 * matching algorithm. Depending on both the high-level
 * apparent properties of a Command Object (within a Task)
 * and the type of `args` property value, a different set of
 * functionality is triggered. If the Command has downstream
 * side-effect handlers registered, they will be triggered
 * before returning. The return value from this function is
 * used to set the accumulator value in every cycle of the
 * `multiplex` function. 
 *
 * @example
 * import { stream, trace } from "@thi.ng/rstream"
 * import { registerCMD } from "../src/registers"
 * const args = ({ x }) =>  
 *
 * const do_it = {
 *    sub$: "do_it",
 *    args: ({ x }) => x
 *    work: x => console.log(`did it${x}`)
 * }
 * const DO_IT = registerCMD(do_it)
 *
 * const test = await pattern_match({ x: "!" }, DO_IT)
 * test //=> 
 * // did it!
 */
export const handlePattern = async (
    acc = {}, 
    C = { 
        [CMD_SUB$]: undefined, 
        [CMD_ARGS]: undefined, 
        [CMD_RESO]: undefined, 
        [CMD_ERRO]: undefined, 
    }, 
    O$ = out$, 
    i = 0
) => {
    if (acc === null) return null
    const K_M = keys_match(C)
    if (K_M === "NO_ARGS") {
        console.warn(no_args_error(C, i))
        return acc
    }
    if (C[CMD_WORK]){
        console.warn(work_in_command_error(C))
        return acc
    }
    const _args = C[CMD_ARGS]
    const { args_type, args } = await processArgs(acc, _args)

    const __R = K_M.includes("R") && C[CMD_RESO](acc, args) 
    const __C = { ...C, [CMD_ARGS]: args }
    const __A = args_type === "OBJECT" && { ...acc, ...args }
    const __RA = __R && { ...acc, ...__R }

    // equivalent matches are returned in LIFO order -> add least least restrictive cases first ⬇
    const result = new EquivMap([ 
        [ { K_M,                                 args_type: "UNKNOWN"   },() => (console.warn(NA_keys(C, i)), null) ],
        [ { K_M,                                 args_type: "OBJECT"    },() => __A ],
        [ { K_M: `${!K_M.includes("S") && K_M}`, args_type: "PRIMITIVE" },() => (console.warn(noSubEr(__C, i)), acc) ],
        [ { K_M: `${K_M.includes("S") && K_M}`,  args_type: "PRIMITIVE" },() => (O$.next(__C), acc) ],
        [ { K_M: `${K_M.includes("S") && K_M}`,  args_type: "OBJECT"    },() => (O$.next(__C), __A) ],
        [ { K_M: `${K_M.includes("R") && K_M}`,  args_type              },() => __RA ],
        [ { K_M: `${K_M.includes("RS") && K_M}`, args_type              },() => (O$.next(__R), __RA) ],
        [ { K_M,                                 args_type: "ERROR"     },() => (console.warn(noEroEr(__C, i)), null) ],
        [ { K_M: `${K_M.includes("E") && K_M}`,  args_type: "ERROR"     },() => C[CMD_ERRO](acc, args, O$) ]
    ]).get({ K_M, args_type }) || null

    //console.log({ [CMD_SUB$]: C[CMD_SUB$], K_M, args_type, result: await result() })

    return result && result()
}

/**
 *
 * Core algorithm and Task dispatcher. This recursive
 * reducing function will pass an inter-Task accumulator
 * between Commands to hydrate prerequisite data from any
 * asynchronous functions within the Task and dispatch
 * resolved Commands to their respective side-effecting
 * handlers registered during `registerCMD`. Thus:
 * side-effects will be dispatched _in order_ with any
 * asynchronous dependencies resolved prior to dispatch.
 *
 * Handles Collections (array) of Commands ("Tasks") which
 * require _ordered_ choreography and/or have a dependency
 * on some (a)sync data produced by a user interaction.
 *
 * ### Subtasks:
 *
 * Subtasks are the way you compose tasks. Insert a Task and
 * the spool will unpack it in place (super -> sub order
 * preserved) A Subtask must be defined as a unary function
 * that accepts an accumulator object and returns a Task,
 * e.g.:
 *
 * #### PSEUDO
 * ```js
 * // { C: Command }
 * // ( { A: Accumulator }: Object ) => [{C},{C}]: Subtask
 * let someSubtask = ({A}) => [{C}, {C}, ({A})=>[{C},{C}], ...]
 * ```
 *
 * #### Example
 * ```js
 * // subtask example:
 * let subtask1 = acc => [
 *  { sub$: "acc"
 *  , args: { data: acc.data } },
 *  { sub$: "route"
 *  , args: { route: { href: acc.href } } }
 * ]
 *
 * // task
 * let task = [
 *  { args: { href: "https://my.io/todos" } }, // acc init
 *  { sub$: "fetch"
 *  , args: ({ href }) => fetch(href).then(r => r.json())
 *  , erro: (acc, err) => ({ sub$: "cancel", args: err })
 *  , reso: (acc, res) => ({ data: res }) },
 *  acc => subtask1(acc), // subtask reference
 *  { sub$: "FLIP" , args: "done" }
 * ]
 * ```
 * ### Ad-hoc stream injection Example
 *
 * ```js
 * import { stream } from "@thi.ng/rstream"
 * import { map, comp } from "@thi.ng/transducers"
 *
 * // ad-hoc stream
 * let login = stream().subscribe(comp(
 *  map(x => console.log("login ->", x)),
 *  map(({ token }) => loginToMyAuth(token))
 * ))
 *
 * // subtask
 * let subtask_login = ({ token }) => [
 *  { sub$: login // <- stream
 *  , args: () => ({ token }) } // <- use acc
 * ]
 *
 * // task
 * let task = [
 *  // no sub$, just pass data
 *  { args: { href: "https://my.io/auth" } },
 *  { sub$: login , args: () => "logging in..." },
 *  { sub$: "AUTH"
 *  , args: ({ href }) => fetch(href).then(r => r.json())
 *  , erro: (acc, err) => ({ sub$: "cancel", args: err })
 *  , reso: (acc, res) => ({ token: res }) },
 *  acc => subtask_login(acc),
 *  { sub$: login , args: () => "log in success" }
 * ]
 * ```
 *
 * 🔥 IMPORTANT 🔥
 *
 * the accumulation object that's passed between Commands
 * within a task is spread together between Commands. I.e.,
 * later Commands payloads are spread into the accumulator -
 * potentially overwriting earlier Commands playoads, but -
 * if no later payloads keys overlap with keys from earlier
 * payloads those key/value pairs remain intact.
 *
 * ### Example that doesn't work
 * ```js
 * export const pruneKVPairs = (obj, ...keys) => {
 *   let out = {}
 *   Object.entries(obj).forEach(([k, v]) => {
 *     if (keys.some(x => x === k)) return
 *     else return (out[k] = v)
 *   })
 *   return out
 * }
 * const PRUNE_PROPS_CMD = registerCMD({
 *  sub$: "PRUNE_PROPS_CMD",
 *  args: acc => pruneKVPairs(acc, "remove_me", "omit_key")
 * })
 * ```
 * This Command doesn't actually prune the accumulator. It
 * does prune upon receipt, but that pruned result is
 * thereafter spread back together with the prior result,
 * effectively undoing the prune
 *
 * In order to "prune" entries from the accumulator, you
 * must do so at the receiving end of the Task. E.g., by
 * applying it to the output
 *
 */
export const multiplex = _out$ => task_array =>
    isArray(task_array)
        ? task_array.reduce(async (a, c, i) => {
              const acc = await a

              /**
               * @example
               * let SubTask = ({ inter_task_prop }) => [
               *      { sub$: "A", args: inter_task_prop + 1 },
               *      { sub$: "B", args: inter_task_prop + 2 }
               * ]
               */
              if (isFunction(c)) {
                  try {
                      const subtask = c(acc)
                      // ensures accumulator is preserved
                      // between stack calls
                      subtask.unshift({ [CMD_ARGS]: acc })
                      // recur
                      return multiplex(_out$)(subtask)
                  } catch (e) {
                      console.warn(err_str, e)
                      return
                  }
              }

              return await handlePattern(acc, c, _out$, i) // returns accumulator
          }, Promise.resolve({}))
        : (() => {
              throw new Error(task_not_array_error(task_array))
          })()

/**
 * User-land event dispatch stream
 *
 * This stream is directly exposed to users. Any one-off
 * Commands `next`ed into this stream are sent to the
 * `cmd$` stream. Arrays of Commands (Tasks) are sent to
 * the `task$` stream.
 *
 * TODO: add examples,`beforeunload` event handler within #4
 *    (orphan): SEE https://youtu.be/QQukWZcIptM and enable
 *    ctx.run.cancel() via external or internal events
 *    (e.g., popstate / { sub$:  "cancel" })
 *
 */
export const run$ = pubsub({
    topic: x => !!x[CMD_ARGS],
    id: "run$_stream",
    //equiv: (res, tpc) => res === tpc
})

/**
 * Primary user-land _READ_ stream. For attaching handlers
 * for responding to emmitted Commands
 */
export const out$ = pubsub({
    topic: x => x[CMD_SUB$],
    id: "out$_stream",
    //equiv: (res, tpc) => res === tpc
})

/**
 *
 * Primary fork/bisect stream for indivual commands.
 * attached to a `pubsub` stemming from this stream. The
 * `topic` function used to alert downstream handlers is a
 * simple lookup of the `sub$` key of the command
 */
export const cmd$ = run$.subscribeTopic(
    true, // has CMD_ARGS
    {
        next: x => out$.next(x),
        error: e => {
            console.warn("error in `cmd$` stream:", e)
            return false
        },
    },
    { id: "cmd$_stream" },
)

/**
 *
 * Task stream that handles Arrays of Commands. Dispatches
 * to `multiplex`er (the heart of `spule`)
 *
 */
export const task$ = run$.subscribeTopic(
    false, // no CMD_ARGS = implied to be a collection/array
    {
        next: multiplex(out$),
        error: e => {
            console.warn("error in `task$` stream:", e)
            return false
        },
    },
    { id: "task$_stream" },
)
