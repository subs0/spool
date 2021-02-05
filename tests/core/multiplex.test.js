import { stream, transduce } from "@thi.ng/rstream"
import { map } from "@thi.ng/transducers"

import { CMD_ARGS, CMD_ERRO, CMD_RESO, CMD_SRC$, CMD_SUB$, CMD_WORK } from "@-0/keys"

import { cmd, log, a_async, a_P } from "../fixtures"
import { run$, cmd$, out$, task$, multiplex, keys_match, processArgs, handlePattern } from "../../src/core"

/**
 *
 * TODO:
 * 1. Create Commands with varying combinations of
 *    properties (remember src$ and work don't go in
 *    Commands)
 * 2. Refactor to Pattern Matching with thi.ng/EquivMap 💡 nested patterns { Command: { args: { } } }
 *      - step 1) check for args: !args ? NOOP
 *      - step 2) resolve args
 *      - step 3) stringify_type(args)
 *      - step 4) pattern match keys
 *
// 
// No. | Pattern Match for Commands : | Fn | dispatch?             | accumulator (A) effect
// --- | ---                          |--- | ---                   | ---
// a1  | { sub$ }                     | 🔴 | N: No args            | Noop
// a2  | { args }                     | 💛 | N: No sub$            | Can be spread into or reset A :hash
// a3  | { reso }                     | 🔴 | N: No sub$            | None
// a4  | { erro }                     | 🔴 | N: No sub$            | None
// a5  | { sub$, reso }               | 🔴 | N: No args            | Noop
// a6  | { sub$, erro }               | 🔴 | N: No args            | Noop
// a7  | { sub$, args }               | 💚 | Y:                    | Static data: See [b1, b2, b4]
// a8  | { args, reso }               | 💛 | N: No sub$            | data acq. only see [b]
// a9  | { args, erro }               | 💛 | N: No sub$            | erro only for reso? 🤔
// a10 | { reso, erro }               | 🔴 | N: No sub$            | NoOp: no args
// a11 | { sub$, args, reso }         | 💚 | Y: resolved Promise   | { ...A, ...await reso(await args) }
// a12 | { sub$, args, erro }         | 💛 | Y:                    | Yes, but no Promises
// a13 | { sub$, reso, erro }         | 🔴 | N: No args            | Noop
// a14 | { args, reso, erro }         | 💛 | N: No sub$            | xformed by reso ->...res
// a15 | { sub$, args, reso, erro }   | 💚 | Y: resolved Promise   | xformed by reso ->...res

// No. | Pattern Match for `args` :   | Fn | dispatch?             | Default accumulator (A) effect
// --- | ---                          |--- | ---                   | ---
// b0  | null                         | 🔴 | No                    | reset??
// b1  | 2                            | 🔴 | No                    | NA
// b2  | {*}                          | 💚 | No                    | A = {...A, ...args }
// b3  | {P}                          | 💚 | Y: resolved Promise   | A = {...A, ...await args }
// b4  | (acc) =>                     | 💛 | Y: resolved function  | A = {...A, ...args(A) }
// b5  | async (acc) => await         | 💛 | Y: resolved function  | A = {...A, ...args(A) }
// b6  | () =>                        | 💛 | Y: resolved function  | A = {...A, ...args(A) }
// 
// No. | reso:                        | Fn | dispatch?             | accumulator (A) effect
// --- | ---                          |--- | ---                   | --- 
// c1  | 2                            | 🔴 | No                    | reset?? 
// c2  | (acc, res) =>                | 💚 | No                    | { ...A, ...await reso(await args) }
// 
// No. | for resolved values:         | Fn | dispatch?             | accumulator (A) effect
// --- | ---                          |--- | ---                   | ---
// d1  | 2                            | b1 | b1                    | b1
// d2  | {*}                          | b2 | b2                    | b2
// d3  | {P}                          | b3 | b3                    | b3
// d4  | {E}                          | 🔴 | No                    | default: null out
// 
// No. | erro:                        | Fn | dispatch?             | accumulator (A) effect
// --- | ---                          |--- | ---                   | ---
// e1  | undefined                    | 🔴 | No                    | A = null
// e2  | 2                            | 🔴 | No                    | A = null
// e3  | {C}                          | 💛 | Y: if Command Obj     | A = null
// e4  | (acc, err, out$) =>          | 💚 | No                    | A = erro(acc, err, out$)
// 
// to dispatch to ad-hoc stream...
//
 * 2. Create a test for each.
 */

