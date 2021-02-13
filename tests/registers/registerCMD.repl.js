let STRIP_COMMENTS = /(\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s*=[^,\)]*(('(?:\\'|[^'\r\n])*')|("(?:\\"|[^"\r\n])*"))|(\s*=[^,\)]*))/gm

let ARGUMENT_NAMES = /([^\s,]+)/g

let err_str = (name = "", comp = "") => `
@-0/utls > \`get_param_names\`: ${name}({ ${comp} })
Computed property names prevent static analysis of function
parameters. Consider using static destructuring instead

`

export function get_param_names(func) {
    let fnStr = func.toString().replace(STRIP_COMMENTS, "")
    let result = fnStr.slice(fnStr.indexOf("(") + 1, fnStr.indexOf(")")).match(ARGUMENT_NAMES)
    if (result === null) result = []
    let computed = result.map(x => x.replace(/{|}/g, "")).filter(x => x !== "")
    let done = []
    let warned = false
    computed.forEach((c, i, d) => {
        // if matching closing bracket `]`: delete next item in list
        if (c.match(/\]/g)) {
            d.splice(i + 1, 1)
            return
        }
        // if valid JS variable name, push
        if (c.match(/^[a-zA-Z_$][a-zA-Z_$0-9]*$/g)) {
            //d.splice(i + 1, 1)
            //d.splice
            return done.push(c)
        }
        // else warn and return
        if (warned) return
        console.log(err_str(func.name, c))
        return (warned = true) // done.push(c.match(/(?<=\[).+?(?=\])/g)[0])
    })
    return done
}

// TODO: implement into registerCMD -> check for unknown args -> throw

const CONST = "something"
// prettier-ignore

const func = ({ a, b = 1, [ CONST ]: c = "NA", [`${"hello world"}`]: x}, d) => {
    return `Hello ${a}!, my name is ${b}`
}

get_param_names(func) //?
// prettier-ignore

get_param_names(function({ a, 
    b, // bloop
    c, // bleep
    ["one" + 1]: x
}) {
    return `Hello ${a}!, my name is ${b}`
}) //?
