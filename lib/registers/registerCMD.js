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
            console.warn(`error from upstream \`${CMD_SRC$}\`: ${upstream.id}:`, e);
            return false;
        },
    });
};
const err_str = "command Registration `registerCMD`";
const no_work_error = cmd => `
Error registering 
${stringify_fn(cmd)}
Commands with no \`${CMD_WORK}\` handler 
can/need not be registered:

\`${CMD_WORK}\`: registers side-effecting handlers

Without the \`${CMD_WORK}\` handler, nothing will be done 
when this Command is triggered.

if your Command is for data acquisition/transformation only, 
you can, e.g., run$.next(${cmd}) without registration.
`;
const warnOnIncongruentInput = (work_params, sub$) => (args, CMD) => {
    const args_params = Object.keys(args);
    let missing = work_params.reduce((a, c) => (args_params.some(x => x === c) ? a : a.concat(c)), []);
    if (!missing.length)
        return;
    console.warn(`Command { \`${CMD_SUB$}\`: '${sub$}' } missing argument${missing.length === 1 ? "" : "s"} specified by its \`${CMD_WORK}\` handler: ${missing.map(x => `\`${x}\``)}

${stringify_fn(CMD, 2)}
        `);
};
export const registerCMD = (command, dev = true) => {
    const sub$ = command[CMD_SUB$];
    if (out$.topics.has(sub$)) {
        console.warn(`⚠ REGISTRATION FAILED: ${CMD_SUB$}: ${sub$} already registered! ⚠`);
        return null;
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