// No. | Pattern Match for Commands : | Fn | dispatch?             | accumulator (A) effect
// a1  | { sub$ }                     | 🔴 | N: No args            | Noop
const cmd_s = { [CMD_SUB$]: "cmd_s" }

// a2  | { args }                     | 💛 | N: No sub$            | Can be spread into or reset A :hash
// b0  | null                         | 🔴 | No                    | reset??
const cmd_a_null = { ...cmd.a_null }

// a2  | { args }                     | 💛 | N: No sub$            | Can be spread into or reset A :hash
// b1  | 2                            | 🔴 | No                    | NA
const cmd_a_prim = { ...cmd.a_prim }

// a2  | { args }                     | 💛 | N: No sub$            | Can be spread into or reset A :hash
// b2  | {*}                          | 💚 | No                    | A = {...A, ...args }
const cmd_a_obj = { ...cmd.a_obj }

// a3  | { reso }                     | 🔴 | N: No sub$            | None
const cmd_r_2fn_yay = { ...cmd.r_2fn_yay }

// a4  | { erro }                     | 🔴 | N: No sub$            | None
const cmd_e_3fn_err = { ...cmd.e_3fn_err }

// a5  | { sub$, reso }               | 🔴 | N: No args            | Noop
// c2  | (acc, res) =>                | 💚 | No                    | { ...A, ...await reso(await args) }
// d2  | {*}                          | b2 | b2                    | b2
const cmd_s_r_2fn_yay = {
    ...cmd.r_2fn_yay,
    [CMD_SUB$] : "cmd_s_r_2fn_yay"
}

// a6  | { sub$, erro }               | 🔴 | N: No args            | Noop
// e4  | (acc, err, out$) =>          | 💚 | No                    | A = erro(acc, err, out$)
const cmd_s_e_3fn_err = { ...cmd.e_3fn_err, [CMD_SUB$]: "cmd_s_e_3fn_err" }

// a7  | { sub$, args }               | 💚 | Y:                    | Static data: See [b1, b2, b4]
// b0  | null                         | 🔴 | No                    | reset??
const cmd_s_a_null = { ...cmd.a_null, [CMD_SUB$]: "cmd_s_a_null" }

// a7  | { sub$, args }               | 💚 | Y:                    | Static data: See [b1, b2, b4]
// b1  | 2                            | 🔴 | No                    | NA
const cmd_s_a_prim = { ...cmd.a_prim, [CMD_SUB$]: "cmd_s_a_prim" }

// a7  | { sub$, args }               | 💚 | Y:                    | Static data: See [b1, b2, b4]
// b2  | {*}                          | 💚 | No                    | A = {...A, ...args }
const cmd_s_a_obj = { ...cmd.a_obj, [CMD_SUB$]: "cmd_s_a_obj" }

// a7  | { sub$, args }               | 💚 | Y:                    | Static data: See [b1, b2, b4]
// b3  | {P}                          | 💚 | Y: resolved Promise   | A = {...A, ...await args }
// d1  | 2                            | b1 | b1                    | b1
const cmd_s_a_P2prim = { ...cmd.a_P2prim, [CMD_SUB$]: "cmd_s_a_P2prim" }

// a7  | { sub$, args }               | 💚 | Y:                    | Static data: See [b1, b2, b4]
// b3  | {P}                          | 💚 | Y: resolved Promise   | A = {...A, ...await args }
// d2  | {*}                          | b2 | b2                    | b2
const cmd_s_a_P2obj = { ...cmd.a_P2obj, [CMD_SUB$]: "cmd_s_a_P2obj" }

// a7  | { sub$, args }               | 💚 | Y:                    | Static data: See [b1, b2, b4]
// d4  | {E}                          | 🔴 | No                    | default: null out
const cmd_s_a_P2error = { ...cmd.a_P2error, [CMD_SUB$]: "cmd_s_a_P2error" }

// a7  | { sub$, args }               | 💚 | Y:                    | Static data: See [b1, b2, b4]
// b5  | async (acc) => await         | 💛 | Y: resolved function  | A = {...A, ...args(A) }
const cmd_s_a_async = { ...cmd.a_async, [CMD_SUB$]: "cmd_s_a_async" }

