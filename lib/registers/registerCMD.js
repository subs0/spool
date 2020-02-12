import { map } from "@thi.ng/transducers";
import { isFunction } from "@thi.ng/checks";
import { getIn } from "@thi.ng/paths";
import { CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO, CMD_SRC$, CMD_WORK, $$_CMDS } from "@-0/keys";
import { command$, out$ } from "../core";
import { $store$ } from "../store";
import { xKeyError, stringify_w_functions, diff_keys } from "@-0/utils";
const feedCMD$fromSource$ = cmd => {
    const sub$ = cmd[CMD_SUB$];
    const args = cmd[CMD_ARGS];
    const isFn = isFunction(args);
    const deliver = x => ({ [CMD_SUB$]: sub$, [CMD_ARGS]: args(x) });
    const delivery = { [CMD_SUB$]: sub$, [CMD_ARGS]: args };
    const feed = $ => (isFn ? map(x => $.next(deliver(x))) : map(() => $.next(delivery)));
    return cmd[CMD_SRC$].subscribe(feed(command$));
};
const err_str = "command Registration `registerCMD`";
export const registerCMDtoStore = (store) => (command = null) => {
    if (!command)
        return getIn(store.deref(), $$_CMDS);
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
        feedCMD$fromSource$(command);
    out$.subscribeTopic(sub$, { next: work, error: console.warn }, map(puck => puck[CMD_ARGS]));
    const CMD = reso
        ? {
            [CMD_SUB$]: sub$,
            [CMD_ARGS]: args,
            [CMD_RESO]: reso,
            [CMD_ERRO]: erro
        }
        : { [CMD_SUB$]: sub$, [CMD_ARGS]: args };
    if (getIn(store.deref(), [$$_CMDS, sub$])) {
        throw new Error(`

    🔥 duplicate \`sub$\` value detected in Command:
    ${stringify_w_functions(CMD)}
    existing registered Commands:
    ${JSON.stringify(getIn(store.deref(), $$_CMDS), null, 2)}
    🔥 Please use a different/unique Command \`sub$\` string

    🔎 Inspect existing Commands using empty call: \`registerCMD()\`

      `);
    }
    store.swapIn($$_CMDS, x => (Object.assign(Object.assign({}, x), { [sub$.toString()]: CMD })));
    return CMD;
};
export const registerCMD = registerCMDtoStore($store$);
