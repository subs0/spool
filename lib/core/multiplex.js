import { __awaiter } from "tslib";
import { isFunction, isArray } from "@thi.ng/checks";
import { pubsub } from "@thi.ng/rstream";
import { EquivMap } from "@thi.ng/associative";
import { CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO, CMD_WORK } from "@-0/keys";
import { stringify_type, xKeyError, key_index_err, diff_keys, stringify_fn } from "@-0/utils";
const err_str = "🔥 Command Dispatch Interrupted 🔥";
const noSubEr = (c, i) => `
${err_str}

 >> No \`${CMD_SUB$}\` included for a Command with primitive \`${CMD_ARGS}\` <<

Ergo, nothing was done with this Command: 

${stringify_fn(c)}

${(i && key_index_err(c, i)) || ""}

Hope that helps!

`;
const noEroEr = (c, i) => `
${err_str}

>> Unhandled Error 

This Command:

${stringify_fn(c)}

resulted in an error, but no ${CMD_ERRO} (error) handler was included

${(i && key_index_err(c, i)) || ""}
Unhandled errors terminate Tasks by default

`;
const task_not_array_error = x => `
${err_str}

You may have:
1. Ran a Command that has no \`${CMD_ARGS}\` key and thus does nothing
2. Ran a Subtask - a unary Function that accepts an inter-Task accumulator 
    and returns an Array - outside of a Task and has thus starved

Please check this payload for issues:
${stringify_fn(x)}
`;
const no_args_error = (C, i = null) => `
${err_str}

You have ran a Command that has no \`${CMD_ARGS}\` key and thus does nothing

Please check this payload for issues:
${stringify_fn(C)}

${i ? key_index_err(C, i) : ""}
`;
const NA_keys = (c, i) => {
    const knowns = [CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO];
    const [_, unknown_kvs] = diff_keys(knowns, c);
    return xKeyError(err_str, c, unknown_kvs, i);
};
export const keys_match = C => new EquivMap([
    [[], "NO_ARGS"],
    [[CMD_SUB$], "NO_ARGS"],
    [[CMD_RESO], "NO_ARGS"],
    [[CMD_ERRO], "NO_ARGS"],
    [[CMD_RESO, CMD_SUB$], "NO_ARGS"],
    [[CMD_ERRO, CMD_SUB$], "NO_ARGS"],
    [[CMD_ERRO, CMD_RESO], "NO_ARGS"],
    [[CMD_ERRO, CMD_RESO, CMD_SUB$], "NO_ARGS"],
    [[CMD_ARGS], "A"],
    [[CMD_ARGS, CMD_ERRO], "AE"],
    [[CMD_ARGS, CMD_RESO], "AR"],
    [[CMD_ARGS, CMD_SUB$], "AS"],
    [[CMD_ARGS, CMD_ERRO, CMD_SUB$], "AES"],
    [[CMD_ARGS, CMD_ERRO, CMD_RESO], "AER"],
    [[CMD_ARGS, CMD_RESO, CMD_SUB$], "ARS"],
    [[CMD_ARGS, CMD_ERRO, CMD_RESO, CMD_SUB$], "AERS"]
]).get(Object.keys(C).sort()) || "UNKNOWN";
export const processArgs = (acc, args) => __awaiter(void 0, void 0, void 0, function* () {
    const args_type = stringify_type(args);
    switch (args_type) {
        case "PRIMITIVE":
        case "OBJECT":
        case "ERROR":
        case "ARRAY":
            return { args_type, args };
        case "BINARY":
        case "N-ARY":
            console.warn(`${CMD_ARGS} function arity !== 1: ${stringify_fn(args)}`);
        case "UNARY":
            return yield processArgs(acc, args(acc));
        case "PROMISE":
            let resolved = yield args.catch(e => e);
            return yield processArgs(acc, resolved);
        case "NULLARY":
            return yield processArgs(acc, args());
        default:
            return "UNDEFINED";
    }
});
const work_in_command_error = C => `${CMD_WORK} key found while running a Command
${stringify_fn(C)}
Check to make sure you've registered this Command ${C[CMD_SUB$] || ""}
using the \`registerCMD\` function
`;
export const handlePattern = (acc = {}, C = {
    [CMD_SUB$]: undefined,
    [CMD_ARGS]: undefined,
    [CMD_RESO]: undefined,
    [CMD_ERRO]: undefined,
}, O$ = out$, i = 0) => __awaiter(void 0, void 0, void 0, function* () {
    if (acc === null)
        return null;
    const K_M = keys_match(C);
    if (K_M === "NO_ARGS") {
        console.warn(no_args_error(C, i));
        return acc;
    }
    if (C[CMD_WORK]) {
        console.warn(work_in_command_error(C));
        return acc;
    }
    const _args = C[CMD_ARGS];
    const { args_type, args } = yield processArgs(acc, _args);
    const __R = K_M.includes("R") && C[CMD_RESO](acc, args);
    const __C = Object.assign(Object.assign({}, C), { [CMD_ARGS]: args });
    const __A = args_type === "OBJECT" && Object.assign(Object.assign({}, acc), args);
    const __RA = __R && Object.assign(Object.assign({}, acc), __R);
    let result = new EquivMap([
        [{ K_M, args_type: "UNKNOWN" }, () => (console.warn(NA_keys(C, i)), null)],
        [{ K_M, args_type: "OBJECT" }, () => __A],
        [{ K_M: `${!K_M.includes("S") && K_M}`, args_type: "PRIMITIVE" }, () => (console.warn(noSubEr(__C, i)), acc)],
        [{ K_M: `${K_M.includes("S") && K_M}`, args_type: "PRIMITIVE" }, () => (O$.next(__C), acc)],
        [{ K_M: `${K_M.includes("S") && K_M}`, args_type: "OBJECT" }, () => (O$.next(__C), __A)],
        [{ K_M: `${K_M.includes("R") && K_M}`, args_type }, () => __RA],
        [{ K_M: `${K_M.includes("RS") && K_M}`, args_type }, () => (O$.next(__R), __RA)],
        [{ K_M, args_type: "ERROR" }, () => (console.warn(noEroEr(__C, i)), null)],
        [{ K_M: `${K_M.includes("E") && K_M}`, args_type: "ERROR" }, () => C[CMD_ERRO](acc, args, O$)]
    ]).get({ K_M, args_type }) || null;
    return result && result();
});
export const multiplex = out$ => task_array => isArray(task_array)
    ? task_array.reduce((a, c, i) => __awaiter(void 0, void 0, void 0, function* () {
        let acc = yield a;
        if (isFunction(c)) {
            try {
                const queue = c(acc);
                queue.unshift({ [CMD_ARGS]: acc });
                return multiplex(out$)(queue);
            }
            catch (e) {
                console.warn(err_str, e);
                return;
            }
        }
        return yield handlePattern(acc, c, out$, i);
    }), Promise.resolve({}))
    : (() => {
        throw new Error(task_not_array_error(task_array));
    })();
export const run$ = pubsub({
    topic: x => !!x[CMD_ARGS],
    id: "run$_stream"
});
export const out$ = pubsub({
    topic: x => x[CMD_SUB$],
    id: "out$_stream"
});
export const cmd$ = run$.subscribeTopic(true, {
    next: x => out$.next(x),
    error: e => {
        console.warn("error in `cmd$` stream:", e);
        return false;
    }
}, { id: "cmd$_stream" });
export const task$ = run$.subscribeTopic(false, {
    next: multiplex(out$),
    error: e => {
        console.warn("error in `task$` stream:", e);
        return false;
    }
}, { id: "task$_stream" });
