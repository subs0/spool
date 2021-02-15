import { map } from "@thi.ng/transducers";
import { isFunction } from "@thi.ng/checks";
import { stream } from "@thi.ng/rstream";
import { CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO, CMD_SRC$, CMD_WORK } from "@-0/keys";
import { xKeyError, diff_keys, get_param_names } from "@-0/utils";
import { out$ } from "../core";
export const log$ = stream();
export const forwardUpstreamCMD$ = (cmd, downstream) => {
    const upstream = cmd[CMD_SRC$];
    const sub$ = cmd[CMD_SUB$];
    const args = cmd[CMD_ARGS];
    const isFn = isFunction(args);
    const load = (x = null) => ({ [CMD_SUB$]: sub$, [CMD_ARGS]: x ? args(x) : args });
    const xport = downstream => map(x => downstream.next(isFn ? load(x) : load()));
    return upstream.subscribe(xport(downstream));
};
const err_str = "command Registration `registerCMD`";
const no_work_or_src_error = `
Error registering ${CMD_SUB$}:
Commands with no \`${CMD_WORK}\` & no \`${CMD_SRC$}\` handler 
can/need not be registered:

- \`${CMD_WORK}\`: registers side-effecting handlers
- \`${CMD_SRC$}\`: registers upstream Command producers

if your Command is for data acquisition/transformation, 
you can run$.next(YOUR_COMMAND) without registration.
`;
export const registerCMD = (command = null) => {
    const sub$ = command[CMD_SUB$];
    const args = command[CMD_ARGS];
    const erro = command[CMD_ERRO];
    const reso = command[CMD_RESO];
    const src$ = command[CMD_SRC$];
    const work = command[CMD_WORK];
    if (!work && !src$) {
        throw new Error(no_work_or_src_error);
    }
    const known_CMD_props = [CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO, CMD_SRC$, CMD_WORK];
    const [unknown_CMD_props] = diff_keys(known_CMD_props, command);
    if (unknown_CMD_props.length > 0) {
        throw new Error(xKeyError(err_str, command, unknown_CMD_props, undefined));
    }
    if (src$)
        forwardUpstreamCMD$(command, out$);
    const sans_src = Object.assign(Object.assign({}, command), { [CMD_SRC$]: undefined });
    const work_params = get_param_names(work, sans_src);
    const param_warning = work_params.length
        ? args => {
            const args_params = Object.keys(args);
            let missing = work_params.reduce((a, c) => (args_params.some(x => x === c) ? a : a.concat(c)), []);
            if (!missing.length)
                return;
            console.warn(`Command { \`${CMD_SUB$}\`: '${sub$}' } missing argument${missing.length === 1
                ? ""
                : "s"} specified by its \`${CMD_WORK}\` handler: ${missing.map(x => `\`${x}\``)}`);
        }
        : false;
    const CMD = reso
        ? {
            [CMD_SUB$]: sub$,
            [CMD_ARGS]: args,
            [CMD_RESO]: reso,
            [CMD_ERRO]: erro
        }
        : { [CMD_SUB$]: sub$, [CMD_ARGS]: args };
    out$.subscribeTopic(sub$, {
        next: x => {
            param_warning && param_warning(x[CMD_ARGS]);
            log$.next(x);
            return work(x[CMD_ARGS]);
        },
        error: console.warn
    });
    return CMD;
};