// a7  | { sub$, args }               | 💚 | Y:                    | Static data: See [b1, b2, b4]
// b6  | () =>                        | 💛 | Y: resolved function  | A = {...A, ...args(A) }
// b3  | {P}                          | 💚 | Y: resolved Promise   | A = {...A, ...await args }
// b1  | 2                            | 🔴 | No                    | NA
const cmd_s_a_0fn2P_2pri = { ...cmd.a_0fn2P_2pri, [CMD_SUB$]: "cmd_s_a_0fn2P_2pri" }

// a7  | { sub$, args }               | 💚 | Y:                    | Static data: See [b1, b2, b4]
// b4  | (acc) =>                     | 💛 | Y: resolved function  | A = {...A, ...args(A) }
// b3  | {P}                          | 💚 | Y: resolved Promise   | A = {...A, ...await args }
// b2  | {*}                          | 💚 | No                    | A = {...A, ...args }
const cmd_s_a_1fn2P_2obj = { ...cmd.a_1fn2P_2obj, [CMD_SUB$]: "cmd_s_a_1fn2P_2obj" }

// a7  | { sub$, args }               | 💚 | Y:                    | Static data: See [b1, b2, b4]
// b4  | (acc) =>                     | 💛 | Y: resolved function  | A = {...A, ...args(A) }
// d3  | {P}                          | b3 | b3                    | b3
// d4  | {E}                          | 🔴 | No                    | default: null out
const cmd_s_a_1fn2P_boo = { ...cmd.a_1fn2P_boo, [CMD_SUB$]: "cmd_s_a_1fn2P_boo" }

// a8  | { args, reso }               | 💛 | N: No sub$            | data acq. only see [b]
// b6  | () =>                        | 💛 | Y: resolved function  | A = {...A, ...args(A) }
// d3  | {P}                          | b3 | b3                    | b3
// c2  | (acc, res) =>                | 💚 | No                    | { ...A, ...await reso(await args) }
// d2  | {*}                          | b2 | b2                    | b2
const cmd_a_0fn2P_2pri_r_2fn_yay = { ...cmd.r_2fn_yay, ...cmd.a_0fn2P_2pri }

// a8  | { args, reso }               | 💛 | N: No sub$            | data acq. only see [b]
// b4  | (acc) =>                     | 💛 | Y: resolved function  | A = {...A, ...args(A) }
// d3  | {P}                          | b3 | b3                    | b3
// c2  | (acc, res) =>                | 💚 | No                    | { ...A, ...await reso(await args) }
// d2  | {*}                          | b2 | b2                    | b2
const cmd_a_1fn2P_2obj_r_2fn_yay = { ...cmd.r_2fn_yay, ...cmd.a_1fn2P_2obj }

// a8  | { args, reso }               | 💛 | N: No sub$            | data acq. only see [b]
// b2  | {*}                          | 💚 | No                    | A = {...A, ...args }
// c2  | (acc, res) =>                | 💚 | No                    | { ...A, ...await reso(await args) }
// d2  | {*}                          | b2 | b2                    | b2
const cmd_a_obj_r_2fn_yay = { ...cmd.r_2fn_yay, ...cmd.a_obj }

// a9  | { args, erro }               | 💛 | N: No sub$            | erro only for reso? 🤔
// b4  | (acc) =>                     | 💛 | Y: resolved function  | A = {...A, ...args(A) }
// d3  | {P}                          | b3 | b3                    | b3
// d4  | {E}                          | 🔴 | No                    | default: null out
// e4  | (acc, err, out$) =>          | 💚 | No                    | A = erro(acc, err, out$)
const cmd_a_1fn2P_boo_e_3fn_err = { ...cmd.e_3fn_err, ...cmd.a_1fn2P_boo }

// a10 | { reso, erro }               | 🔴 | N: No sub$            | NoOp: no args
const cmd_r_2fn_yay_e_3fn_err = { ...cmd.e_3fn_err, ...cmd.r_2fn_yay }

