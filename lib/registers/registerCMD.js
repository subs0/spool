import { map } from "@thi.ng/transducers";
import { isFunction } from "@thi.ng/checks";
import { stream } from "@thi.ng/rstream";
import { CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO, CMD_SRC$, CMD_WORK } from "@-0/keys";
import { xKeyError, diff_keys, stringify_fn } from "@-0/utils";
import { out$ } from "../core";
export const log$ = stream();
export const upstreamCMDInject$ = (cmd, downstream) => {
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
    const knowns = [CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO, CMD_SRC$, CMD_WORK];
    const [unknowns] = diff_keys(knowns, command);
    if (unknowns.length > 0) {
        throw new Error(xKeyError(err_str, command, unknowns, undefined));
    }
    if (src$)
        upstreamCMDInject$(command, out$);
    const CMD = reso
        ? {
            [CMD_SUB$]: sub$,
            [CMD_ARGS]: args,
            [CMD_RESO]: reso,
            [CMD_ERRO]: erro
        }
        : { [CMD_SUB$]: sub$, [CMD_ARGS]: args };
    const CMD_s = reso
        ? {
            [CMD_SUB$]: sub$,
            [CMD_ARGS]: stringify_fn(args),
            [CMD_RESO]: stringify_fn(reso),
            [CMD_ERRO]: stringify_fn(erro)
        }
        : { [CMD_SUB$]: sub$, [CMD_ARGS]: stringify_fn(args) };
    out$.subscribeTopic(sub$, {
        next: x => {
            log$.next(x);
            return work(x[CMD_ARGS]);
        },
        error: console.warn
    });
    return CMD;
};
