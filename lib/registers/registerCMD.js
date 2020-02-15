import { map } from "@thi.ng/transducers";
import { isFunction } from "@thi.ng/checks";
import { CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO, CMD_SRC$, CMD_WORK } from "@-0/keys";
import { command$, out$ } from "../core";
import { xKeyError, diff_keys } from "@-0/utils";
export const supplement$CMD = (cmd, to$) => {
    const sup$ = cmd[CMD_SRC$];
    const sub$ = cmd[CMD_SUB$];
    const args = cmd[CMD_ARGS];
    const isFn = isFunction(args);
    const load = (x = null) => ({ [CMD_SUB$]: sub$, [CMD_ARGS]: x ? args(x) : args });
    const xport = $ => map(x => $.next(isFn ? load(x) : load()));
    return sup$.subscribe(xport(to$));
};
const err_str = "command Registration `registerCMD`";
export const registerCMD = (command = null) => {
    const sub$ = command[CMD_SUB$];
    const args = command[CMD_ARGS];
    const erro = command[CMD_ERRO];
    const reso = command[CMD_RESO];
    const src$ = command[CMD_SRC$];
    const work = command[CMD_WORK];
    const knowns = [CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO, CMD_SRC$, CMD_WORK];
    const [unknowns] = diff_keys(knowns, command);
    if (unknowns.length > 0) {
        throw new Error(xKeyError(err_str, command, unknowns, sub$, undefined));
    }
    if (src$)
        supplement$CMD(command, command$);
    out$.subscribeTopic(sub$, { next: work, error: console.warn }, map(puck => puck[CMD_ARGS]));
    const CMD = reso
        ? {
            [CMD_SUB$]: sub$,
            [CMD_ARGS]: args,
            [CMD_RESO]: reso,
            [CMD_ERRO]: erro
        }
        : { [CMD_SUB$]: sub$, [CMD_ARGS]: args };
    return CMD;
};
