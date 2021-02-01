import { stream } from "@thi.ng/rstream"
import { map } from "@thi.ng/transducers"

import { CMD_ARGS, CMD_ERRO, CMD_RESO, CMD_SRC$, CMD_SUB$, CMD_WORK } from "@-0/keys"
import { run$, cmd$, out$, task$, multiplex } from "../../src/core"
import { registerCMD, log$ } from "../../src/registers"

/**
 *
 * TODO:
 * 1. Create Commands with varying combinations of
 *    properties (remember src$ and work don't go in
 *    Commands)
 * 2. Refactor to Pattern Matching with thi.ng/EquivMap 💡 nested patterns { Command: { args: { } } }
 *      - step 1) check for args: !args ? NOOP
 *      - step 1) stringify_type(args)
 *      - step 2) pattern match Command
 *      - step 3) pattern/case match args
 *
 * No. | Pattern Match for Commands : | Fn | dispatch?             | accumulator (A) effect
 * --- | ---                          |--- | ---                   | ---
 * a1  | { sub$ }                     | 🔴 | N: No args            | Noop
 * a2  | { args }                     | 💛 | N: No sub$            | Can be spread into or reset A :hash
 * a3  | { reso }                     | 🔴 | N: No sub$            | None
 * a4  | { erro }                     | 🔴 | N: No sub$            | None
 * a5  | { sub$, reso }               | 🔴 | N: No args            | Noop
 * a6  | { sub$, erro }               | 🔴 | N: No args            | Noop
 * a7  | { sub$, args }               | 💚 | Y:                    | Static data: See [b1, b2, b4]
 * a8  | { args, reso }               | 💛 | N: No sub$            | data acq. only see [b]
 * a9  | { args, erro }               | 💛 | N: No sub$            | erro only for reso? 🤔
 * a10 | { reso, erro }               | 🔴 | N: No sub$            | NoOp: no args
 * a11 | { sub$, args, reso }         | 💚 | Y: resolved Promise   | { ...A, ...await reso(await args) }
 * a12 | { sub$, args, erro }         | 💛 | Y:                    | Yes, but no Promises
 * a13 | { sub$, reso, erro }         | 🔴 | N: No args            | Noop
 * a14 | { args, reso, erro }         | 💛 | N: No sub$            | xformed by reso ->...res
 * a15 | { sub$, args, reso, erro }   | 💚 | Y: resolved Promise   | xformed by reso ->...res
 * 
 * No. | Pattern Match for `args` :   | Fn | dispatch?             | Default accumulator (A) effect
 * --- | ---                          |--- | ---                   | ---
 * b0  | null                         | 🔴 | No                    | reset??
 * b1  | 1                            | 🔴 | No                    | NA
 * b2  | {*}                          | 💚 | No                    | A = {...A, ...args }
 * b3  | {P}                          | 💚 | Y: resolved Promise   | A = {...A, ...await args }
 * b4  | (acc) =>                     | 💛 | Y: resolved function  | A = {...A, ...args(A) }
 * 
 * No. | reso:                        | Fn | dispatch?             | accumulator (A) effect
 * --- | ---                          |--- | ---                   | --- 
 * c1  | 1                            | 🔴 | No                    | reset?? 
 * c2  | (acc, res) =>                | 💚 | No                    | { ...A, ...await reso(await args) }
 * 
 * No. | for resolved values:         | Fn | dispatch?             | accumulator (A) effect
 * --- | ---                          |--- | ---                   | ---
 * d1  | 1                            | b1 | b1                    | b1
 * d2  | {*}                          | b2 | b2                    | b2
 * d3  | {P}                          | b3 | b3                    | b3
 * 
 * No. | erro:                        | Fn | dispatch?             | accumulator (A) effect
 * --- | ---                          |--- | ---                   | ---
 * 2   | undefined                    | 🔴 | No                    | A = null
 * 2   | 1                            | 🔴 | No                    | A = null
 * 2   | {C}                          | 💛 | Y: if Command Obj     | A = null
 * 3   | (acc, err, out$) =>          | 💚 | No                    | A = erro(acc, err, out$)
 * 
 * 
 *
 * to dispatch to ad-hoc stream...
 *
 * 2. Create a test for each.
 *
 */

// fixtures
const sub$_1 = "1"
const sub$_2 = "2"
const sub$_3 = "3"

//const hello_cb = x => jest.fn(x => x + " world")
const args_primitive = 1
const args_object = { key: "val" }
const args_Promise = x => new Promise((r, e) => setTimeout(() => r(x), 1000))
const args_async = async x => await args_Promise(x)

const work_primitive = jest.fn(y => "hello " + y)

describe("fixtures", () => {
    test("promises", () => {
        return args_Promise({ hello: "world" }).then(d =>
            expect(d).toMatchObject({ hello: "world" })
        )
    })

    test("async", () => {
        return args_async("hello").then(d => expect(d).toBe("hello"))
    })

    test("work callback", done => {
        work_primitive("earthlings")
        done()
        expect(work_primitive.mock.results[0].value).toBe("hello earthlings")
    })
})

/** 
 * Consider instead of thunk being ad-hoc stream:
 * - all function args are resolved with acc (1st parameter)
 * - args can be either static {...} or functional
 *   ({x})=>({x:...})
 * - either way, the CMD_SUB$ key is type checked:
 *   - if typeof CMD_SUB$ === 'string': regular Command
 *   - if CMD_SUB$.subscribe || CMD_SUB$.subscribeTopic:
 *     ad-hoc stream 
 */

//const cmd_prim = { [CMD_SUB$]: sub$_id + "prim", [CMD_ARGS]: args_prim }
//const cmd_obj = { [CMD_SUB$]: sub$_id + "obj", [CMD_ARGS]: args_obj }
//const cmd_fn_0_prim = { [CMD_SUB$]: sub$_id + "nullary", [CMD_ARGS]: args_fn_0_prim }

//const mock_fn = jest.fn(x => x + "holio")
//const analytics$ = stream()
//analytics$.subscribe(map(mock_fn))
//const args_fn_0_$ = () => ({ [CMD_SUB$]: analytics$, args: "✅ test: ad-hoc stream" })
//analytics$.next("bung")

//describe("test1", () => {
//    test("mock", () => {
//        expect(mock_fn.mock.results[0].value).toBe("bungholio")
//    })
//})

//describe("run$", () => {
//    test("Command: basic", done => {
//        test$.subscribeTopic("leeds", {
//            next  : x => (
//                expect(x.res).toBe(
//                    `
//                    There once was a farmer from Leeds,
//                    Who'd swallowed a packet of seeds.
//                    It soon came to pass,
//                    He'd be covered with grass,
//                    Yet has all the tomatoes he needs
//                    `.replace(WSRGX, "")
//                ),
//                done()
//            ),
//            error : done
//        })
//        run$.next(LEEDS)
//    })
//})
