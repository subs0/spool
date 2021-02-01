/**
 * @module core
 */

import { isFunction, isPromise } from "@thi.ng/checks"
import { pubsub, Subscription, PubSub } from "@thi.ng/rstream"

import { CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO, CMD_SRC$, CMD_WORK } from "@-0/keys"
import { stringify_type, xKeyError, key_index_err, diff_keys } from "@-0/utils"
import { getIn } from "@thi.ng/paths"

const log = console.log

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
export const run$: PubSub<any, any> = pubsub({
    topic: x => !!x[CMD_SUB$],
    id: "run$_stream",
    equiv: (res, tpc) => res === tpc || tpc == "_TRACE_STREAM"
})

/**
 * Primary user-land _READ_ stream. For attaching handlers
 * for responding to emmitted Commands
 */
export const out$: PubSub<any, any> = pubsub({
    topic: x => x[CMD_SUB$],
    id: "out$_stream",
    equiv: (res, tpc) => res === tpc || tpc == "_TRACE_STREAM"
})

/**
 *
 * Primary fork/bisect stream for indivual commands.
 * attached to a `pubsub` stemming from this stream. The
 * `topic` function used to alert downstream handlers is a
 * simple lookup of the `sub$` key of the command
 */
export const cmd$: Subscription<any, any> = run$.subscribeTopic(
    true,
    {
        next: x => out$.next(x),
        error: console.warn
    },
    { id: "cmd$_stream" }
)

/**
 *
 * Task stream that handles Arrays of Commands. Dispatches
 * to `multiplex`er (the heart of `spule`)
 *
 */
export const task$: Subscription<any, any> = run$.subscribeTopic(
    false,
    {
        next: multiplex,
        error: console.warn
    },
    { id: "task$_stream" }
)

const err_str = "Spooling Interupted" // <- TODO: add doc link to error strings

const nosub$_err = (c, i) =>
    console.warn(`
🔥 No sub$ included for a Command with a primitive for 'args'. 

Ergo, nothing was done with this Command: 

${JSON.stringify(c)}

${key_index_err(c, i)}

Hope that helps!
  `)