// a11 | { sub$, args, reso }         | 💚 | Y: resolved Promise   | { ...A, ...await reso(await args) }
// b6  | () =>                        | 💛 | Y: resolved function  | A = {...A, ...args(A) }
// b3  | {P}                          | 💚 | Y: resolved Promise   | A = {...A, ...await args }
// c1  | 2                            | 🔴 | No                    | reset??
// c2  | (acc, res) =>                | 💚 | No                    | { ...A, ...await reso(await args) }
// d2  | {*}                          | b2 | b2                    | b2
const cmd_s_a_0fn2P_2pri_r_2fn_yay = {
    ...cmd.r_2fn_yay,
    ...cmd.a_0fn2P_2pri,
    [CMD_SUB$] : "cmd_s_a_0fn2P_2pri_r_2fn_yay"
}

// a11 | { sub$, args, reso }         | 💚 | Y: resolved Promise   | { ...A, ...await reso(await args) }
// b4  | (acc) =>                     | 💛 | Y: resolved function  | A = {...A, ...args(A) }
// b3  | {P}                          | 💚 | Y: resolved Promise   | A = {...A, ...await args }
// d2  | {*}                          | b2 | b2                    | b2
// c2  | (acc, res) =>                | 💚 | No                    | { ...A, ...await reso(await args) }
// d2  | {*}                          | b2 | b2                    | b2
const cmd_s_a_1fn2P_2obj_r_2fn_yay = {
    ...cmd.r_2fn_yay,
    ...cmd.a_1fn2P_2obj,
    [CMD_SUB$] : "cmd_s_a_1fn2P_2obj_r_2fn_yay"
}

// No error handler for error, reso not called
// a11 | { sub$, args, reso }         | 💚 | Y: resolved Promise   | { ...A, ...await reso(await args) }
// b4  | (acc) =>                     | 💛 | Y: resolved function  | A = {...A, ...args(A) }
// b3  | {P}                          | 💚 | Y: resolved Promise   | A = {...A, ...await args }
// d4  | {E}                          | 🔴 | No                    | default: null out
// c2  | (acc, res) =>                | 💚 | No                    | { ...A, ...await reso(await args) }
const cmd_s_a_1fn2P_boo_r_2fn_yay = { ...cmd.r_2fn_yay, ...cmd.a_1fn2P_boo, [CMD_SUB$]: "cmd_s_a_1fn2P_boo_r_2fn_yay" }

// a12 | { sub$, args, erro }         | 💛 | Y:                    | Yes, but no Promises
// b4  | (acc) =>                     | 💛 | Y: resolved function  | A = {...A, ...args(A) }
// b3  | {P}                          | 💚 | Y: resolved Promise   | A = {...A, ...await args }
// d4  | {E}                          | 🔴 | No                    | default: null out
// e4  | (acc, err, out$) =>          | 💚 | No                    | A = erro(acc, err, out$)
const cmd_s_a_1fn2P_boo_e_3fn_err = { ...cmd.e_3fn_err, ...cmd.a_1fn2P_boo, [CMD_SUB$]: "cmd_s_a_1fn2P_boo_e_3fn_err" }

// a13 | { sub$, reso, erro }         | 🔴 | N: No args            | Noop
// c2  | (acc, res) =>                | 💚 | No                    | { ...A, ...await reso(await args) }
// e4  | (acc, err, out$) =>          | 💚 | No                    | A = erro(acc, err, out$)
const cmd_s_r_2fn_yay_e_3fn_err = {
    ...cmd.e_3fn_err,
    ...cmd.r_2fn_yay,
    [CMD_SUB$] : "cmd_s_r_2fn_yay_e_3fn_err"
}

// a14 | { args, reso, erro }         | 💛 | N: No sub$            | xformed by reso ->...res
// b4  | (acc) =>                     | 💛 | Y: resolved function  | A = {...A, ...args(A) }
// b3  | {P}                          | 💚 | Y: resolved Promise   | A = {...A, ...await args }
// d4  | {E}                          | 🔴 | No                    | default: null out
// e4  | (acc, err, out$) =>          | 💚 | No                    | A = erro(acc, err, out$)
const cmd_a_1fn2P_boo_r_2fn_yay_e_3fn_err = {
    ...cmd.e_3fn_err,
    ...cmd.r_2fn_yay,
    ...cmd.a_1fn2P_boo
}

