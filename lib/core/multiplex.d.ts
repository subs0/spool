export declare const keys_match: (C: any) => string;
export declare const processArgs: (acc: any, args: any) => any;
export declare const handlePattern: (acc?: {}, C?: {
    sub$: any;
    args: any;
    reso: any;
    erro: any;
}, O$?: import("@thi.ng/rstream").PubSub<unknown, unknown, any>, i?: number) => Promise<any>;
export declare const multiplex: (_out$: any) => (task_array: any) => any;
export declare const run$: import("@thi.ng/rstream").PubSub<unknown, unknown, boolean>;
export declare const out$: import("@thi.ng/rstream").PubSub<unknown, unknown, any>;
export declare const cmd$: import("@thi.ng/rstream").ISubscription<unknown, unknown>;
export declare const task$: import("@thi.ng/rstream").ISubscription<unknown, any>;