/**
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
export function multiplex(task_array) {
    return task_array.reduce(async (a, c, i) => {
        let acc = await a

        /**
         * Support "SubTasks"
         * let SubTaskSig = ({ inter_task_prop }) => [
         *      { sub$: "A", args: inter_task_prop + 1 },
         *      { sub$: "B", args: inter_task_prop + 2 }
         * ]
         */
        if (isFunction(c)) {
            try {
                const recur = c(acc)
                // ensures accumulator is preserved between stacks
                recur.unshift({ [CMD_ARGS]: acc })
                return multiplex(recur)
            } catch (e) {
                console.warn(err_str, e)
                return
            }
        }

        // grab Command props
        const sub$ = c[CMD_SUB$]
        const args = c[CMD_ARGS]
        const erro = c[CMD_ERRO]
        const reso = c[CMD_RESO]

        // ensure no unknown Command props
        const knowns = [ CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO, CMD_SRC$, CMD_WORK ]
        const [ unknowns, unknown_kvs ] = diff_keys(knowns, c)
        if (unknowns.length > 0) throw new Error(xKeyError(err_str, c, unknown_kvs, sub$, i))

        const arg_type = stringify_type(args)

        /* 👆 I: Step 1 -> resolve args to a value 👆 */

        // first we set the result to the args
        let result = args

        // if primitive value with no sub$ prop, use of just
        // data would replace accumulator and wouldn't be
        // useful for side-effects. I.e., no work done

        // CASE: ARGS = NOOP PRIMITIVE
        if (args !== Object(args) && !sub$) {
            nosub$_err(c, i)
            return acc
        }
        // if object (static), send the Command as-is and spread into
        // acc. just data = no use of accumulator

        // CASE: ARGS = STATIC OBJECT
        if (arg_type === "OBJECT") {
            if (!sub$) return { ...acc, ...args }
            out$.next(c)
            return { ...acc, ...args }
        }

        /**
         * Support ad-hoc stream dispatch. E.g.:
         *
         * let adHoc$ = stream()
         * let AD_HOC = registerCMD({
         *      sub$: adHoc$,
         *      args: () => ({ sub$: "Y", args: 1 })
         * })
         */
        // CASE: AD-HOC STREAM (SPINOFF)
        if (arg_type === "NULLARY") {
            // if thunk, dispatch to ad-hoc stream, return acc
            // as-is ⚠ this command will not be waited on
            result = args()
            console.log(`dispatching to ad-hoc stream: ${sub$.id}`)
            sub$.next(result)
            return acc
        }

        /**
         * If some signature needs to deal with both Promises
         * and non-Promises, non-Promises are wrapped in a
         * Promise to "lift" them into the proper context for
         * handling
         */
        // CASE: ARGS = PROMISE SIG, BUT NOT PROMISE 🤔 what happens to resolved promises?
        if (arg_type !== "PROMISE" && reso) result = Promise.resolve(args)
        // CASE: ARGS = PROMISE
        if (arg_type === "PROMISE") result = await args.catch(e => e)

        // if function, call it with acc and resolve any Promises
        // CASE ARGS = NON-NULLARY FUNCTION
        if (arg_type === "UNARY") {
            let temp = args(acc)
            result = isPromise(temp) ? await temp.catch(e => e) : temp
        }

        /* 🤞 II: Step 2 -> deal with any Error 🤞 */

        // CASE: RESOLVED ARGS = ERROR
        if (result instanceof Error) {
            // promise handler
            if (reso) {
                // reject handler
                if (erro) {
                    const err_type = stringify_type(erro)

                    // Don't reset accumulator
                    if (err_type === "NULLARY") {
                        let ERR = erro()
                        // Error Command
                        if (getIn(ERR, [ CMD_SUB$ ])) out$.next(ERR)
                        return acc
                    }

                    // if the error msg is a Command, send
                    if (getIn(erro, [ CMD_SUB$ ])) out$.next(erro)
                    // Function resets accumulator _and_ sends
                    // saved Command to out$ stream
                    // e.g.: (acc, err) => ({ sub$, args })
                    if (err_type === "BINARY") {
                        if (getIn(erro(), [ CMD_SUB$ ])) {
                            let ERR_CMD = erro(acc, result)
                            out$.next(ERR_CMD)
                        }
                        acc = erro(acc, result)
                    }
                }
                // implicitly reset if no error handler provided
                acc = null
            }
            // no promise handler
            // no reject handler: carry on
            acc === null ||
                console.warn(`no \`erro\` (Error) handler set for ${sub$ || "error"} ${result}`)
            return acc
        }

        // Not an Error
        if (reso) {
            // resolve Promise
            let resolved = reso(acc, result)
            // if the resolved value is a Command send it
            // through w/out affecting acc
            if (getIn(resolved, [ CMD_SUB$ ])) return out$.next(resolved)
            // else just assign result to resolved val and
            // process in next step
            result = resolved
        }

        /* 👌 III: Step 3 -> Deliver resolved values 👌 */

        // resolved value with no sub$ key? -> data
        // acquisition only! spread val into acc
        if (result === Object(result) && !sub$) return { ...acc, ...result }

        // if the final result is primitive, you can't refer
        // to this value in following Commands
        if (result !== Object(result)) {
            // resolved value is primitive & no sub = NoOp
            if (!sub$) {
                nosub$_err(c, i)
                return acc
            }
            // send the Command as-is, return acc as-is.
            out$.next({ [CMD_SUB$]: sub$, [CMD_ARGS]: result })
            return acc
        }

        //console.log(`NO CONDITIONS MET FOR ${sub$}`)
        // if the result has made it this far, send it along
        out$.next({ [CMD_SUB$]: sub$, [CMD_ARGS]: result })
        return { ...acc, ...result }
    }, Promise.resolve({}))
}