// a14 | { args, reso, erro }         | 💛 | N: No sub$            | xformed by reso ->...res
// b4  | (acc) =>                     | 💛 | Y: resolved function  | A = {...A, ...args(A) }
// b3  | {P}                          | 💚 | Y: resolved Promise   | A = {...A, ...await args }
// b2  | {*}                          | 💚 | No                    | A = {...A, ...args }
// c2  | (acc, res) =>                | 💚 | No                    | { ...A, ...await reso(await args) }
// e4  | (acc, err, out$) =>          | 💚 | No                    | A = erro(acc, err, out$)
const cmd_a_1fn2P_2obj_r_2fn_yay_e_3fn_err = {
    ...cmd.e_3fn_err,
    ...cmd.r_2fn_yay,
    ...cmd.a_1fn2P_2obj
}

// a15 | { sub$, args, reso, erro }   | 💚 | Y: resolved Promise   | xformed by reso ->...res
// b4  | (acc) =>                     | 💛 | Y: resolved function  | A = {...A, ...args(A) }
// b3  | {P}                          | 💚 | Y: resolved Promise   | A = {...A, ...await args }
// d4  | {E}                          | 🔴 | No                    | default: null out
// c2  | (acc, res) =>                | 💚 | No                    | { ...A, ...await reso(await args) }
// e4  | (acc, err, out$) =>          | 💚 | No                    | A = erro(acc, err, out$)
const cmd_s_a_1fn2P_boo_r_2fn_yay_e_3fn_err = {
    ...cmd.e_3fn_err,
    ...cmd.r_2fn_yay,
    ...cmd.a_1fn2P_boo,
    [CMD_SUB$] : "cmd_s_a_1fn2P_boo_r_2fn_yay_e_3fn_err"
}

// a15 | { sub$, args, reso, erro }   | 💚 | Y: resolved Promise   | xformed by reso ->...res
// b4  | (acc) =>                     | 💛 | Y: resolved function  | A = {...A, ...args(A) }
// b3  | {P}                          | 💚 | Y: resolved Promise   | A = {...A, ...await args }
// d2  | {*}                          | b2 | b2                    | b2
// c2  | (acc, res) =>                | 💚 | No                    | { ...A, ...await reso(await args) }
// e4  | (acc, err, out$) =>          | 💚 | No                    | A = erro(acc, err, out$)
const cmd_s_a_P2obj_r_2fn_yay_e_3fn_err = {
    ...cmd.e_3fn_err,
    ...cmd.r_2fn_yay,
    ...cmd.a_P2obj,
    [CMD_SUB$] : "cmd_s_a_P2obj_r_2fn_yay_e_3fn_err"
}

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

