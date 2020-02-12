import { IAtom } from "@thi.ng/atom";
import { ISubscribable } from "@thi.ng/rstream";
export declare const supplement$CMD: (cmd: Object, to$: ISubscribable<any>) => import("@thi.ng/rstream").Subscription<any, any>;
export declare const registerCMDtoStore: (store: IAtom<any>) => (command?: Object) => any;
export declare const registerCMD: (command?: Object) => any;
