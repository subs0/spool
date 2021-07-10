import { ISubscribable, Subscription, ISubscription, PubSub } from "@thi.ng/rstream";
import { Command, ICommand } from "@-0/keys";
export declare const log$: Subscription<any, any>;
export declare const forwardUpstreamCMD$: (command: Command, downstream: PubSub<any>) => ISubscription<any, any>;
export declare const registerCMD: (command?: ICommand, dev?: boolean) => {
    sub$: string;
    args: any;
    reso: (acc: {}, res: {}) => any;
    erro: (acc: {}, err: Error, out$: ISubscribable<any>) => any;
} | {
    sub$: string;
    args: any;
    reso?: undefined;
    erro?: undefined;
};
