import { isObject } from "@thi.ng/checks";
import { parse } from "@-0/utils";
import { set$$tateHOC } from "../commands";
import { registerCMDtoStore } from "../registers";
import { $$_PATH, URL_FULL, URL_DATA, URL_PATH, URL_PAGE, ROUTER_PREP, ROUTER_POST, ROUTER_PRFX, CFG_RUTR, CMD_ARGS, CMD_RESO, CMD_ERRO, STATE_DATA, STATE_PATH } from "@-0/keys";
import { $store$ } from "../store";
export const URL__ROUTE = (CFG, store = $store$) => {
    let router, preroute, postroute, prefix;
    if (isObject(CFG)) {
        const ruts = CFG[CFG_RUTR];
        const prep = CFG[ROUTER_PREP];
        const post = CFG[ROUTER_POST];
        const prfx = CFG[ROUTER_PRFX] || null;
        const escRGX = /[-/\\^$*+?.()|[\]{}]/g;
        const escaped = string => string.replace(escRGX, "\\$&");
        router = ruts;
        preroute = isObject(prep) ? [prep] : prep || [];
        postroute = isObject(post) ? [post] : post || [];
        prefix = prfx ? new RegExp(escaped(prfx), "g") : null;
    }
    else {
        router = CFG;
        preroute = [];
        postroute = [];
        prefix = null;
    }
    const _SET_STATE = registerCMDtoStore(store)(set$$tateHOC);
    const task = acc => [
        ...preroute,
        {
            [CMD_ARGS]: prefix ? router(acc[URL_FULL].replace(prefix, "")) : router(acc[URL_FULL]),
            [CMD_RESO]: (_acc, _res) => ({
                [URL_PAGE]: _res[URL_PAGE],
                [URL_DATA]: _res[URL_DATA]
            }),
            [CMD_ERRO]: (_acc, _err) => console.warn("Error in URL__ROUTE:", _err, "constructed:", _acc)
        },
        {
            [CMD_ARGS]: prefix ? parse(acc[URL_FULL], prefix) : parse(acc[URL_FULL])
        },
        Object.assign(Object.assign({}, _SET_STATE), { [CMD_ARGS]: _acc => ({
                [STATE_DATA]: _acc[URL_PATH],
                [STATE_PATH]: [$$_PATH]
            }) }),
        ...postroute
    ];
    return [task, _SET_STATE];
};
