import { CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO } from "@-0/keys";
import { xKeyError, key_index_err, diff_keys, stringify_fn } from "@-0/utils";
export const err_str = "🔥 Command Dispatch Interrupted 🔥";
export const noSubEr = (c, i) => `
${err_str}

 >> No \`${CMD_SUB$}\` included for a Command with primitive \`${CMD_ARGS}\` <<

Ergo, nothing was done with this Command: 

${stringify_fn(c)}

${(i && key_index_err(c, i)) || ""}

Hope that helps!

`;
export const noEroEr = (c, i) => `
${err_str}

>> Unhandled Error 

This Command:

${stringify_fn(c)}

resulted in an error, but no ${CMD_ERRO} (error) handler was included

${(i && key_index_err(c, i)) || ""}
Unhandled errors terminate Tasks by default

`;
export const task_not_array_error = x => `
${err_str}

You may have:
1. Ran a Command that has no \`${CMD_ARGS}\` key and thus does nothing
2. Ran a Subtask - a unary Function that accepts an inter-Task accumulator 
    and returns an Array - outside of a Task and has thus starved

Please check this payload for issues:
${stringify_fn(x)}
`;
export const no_args_error = (C, i = null) => `
${err_str}

You have ran a Command that has no \`${CMD_ARGS}\` key and thus does nothing

Please check this payload for issues:
${stringify_fn(C)}

${i ? key_index_err(C, i) : ""}
`;
export const NA_keys = (c, i) => {
    const knowns = [CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO];
    const [_, unknown_kvs] = diff_keys(knowns, c);
    return xKeyError(err_str, c, unknown_kvs, i);
};
