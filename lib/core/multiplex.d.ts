import { PubSub, ISubscription } from "@thi.ng/rstream";
export declare const keys_match: (C: any) => string;
export declare const processArgs: (acc: any, args: any) => any;
export declare const handlePattern: (acc?: {}, C?: {
    sub$: any;
    args: any;
    reso: any;
    erro: any;
}, O$?: PubSub<any, any, any>, i?: number) => Promise<any>;
export declare const multiplex: (_out$: any) => (task_array: any) => any;
export declare const run$: PubSub<any, any>;
export declare const out$: PubSub<any, any>;
export declare const cmd$: ISubscription<any, any>;
export declare const task$: ISubscription<any, any>;