// prettier-ignore
describe("pattern_keys", () => {
    test(`1: { } => "NO_ARGS"`,                                                  () => expect(keys_match({}))                                   .toBe("NO_ARGS"))
    test(`2: { ${CMD_SUB$} } => "NO_ARGS"`,                                      () => expect(keys_match(cmd_s))                                .toBe("NO_ARGS"))
    test(`3: { ${CMD_RESO} } => "NO_ARGS"`,                                      () => expect(keys_match(cmd_r_2fn_yay))                        .toBe("NO_ARGS"))
    test(`4: { ${CMD_ERRO} } => "NO_ARGS"`,                                      () => expect(keys_match(cmd_e_3fn_err))                        .toBe("NO_ARGS"))
    test(`5: { ${CMD_SUB$}, ${CMD_RESO} } => "NO_ARGS"`,                         () => expect(keys_match(cmd_s_r_2fn_yay))                      .toBe("NO_ARGS"))
    test(`6: { ${CMD_SUB$}, ${CMD_ERRO} } => "NO_ARGS"`,                         () => expect(keys_match(cmd_s_e_3fn_err))                      .toBe("NO_ARGS"))
    test(`7: { ${CMD_RESO}, ${CMD_ERRO} } => "NO_ARGS"`,                         () => expect(keys_match(cmd_r_2fn_yay_e_3fn_err))              .toBe("NO_ARGS"))
    test(`8: { ${CMD_SUB$}, ${CMD_RESO}, ${CMD_ERRO} } => "NO_ARGS"`,            () => expect(keys_match(cmd_s_r_2fn_yay_e_3fn_err))            .toBe("NO_ARGS"))
    test(`9: { ${CMD_ARGS} } => "A"`,                                            () => expect(keys_match(cmd_a_null))                           .toBe("A"))
    test(`10: { ${CMD_ARGS} } => "A"`,                                           () => expect(keys_match(cmd_a_obj))                            .toBe("A"))
    test(`11: { ${CMD_ARGS} } => "A"`,                                           () => expect(keys_match(cmd_a_prim))                           .toBe("A"))
    test(`12: { ${CMD_SUB$}, ${CMD_ARGS} } => "AS"`,                             () => expect(keys_match(cmd_s_a_0fn2P_2pri))                   .toBe("AS"))
    test(`13: { ${CMD_SUB$}, ${CMD_ARGS} } => "AS"`,                             () => expect(keys_match(cmd_s_a_1fn2P_2obj))                   .toBe("AS"))
    test(`14: { ${CMD_SUB$}, ${CMD_ARGS} } => "AS"`,                             () => expect(keys_match(cmd_s_a_1fn2P_boo))                    .toBe("AS"))
    test(`15: { ${CMD_ARGS}, ${CMD_ERRO} } => "AE"`,                             () => expect(keys_match(cmd_a_1fn2P_boo_e_3fn_err))            .toBe("AE"))
    test(`16: { ${CMD_ARGS}, ${CMD_RESO} } => "AR"`,                             () => expect(keys_match(cmd_a_0fn2P_2pri_r_2fn_yay))           .toBe("AR"))
    test(`17: { ${CMD_ARGS}, ${CMD_RESO} } => "AR"`,                             () => expect(keys_match(cmd_a_1fn2P_2obj_r_2fn_yay))           .toBe("AR"))
    test(`18: { ${CMD_SUB$}, ${CMD_ARGS}, ${CMD_ERRO} } => "AES"`,               () => expect(keys_match(cmd_s_a_1fn2P_boo_e_3fn_err))          .toBe("AES"))
    test(`19: { ${CMD_SUB$}, ${CMD_ARGS}, ${CMD_RESO} } => "ARS"`,               () => expect(keys_match(cmd_s_a_1fn2P_boo_r_2fn_yay))          .toBe("ARS"))
    test(`20: { ${CMD_SUB$}, ${CMD_ARGS}, ${CMD_RESO} } => "ARS"`,               () => expect(keys_match(cmd_s_a_0fn2P_2pri_r_2fn_yay))         .toBe("ARS"))
    test(`21: { ${CMD_SUB$}, ${CMD_ARGS}, ${CMD_RESO} } => "ARS"`,               () => expect(keys_match(cmd_s_a_1fn2P_2obj_r_2fn_yay))         .toBe("ARS"))
    test(`22: { ${CMD_ARGS}, ${CMD_RESO}, ${CMD_ERRO} } => "AER"`,               () => expect(keys_match(cmd_a_1fn2P_boo_r_2fn_yay_e_3fn_err))  .toBe("AER"))
    test(`23: { ${CMD_ARGS}, ${CMD_RESO}, ${CMD_ERRO} } => "AER"`,               () => expect(keys_match(cmd_a_1fn2P_2obj_r_2fn_yay_e_3fn_err)) .toBe("AER"))
    test(`24: { ${CMD_SUB$}, ${CMD_ARGS}, ${CMD_RESO}, ${CMD_ERRO} } => "AERS"`, () => expect(keys_match(cmd_s_a_P2obj_r_2fn_yay_e_3fn_err))    .toBe("AERS"))
    test(`25: { ${CMD_SUB$}, ${CMD_ARGS}, ${CMD_RESO}, ${CMD_ERRO} } => "AERS"`, () => expect(keys_match(cmd_s_a_1fn2P_boo_r_2fn_yay_e_3fn_err)).toBe("AERS"))
})

