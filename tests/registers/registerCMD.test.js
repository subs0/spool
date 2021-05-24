import { stream } from "@thi.ng/rstream"
import { CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO, CMD_SRC$, CMD_WORK } from "@-0/keys"

import { log$, registerCMD } from "../../src/registers"
import { run$, out$ } from "../../src/core"

const warned = (x = jest.fn()) => (jest.spyOn(console, "warn").mockImplementation(x), x)

describe(`registerCMD:`, () => {
    test(`1: Command registration returns Command without \`${CMD_WORK}\` side-effect handler`, async () => {
        const TEST = registerCMD({
            [CMD_SUB$] : "TEST",
            [CMD_ARGS] : { fire: "🔥" },
            [CMD_WORK] : x => x
        })

        expect(TEST).toMatchObject({
            [CMD_SUB$] : "TEST",
            [CMD_ARGS] : { fire: "🔥" }
        })
    })
    test(`2: run$'ing a Command triggers \`${CMD_WORK}\` side-effect handler`, async () => {
        const relay = jest.fn(x => x)

        const TEST2 = registerCMD({
            [CMD_SUB$] : "TEST2",
            [CMD_ARGS] : { fire: "🔥" },
            [CMD_WORK] : ({ fire }) => relay({ rocket: fire + "🚀" })
        })

        await run$.next(TEST2)

        expect(relay.mock.results.length).toBe(1)
        expect(relay.mock.results[0].value).toMatchObject({ rocket: "🔥🚀" })
    })

    test(`3: Attempting to register a Command with unknown key(s) throw Error`, async () => {
        const TEST4 = () =>
            registerCMD({
                [CMD_SUB$] : "TEST3",
                [CMD_ARGS] : { fire: "🔥" },
                [CMD_WORK] : jest.fn(({ fire }) => ({ rocket: fire + "🚀" })),
                unknownKey : "breaks stuff"
            })

        expect(TEST4).toThrow(Error)
    })
    test(`4: registering without \`${CMD_WORK}\` && \`${CMD_SRC$}\` keys throws Error`, async () => {
        const TEST5 = () =>
            registerCMD({
                [CMD_SUB$] : "TEST4",
                [CMD_ARGS] : { fire: "🔥" }
            })

        expect(TEST5).toThrow(Error)
    })
    test(`5: POJO upstream \`${CMD_SRC$}\` injection triggers side-effect handler`, async () => {
        const s$ = stream({ id: "registerCMD/5" })
        const relay = jest.fn(x => x)

        const TEST3 = registerCMD({
            [CMD_SUB$] : "TEST5",
            [CMD_ARGS] : { fire: "🔥" }, //static = same payload every time
            [CMD_WORK] : ({ fire }) => relay({ rocket: fire + "🚀" }),
            [CMD_SRC$] : s$
        })

        await s$.next({ this_doesnt_matter: "💦" })

        expect(relay.mock.results.length).toBe(1)
        expect(relay.mock.results[0].value).toMatchObject({ rocket: "🔥🚀" })
    })
    test(`6: Functional upstream \`${CMD_SRC$}\` injection triggers side-effect handler`, async () => {
        const s$ = stream({ id: "registerCMD/6" })
        const relay = jest.fn(x => {
            //console.log({ s$: x })
            return x
        })

        const TEST3 = registerCMD({
            [CMD_SUB$] : "TEST6",
            [CMD_ARGS] : ({ this_will_be_transformed }) => {
                return { fire: this_will_be_transformed }
                console.log("thrown in this_will_be_transformed registerCMD/6:", x)
                throw new Error("funk!")
            },
            [CMD_WORK] : ({ fire }) => relay({ rocket: fire + "🚀" }),
            [CMD_SRC$] : s$
        })

        await s$.next({ this_will_be_transformed: "🔥" })

        expect(relay.mock.results.length).toBe(1)
        expect(relay.mock.results[0].value).toMatchObject({ rocket: "🔥🚀" })
    })
})
