import { CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO, Command } from "@-0/keys";
export declare const supplement$CMD: any;
export declare const registerCMD: (command?: Command) => {
    [CMD_SUB$]: string;
    [CMD_ARGS]: any;
    [CMD_RESO]: (acc: Object, res: Object) => any;
    [CMD_ERRO]: (acc: Object, err: Error) => any;
} | {
    [CMD_SUB$]: string;
    [CMD_ARGS]: any;
    reso?: undefined;
    erro?: undefined;
};
