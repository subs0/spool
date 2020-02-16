import { CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO, Command } from "@-0/keys";
export declare const supplement$CMD: any;
export declare const registerCMD: (command?: Command) => {
    [CMD_SUB$]: any;
    [CMD_ARGS]: any;
    [CMD_RESO]: any;
    [CMD_ERRO]: any;
} | {
    [CMD_SUB$]: any;
    [CMD_ARGS]: any;
    reso?: undefined;
    erro?: undefined;
};