// prettier-ignore
describe("processArgs", () => {
    test(`1: Objects`, async () => 
        expect(await processArgs({}, { mad: "world" }))
        .toMatchObject({ args_type: "OBJECT", args: { mad: "world" } }))
    test(`2: Error Objects`, async () => 
        expect(await processArgs({}, new Error("shoot")))
        .toMatchObject({ args_type: "ERROR", args: Error("shoot") }))
    test(`3: Arrays`, async () => 
        expect(await processArgs({}, [ "a", "b" ]))
        .toMatchObject({ args_type: "ARRAY", args: [ "a", "b" ] }))
    test(`4: Promises`, async () => 
        expect(await processArgs({}, Promise.resolve(true)))
        .toMatchObject({ args_type: "PRIMITIVE", args: true }))
    test(`5: Nullary Function`, async () => 
        expect(await processArgs({}, () => ({ a: 1 })))
        .toMatchObject({ args_type: "OBJECT", args: { a: 1 } }))
    test(`6: new Promises`, async () => 
        expect(await processArgs({}, new Promise(res => res(true))))
        .toMatchObject({ args_type : "PRIMITIVE", args: true }))
    test(`7: Unary Functions`, async () => 
        expect(await processArgs({ a: 1 }, ({ a }) => ({ a: a + 1 })))
        .toMatchObject({ args_type : "OBJECT", args: { a: 2 } }))
    test(`8: a => Promise`, async () => 
        expect(await processArgs({ a: "to" }, ({ a }) => new Promise(r => r(a + "do"))))
        .toMatchObject({ args_type : "PRIMITIVE", args: "todo" }))
    test(`9: a => Object`, async () => 
        expect(await processArgs({ a: "to" }, ({ a }) => ({ a: a + "do" })))
        .toMatchObject({ args_type : "OBJECT", args: { a: "todo" } }))
    test(`10: async a => Promise => Object`, async () => 
        expect(await processArgs({ a: "to" }, a => a_async(a)))
        .toMatchObject({ args_type : "OBJECT", args: { a: "to" } }))
})

const acc_init = { key: "bloop" }
const warned = (x = jest.fn()) => (jest.spyOn(console, "warn").mockImplementation(x), x)

describe(`handlePattern`, () => {
    test(`1: Errors result in acc = null if no \`${CMD_ERRO}\` is provided`, async () => {
        const warned_1 = warned()
        const acc = await handlePattern({ 2: "b" }, { [CMD_ARGS]: new Error("bloop") })
        expect(acc).toBe(null)
        expect(warned_1.mock.calls.length).toBe(1)
    })
    test(`2: Promises are handled by \`${CMD_RESO}\` if provided and resulting Objects are spread with accumulator`, async () => {
        const acc = await handlePattern({ key: "bloop" }, cmd_a_1fn2P_2obj_r_2fn_yay)
        expect(acc).toMatchObject({ key: "bloop -> a_1fn2P_2obj -> r_2fn_yay" })
    })
    test(`3: Warning if no \`${CMD_ARGS}\` provided -> acc returned as-is`, async () => {
        const warned_1 = warned()
        const acc = await handlePattern(acc_init, cmd_r_2fn_yay)
        expect(warned_1.mock.calls.length).toBe(1)
        expect(acc).toMatchObject(acc_init)
    })
    test(`4: Warning for Primitive \`${CMD_ARGS}\` with no \`${CMD_SUB$}\`, and do nothing`, async () => {
        const warned_1 = warned()
        const acc = await handlePattern(acc_init, cmd_a_prim)
        expect(warned_1.mock.calls.length).toBe(1)
        expect(acc).toMatchObject(acc_init)
    })
    test(`5: Unhandled errors null out accumulator`, async () => {
        const warned_1 = warned()
        const acc = await handlePattern({ key: "bloop" }, cmd_s_a_P2error)
        expect(warned_1.mock.calls.length).toBe(1)
        expect(acc).toBe(null)
    })
    test(`6: Commands with a \`${CMD_SUB$}\` that result in a Primitive are dispatched, don't effect accumulator`, async () => {
        const O$ = stream()
        const fn_1 = jest.fn(x => x)
        O$.subscribe(map(fn_1))
        const acc = await handlePattern({ key: "bloop" }, cmd_s_a_0fn2P_2pri, O$)
        expect(acc).toMatchObject({ key: "bloop" })
        expect(fn_1.mock.results[0].value).toMatchObject({ args: 2, sub$: "cmd_s_a_0fn2P_2pri" })
    })
    test(`7: Errors are handled if \`${CMD_ERRO}\` is provided`, async () => {
        const O$ = stream()
        const fn_1 = jest.fn(x => x)
        O$.subscribe(map(fn_1))
        const acc = await handlePattern(
            {},
            { [CMD_ARGS]: new Error("bloop"), [CMD_ERRO]: (A, E, O$) => (O$.next("💩"), null) },
            O$
        )
        expect(acc).toBe(null)
        expect(fn_1.mock.results[0].value).toBe("💩")
    })
})

