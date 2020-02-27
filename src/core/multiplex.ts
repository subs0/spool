/**
 * @module core
 */

import { isFunction, isPromise } from "@thi.ng/checks"
import { pubsub, Subscription, PubSub } from "@thi.ng/rstream"

import { CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO, CMD_SRC$, CMD_WORK } from "@-0/keys"
import { stringify_type, xKeyError, key_index_err, diff_keys } from "@-0/utils"

/**
 * User-land event dispatch stream
 *
 * This stream is directly exposed to users. Any one-off
 * Commands `next`ed into this stream are sent to the
 * `command$` stream. Arrays of Commands (Tasks) are sent to
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
  equiv: (x, y) => x === y || y === "_TRACE_STREAM"
})

/**
 *
 * Primary user-land _READ_ stream. For attaching handlers
 * for responding to emmitted Commands
 */
export const out$: PubSub<any, any> = pubsub({
  topic: x => x[CMD_SUB$],
  id: "out$_stream",
  equiv: (x, y) => x === y || y === "_TRACE_STREAM"
})

/**
 *
 * Primary fork/bisect stream for indivual commands.
 * attached to a `pubsub` stemming from this stream. The
 * `topic` function used to alert downstream handlers is a
 * simple lookup of the `sub$` key of the command
 */
export const command$: Subscription<any, any> = run$.subscribeTopic(
  true,
  {
    next: x => out$.next(x),
    error: console.warn
  },
  { id: "command$_stream" }
)

const err_str = "Spooling Interupted" // <- add doc link to error strings

const nosub$_err = (c, i) =>
  console.warn(`
  🔥 No sub$ included for a Command with a primitive for 'args'. 
  🔥 Ergo, nothing was done with this Command: 
  
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
 * the spool will unpack it in place (super -> sub
 * order preserved) A Subtask must be defined as a unary
 * function that accepts an accumulator object and returns a
 * Task, e.g.:
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
 **/
export const multiplex = task_array =>
  task_array.reduce(async (a, c, i) => {
    const acc = await a
    // console.log("ACCUMULATOR =>", acc)
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
    const sub$ = c[CMD_SUB$]
    const args = c[CMD_ARGS]
    const erro = c[CMD_ERRO]
    const reso = c[CMD_RESO]
    // const _source$ = c[source$]
    // const _handler = c[handler]
    const knowns = [CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO, CMD_SRC$, CMD_WORK]
    const [unknowns] = diff_keys(knowns, c)

    if (unknowns.length > 0) throw new Error(xKeyError(err_str, c, unknowns, sub$, i))
    const arg_type = stringify_type(args)

    let result = args

    /* RESOLVING ARGS */
    if (arg_type !== "PROMISE" && reso) {
      /**
       * If some signature needs to deal with both Promises
       * and non-Promises, non-Promises are wrapped in a
       * Promise to "lift" them into the proper context for
       * handling
       */
      result = Promise.resolve(args)
    }
    if (args !== Object(args) && !sub$) {
      nosub$_err(c, i)
      return acc
    }
    if (arg_type === "PROMISE") {
      // result = await discardable(args).catch(e => e)
      result = await args.catch(e => e)
    }
    if (arg_type === "THUNK") {
      // if thunk, dispatch to ad-hoc stream, return acc
      // as-is ⚠ this command will not be waited on
      result = args()
      console.log(`dispatching to ad-hoc stream: ${sub$.id}`)
      sub$.next(result)
      return acc
    }
    // if function, call it with acc and resolve any Promises
    if (arg_type === "FUNCTION") {
      let temp = args(acc)
      result = isPromise(temp) ? await temp.catch(e => e) : temp
    }
    // if object, send the Command as-is and spread into acc
    if (arg_type === "OBJECT") {
      if (!sub$) return { ...acc, ...args }
      command$.next(c)
      return { ...acc, ...args }
    }

    /* RESULT HANDLERS */
    // TODO: 🤔 think harder about the reso/erro handling
    if (reso) {
      // promise rejection handler
      if (erro && result instanceof Error) {
        let error = erro(acc, result)
        if (error.sub$) return command$.next(error)
        console.warn(err_str, "Promise rejected:", result)
        return acc
      }
      // resovled promise handler
      if (!(result instanceof Error)) {
        let resolved = reso(acc, result)
        // resolved promise with no sub$ key -> spread
        // resolved value into acc
        if (resolved.sub$) command$.next(resolved)
        else if (!sub$) return { ...acc, ...resolved }
        result = resolved
      }
      console.warn(`no 'erro' (Error handler) set for ${c}`)
    }
    // no sub$ key & not a promise -> just spread into acc
    if (!reso && !sub$) return { ...acc, ...result }

    // error, but no error handler
    if (result instanceof Error) {
      console.warn(err_str, result)
      return acc
    }
    if (result !== Object(result)) {
      if (!sub$) {
        nosub$_err(c, i)
        return acc
      }
      // if the final result is primitive, you can't refer
      // to this value in proceeding Commands -> send the
      // Command as-is, return acc as-is.
      command$.next({ [CMD_SUB$]: sub$, [CMD_ARGS]: result })
      return acc
    }
    // if the result has made it this far, send it along
    // console.log(`${sub$} made it through`)
    command$.next({ [CMD_SUB$]: sub$, [CMD_ARGS]: result })
    return { ...acc, ...result }
  }, Promise.resolve({}))

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
