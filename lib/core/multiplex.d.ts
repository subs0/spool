import { Subscription, PubSub } from "@thi.ng/rstream";
export declare const keys_match: (C: any) => string;
export declare const processArgs: (acc: any, args: any) => any;
export declare const handlePattern: (acc: any, C: any, out$?: {
    next: any;
}, i?: any) => Promise<any>;
export declare const multiplex: (out$: any) => (task_array: any) => any;
export declare const run$: PubSub<any, any>;
export declare const out$: PubSub<any, any>;
export declare const cmd$: Subscription<any, any>;
export declare const task$: Subscription<any, any>;
