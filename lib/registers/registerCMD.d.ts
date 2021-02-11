import { Subscription } from "@thi.ng/rstream";
import { CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO, Command } from "@-0/keys";
export declare const log$: Subscription<any, any>;
export declare const forwardUpstreamCMD$: any;
export declare const registerCMD: (command?: Command) => {
    sub$: any;
    args: any;
    reso: any;
    erro: any;
} | {
    sub$: any;
    args: any;
    reso?: undefined;
    erro?: undefined;
};
