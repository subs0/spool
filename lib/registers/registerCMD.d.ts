import { ICommand } from "@-0/keys";
export declare const log$: import("@thi.ng/rstream").Stream<unknown>;
export declare const forwardUpstreamCMD$: (command: any, downstream: any) => any;
export declare const registerCMD: (command: ICommand, dev?: boolean) => Partial<{
    work: (args: any) => any;
    src$: import("@thi.ng/rstream").ISubscriber<any> | import("@thi.ng/rstream").ISubscribable<any>;
    args: any;
    sub$: string;
    reso: (acc: import("@-0/keys").Accumulator, res: any) => any;
    erro: (acc: import("@-0/keys").Accumulator, err: Error, out$: import("@thi.ng/rstream").PubSub<unknown, unknown, any>) => any;
}> | {
    sub$: string;
    args: any;
    reso: (acc: import("@-0/keys").Accumulator, res: any) => any;
    erro: (acc: import("@-0/keys").Accumulator, err: Error, out$: import("@thi.ng/rstream").PubSub<unknown, unknown, any>) => any;
} | {
    sub$: string;
    args: any;
    reso?: undefined;
    erro?: undefined;
};
