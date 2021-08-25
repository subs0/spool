import { ICommand, ICommandObject } from "@-0/keys";
export declare const log$: import("@thi.ng/rstream").Stream<unknown>;
export declare const forwardUpstreamCMD$: (command: any, downstream: any) => any;
export declare const registerCMD: (command: ICommand, dev?: boolean) => ICommandObject;
