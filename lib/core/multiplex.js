var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { isFunction, isPromise, isArray } from "@thi.ng/checks";
import { pubsub } from "@thi.ng/rstream";
import { EquivMap } from "@thi.ng/associative";
import { CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO } from "@-0/keys";
import { stringify_type, xKeyError, key_index_err, diff_keys, stringify_fn } from "@-0/utils";
import { getIn } from "@thi.ng/paths";
const log = console.log;
const err_str = "🔥 Multiplex Spooling Interrupted 🔥";
const nosub$_err = (c, i) => console.warn(`
${err_str}

 >> No \`${CMD_SUB$}\` included for a Command with primitive \`${CMD_ARGS}\` <<

Ergo, nothing was done with this Command: 

${stringify_fn(c)}

${key_index_err(c, i)}

Hope that helps!

`);
const task_not_array_error = x => `
${err_str}

You may have:
1. Ran a Command that has no \`${CMD_ARGS}\` key and thus does nothing
2. Ran a Subtask - a unary Function that accepts an inter-Task accumulator 
    and returns an Array - outside of a Task and has thus starved

Please check this payload for issues:
${stringify_fn(x)}
`;
const no_args_error = (C, i) => `
${err_str}

You have ran a Command that has no \`${CMD_ARGS}\` key and thus does nothing

Please check this payload for issues:
${stringify_fn(C)}

//${key_index_err(C, i)}
`;
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
    [[CMD_ARGS, CMD_ERRO, CMD_SUB$], "AER"],
    [[CMD_ARGS, CMD_ERRO, CMD_RESO], "AES"],
    [[CMD_ARGS, CMD_RESO, CMD_SUB$], "ARS"],
    [[CMD_ARGS, CMD_ERRO, CMD_RESO, CMD_SUB$], "AERS"]
]).get(Object.keys(C).sort()) || "UNKNOWN";
export const process_args = (acc, args) => __awaiter(void 0, void 0, void 0, function* () {
    const args_type = stringify_type(args);
    switch (args_type) {
        case "PRIMITIVE":
        case "OBJECT":
        case "ARRAY":
            return args;
        case "UNARY":
            return yield process_args(acc, args(acc));
        case "PROMISE":
            let resolved = yield args.catch(e => e);
            return yield process_args(acc, resolved);
        case "NULLARY":
            return yield process_args(acc, args());
        default:
            return "UNDEFINED";
    }
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
        const props_type = keys_match(c);
        if (props_type === "NO_ARGS") {
            console.warn(no_args_error(c, i));
            return (acc = null);
        }
        const sub$ = c[CMD_SUB$];
        const args = c[CMD_ARGS];
        const erro = c[CMD_ERRO];
        const reso = c[CMD_RESO];
        const knowns = [CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO];
        const [unknowns, unknown_kvs] = diff_keys(knowns, c);
        if (unknowns.length > 0)
            throw new Error(xKeyError(err_str, c, unknown_kvs, sub$, i));
        const arg_type = stringify_type(args);
        let result = args;
        if (arg_type === "PRIMITIVE" && !sub$) {
            nosub$_err(c, i);
            return acc;
        }
        if (arg_type === "OBJECT") {
            if (!sub$)
                return Object.assign(Object.assign({}, acc), args);
            out$.next(c);
            return Object.assign(Object.assign({}, acc), args);
        }
        if (arg_type === "NULLARY") {
            result = args();
            console.log(`dispatching to ad-hoc stream: ${sub$.id}`);
            sub$.next(result);
            return acc;
        }
        if (arg_type !== "PROMISE" && reso)
            result = Promise.resolve(args);
        if (arg_type === "PROMISE")
            result = yield args.catch(e => e);
        if (arg_type === "UNARY") {
            let temp = args(acc);
            result = isPromise(temp) ? yield temp.catch(e => e) : temp;
        }
        if (result instanceof Error) {
            if (reso) {
                if (erro) {
                    const err_type = stringify_type(erro);
                    if (err_type === "NULLARY") {
                        let ERR = erro();
                        if (getIn(ERR, [CMD_SUB$]))
                            out$.next(ERR);
                        return acc;
                    }
                    if (getIn(erro, [CMD_SUB$]))
                        out$.next(erro);
                    if (err_type === "BINARY") {
                        if (getIn(erro(), [CMD_SUB$])) {
                            let ERR_CMD = erro(acc, result);
                            out$.next(ERR_CMD);
                        }
                        acc = erro(acc, result);
                    }
                }
                acc = null;
            }
            acc === null || console.warn(`no \`erro\` (Error) handler set for ${sub$ || "error"} ${result}`);
            return acc;
        }
        if (reso) {
            let resolved = reso(acc, result);
            if (getIn(resolved, [CMD_SUB$]))
                return out$.next(resolved);
            result = resolved;
        }
        if (result === Object(result) && !sub$)
            return Object.assign(Object.assign({}, acc), result);
        if (result !== Object(result)) {
            if (!sub$) {
                nosub$_err(c, i);
                return acc;
            }
            out$.next({ [CMD_SUB$]: sub$, [CMD_ARGS]: result });
            return acc;
        }
        out$.next({ [CMD_SUB$]: sub$, [CMD_ARGS]: result });
        return Object.assign(Object.assign({}, acc), result);
    }), Promise.resolve({}))
    : (() => {
        throw new Error(task_not_array_error(task_array));
    })();
export const run$ = pubsub({
    topic: x => !!x[CMD_ARGS],
    id: "run$_stream",
    equiv: (res, tpc) => res === tpc || tpc == "_TRACE_STREAM"
});
export const out$ = pubsub({
    topic: x => x[CMD_SUB$],
    id: "out$_stream",
    equiv: (res, tpc) => res === tpc || tpc == "_TRACE_STREAM"
});
export const cmd$ = run$.subscribeTopic(true, {
    next: x => out$.next(x),
    error: console.warn
}, { id: "cmd$_stream" });
export const task$ = run$.subscribeTopic(false, {
    next: multiplex(out$),
    error: console.warn
}, { id: "task$_stream" });
