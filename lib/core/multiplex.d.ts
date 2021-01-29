import { Subscription, PubSub } from '@thi.ng/rstream';
export declare const run$: PubSub<any, any>;
export declare const out$: PubSub<any, any>;
export declare const command$: Subscription<any, any>;
export declare const task$: Subscription<any, any>;
export declare const log$: Subscription<any, any>;
export declare function multiplex(task_array: any): any;
