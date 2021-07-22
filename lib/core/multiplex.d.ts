import { PubSub, ISubscription } from "@thi.ng/rstream";
export declare const keys_match: (C: any) => string;
export declare const processArgs: (acc: any, args: any) => any;
export declare const handlePattern: (acc?: {}, C?: {
    sub$: any;
    args: any;
    reso: any;
    erro: any;
}, O$?: PubSub<unknown, unknown, any>, i?: number) => Promise<any>;
export declare const multiplex: (_out$: any) => (task_array: any) => any;
export declare const run$: PubSub<unknown, unknown, boolean>;
export declare const out$: PubSub<unknown, unknown, any>;
export declare const cmd$: ISubscription<unknown, unknown>;
export declare const task$: ISubscription<unknown, any>;
