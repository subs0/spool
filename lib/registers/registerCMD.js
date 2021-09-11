import { __rest } from "tslib";
import { isFunction } from "@thi.ng/checks";
import { stream } from "@thi.ng/rstream";
import { CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO, CMD_SRC$, CMD_WORK } from "@-0/keys";
import { xKeyError, diff_keys, stringify_fn } from "@-0/utils";
import { out$ } from "../core";
export const log$ = stream();
export const forwardUpstreamCMD$ = (command, downstream) => {
    const upstream = command[CMD_SRC$];
    const sub$ = command[CMD_SUB$];
    const args = command[CMD_ARGS];
    const isFn = isFunction(args);
    const load = (dynamic = false) => ({
        [CMD_SUB$]: sub$,
        [CMD_ARGS]: dynamic ? args(dynamic) : args,
    });
    return upstream.subscribe({
        next: x => {
            downstream.next(isFn ? load(x) : load());
        },
        error: e => {
            console.warn(`registerCMD (forwardUpstreamCMD$): Error from upstream \`${CMD_SRC$}\`: ${upstream.id}:`, e);
            return false;
        },
    });
};
const err_str = "command Registration `registerCMD`";
const no_work_error = cmd => {
    const _a = cmd, _b = CMD_SUB$, sub = _a[_b], no_sub = __rest(_a, [typeof _b === "symbol" ? _b : _b + ""]);
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
    `;
};
export const registerCMD = (command, dev = true) => {
    const sub$ = command[CMD_SUB$];
    if (out$.topics.has(sub$)) {
        console.warn(`⚠ REGISTRATION FAILED: ${CMD_SUB$}: ${sub$} already registered! ⚠`);
        return command;
    }
    const args = command[CMD_ARGS];
    const erro = command[CMD_ERRO];
    const reso = command[CMD_RESO];
    const src$ = command[CMD_SRC$];
    const work = command[CMD_WORK];
    if (!work)
        throw new Error(no_work_error(command));
    const known_CMD_props = [CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO, CMD_SRC$, CMD_WORK];
    const [unknown_CMD_props] = diff_keys(known_CMD_props, command);
    if (unknown_CMD_props.length > 0) {
        throw new Error(xKeyError(err_str, command, unknown_CMD_props, undefined));
    }
    if (src$)
        forwardUpstreamCMD$(command, out$);
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
        };
    out$.subscribeTopic(sub$, {
        next: x => {
            if (dev)
                log$.next(x);
            return work(x[CMD_ARGS]);
        },
        error: e => {
            console.warn("error in `out$` stream:", e);
            return false;
        },
    });
    return CMD;
};
