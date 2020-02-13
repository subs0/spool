import { CMD_SUB$, CMD_ARGS, CMD_WORK } from "@-0/keys";
export declare const createSetStateCMD: (store: any) => any;
export declare const SET_STATE: any;
export declare const set$$tateHOC: (store: any) => {
    [CMD_WORK]: (args: any) => any;
    [CMD_SUB$]: string;
    [CMD_ARGS]: (x: any) => any;
};