describe(`multiplex`, () => {
    test(`1: Warning if no \`${CMD_ARGS}\` value -> accumulator unaffected`, async () => {
        const warned_1 = warned()

        const O$ = stream()
        const fn_1 = jest.fn()
        O$.subscribe(map(fn_1))

        const spool = multiplex(O$)
        const Task = [
            cmd_s,
            cmd_r_2fn_yay,
            cmd_e_3fn_err,
            cmd_s_r_2fn_yay,
            cmd_s_e_3fn_err,
            cmd_r_2fn_yay_e_3fn_err,
            cmd_s_r_2fn_yay_e_3fn_err
        ]

        await spool(Task)

        expect(fn_1.mock.results.length).toBe(0)
        expect(warned_1.mock.calls.length).toBe(7)
    })
    test(`2: Errors in Tasks causes shortcircuit`, async () => {
        const warned_1 = warned()

        const O$ = stream()
        const fn_1 = jest.fn(x => x)
        O$.subscribe(map(fn_1))

        const spool = multiplex(O$)
        const Task = [ cmd_s_a_0fn2P_2pri, cmd_s_a_1fn2P_boo, cmd_r_2fn_yay, cmd_e_3fn_err ]

        await spool(Task)

        expect(warned_1.mock.calls.length).toBe(1) // doesn't warn after error
        expect(fn_1.mock.results.length).toBe(1)
        expect(fn_1.mock.results[0].value).toMatchObject({ args: 2, sub$: "cmd_s_a_0fn2P_2pri" })
    })
    test(`2: Basic accumulation with a single dispatch`, async () => {
        const O$ = stream()
        const fn_1 = jest.fn(x => x)
        O$.subscribe(map(fn_1))

        const spool = multiplex(O$)
        const Task = [
            cmd_a_obj, // { key: "lorem" }
            cmd.a_async, // async x => await a_P(x)
            cmd_s_a_1fn2P_2obj // A => a_P({ key: A.key + " -> a_1fn2P_2obj" }) }
        ]

        await spool(Task)

        expect(fn_1.mock.results.length).toBe(1)
        expect(fn_1.mock.results[0].value).toMatchObject({
            args : { key: "lorem  -> a_1fn2P_2obj" },
            sub$ : "cmd_s_a_1fn2P_2obj"
        })
    })
    test(`3: Subtask with a single dispatch`, async () => {
        const O$ = stream()
        const fn_1 = jest.fn(x => x)
        O$.subscribe(map(fn_1))
        const spool = multiplex(O$)

        const SUBTASK = ({ key }) => [ { [CMD_ARGS]: ({ key }) => ({ key: key + "-> SUBTASK was here!" }) } ]

        const Task = [
            cmd_a_obj, // { key: "lorem" }
            cmd.a_async, // async x => await a_P(x)
            SUBTASK,
            cmd_s_a_1fn2P_2obj // A => a_P({ key: A.key + " -> a_1fn2P_2obj" }) }
        ]

        await spool(Task)

        expect(fn_1.mock.results.length).toBe(1)
        expect(fn_1.mock.results[0].value).toMatchObject({
            args : { key: "lorem -> SUBTASK was here! -> a_1fn2P_2obj" },
            sub$ : "cmd_s_a_1fn2P_2obj"
        })
    })
    test(`4: Primitives aren't dispatched`, async () => {
        const warned_1 = warned()

        const O$ = stream()
        const fn_1 = jest.fn(x => x)
        O$.subscribe(map(fn_1))
        const spool = multiplex(O$)

        const Task = [
            cmd_a_obj, // { args: { key: "lorem" } }
            cmd_a_prim, // { args: 2 } -> warn => no dispatch
            cmd.a_async, // { args: async x => await a_P(x) } -> no dispatch
            { [CMD_SUB$]: "noop", [CMD_ARGS]: x => x }
        ]

        await spool(Task)

        expect(warned_1.mock.calls.length).toBe(1) // doesn't warn after error
        expect(fn_1.mock.results.length).toBe(1)
        expect(fn_1.mock.results[0].value).toMatchObject({
            args : { key: "lorem " }, // initial reduce(fn, {}) empty accumulator remains
            sub$ : "noop"
        })
    })
})

//const mock_fn = jest.fn(x => x + "holio" )
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
