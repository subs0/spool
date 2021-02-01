var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { isFunction, isPromise } from "@thi.ng/checks";
import { pubsub } from "@thi.ng/rstream";
import { CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO, CMD_SRC$, CMD_WORK } from "@-0/keys";
import { stringify_type, xKeyError, key_index_err, diff_keys } from "@-0/utils";
import { getIn } from "@thi.ng/paths";
const log = console.log;
export const run$ = pubsub({
    topic: x => !!x[CMD_SUB$],
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
    next: multiplex,
    error: console.warn
}, { id: "task$_stream" });
const err_str = "Spooling Interupted";
const nosub$_err = (c, i) => console.warn(`
🔥 No sub$ included for a Command with a primitive for 'args'. 

Ergo, nothing was done with this Command: 

${JSON.stringify(c)}

${key_index_err(c, i)}

Hope that helps!
  `);
export function multiplex(task_array) {
    return task_array.reduce((a, c, i) => __awaiter(this, void 0, void 0, function* () {
        let acc = yield a;
        if (isFunction(c)) {
            try {
                const recur = c(acc);
                recur.unshift({ [CMD_ARGS]: acc });
                return multiplex(recur);
            }
            catch (e) {
                console.warn(err_str, e);
                return;
            }
        }
        const sub$ = c[CMD_SUB$];
        const args = c[CMD_ARGS];
        const erro = c[CMD_ERRO];
        const reso = c[CMD_RESO];
        const knowns = [CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO, CMD_SRC$, CMD_WORK];
        const [unknowns, unknown_kvs] = diff_keys(knowns, c);
        if (unknowns.length > 0)
            throw new Error(xKeyError(err_str, c, unknown_kvs, sub$, i));
        const arg_type = stringify_type(args);
        let result = args;
        if (args !== Object(args) && !sub$) {
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
            acc === null ||
                console.warn(`no \`erro\` (Error) handler set for ${sub$ || "error"} ${result}`);
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
    }), Promise.resolve({}));
}
