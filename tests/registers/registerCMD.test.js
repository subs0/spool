import { stream } from "@thi.ng/rstream"
import { CMD_SUB$, CMD_ARGS, CMD_RESO, CMD_ERRO, CMD_SRC$, CMD_WORK } from "@-0/keys"

import { log$, registerCMD } from "../../src/registers"
import { run$, out$ } from "../../src/core"

const acc_init = { key: "bloop" }
const warned = (x = jest.fn()) => (jest.spyOn(console, "warn").mockImplementation(x), x)

const args = { fire: "🔥" }

describe(`registerCMD:`, () => {
    test(`1: Command registration returns Command without \`${CMD_WORK}\` side-effect handler`, async () => {
        const TEST = registerCMD({
            [CMD_SUB$] : "TEST",
            [CMD_ARGS] : args,
            [CMD_WORK] : x => x
        })

        expect(TEST).toMatchObject({
            [CMD_SUB$] : "TEST",
            [CMD_ARGS] : args
        })
    })
    test(`2: run$'ing a Command triggers \`${CMD_WORK}\` side-effect handler`, async () => {
        const relay = jest.fn(x => x)
        const cb = ({ fire }) => {
            relay({ rocket: fire + "🚀" })
        }

        const TEST2 = registerCMD({
            [CMD_SUB$] : "TEST2",
            [CMD_ARGS] : args,
            [CMD_WORK] : cb
        })

        await run$.next(TEST2)

        expect(relay.mock.results.length).toBe(1)
        expect(relay.mock.results[0].value).toMatchObject({ rocket: "🔥🚀" })
    })
    test(`3: Upstream \`${CMD_SRC$}\` injection triggers side-effect handler`, async () => {
        const s$ = stream()
        const relay = jest.fn(x => x)
        const cb = ({ fire }) => {
            relay({ rocket: fire + "🚀" })
        }

        const TEST3 = registerCMD({
            [CMD_SUB$] : "TEST3",
            [CMD_ARGS] : args,
            [CMD_WORK] : cb,
            [CMD_SRC$] : s$
        })

        await s$.next(TEST3)

        expect(relay.mock.results.length).toBe(1)
        expect(relay.mock.results[0].value).toMatchObject({ rocket: "🔥🚀" })
    })
    test(`4: Attempting to register a Command with unknown key(s) throw Error`, async () => {
        const cb = jest.fn(({ fire }) => ({ rocket: fire + "🚀" }))

        const TEST4 = () =>
            registerCMD({
                [CMD_SUB$] : "TEST4",
                [CMD_ARGS] : args,
                [CMD_WORK] : cb,
                unknownKey : "breaks stuff"
            })

        expect(TEST4).toThrow(Error)
    })
    test(`5: registering without \`${CMD_WORK}\` && \`${CMD_SRC$}\` keys throws Error`, async () => {
        const TEST5 = () =>
            registerCMD({
                [CMD_SUB$] : "TEST5",
                [CMD_ARGS] : args
            })

        expect(TEST5).toThrow(Error)
    })
    test(`6: registering a Command with computed destructured properties gives a warning`, async () => {
        const key = "computed"
        const relay = jest.fn(x => x)
        const cb = ({ [key]: fir, launch }) => {
            relay({ rocket: fir + "🚀" })
        }

        const TEST6 = registerCMD({
            [CMD_SUB$] : "TEST6",
            [CMD_ARGS] : args,
            [CMD_WORK] : cb
        })

        await run$.next(TEST6)

        expect(relay.mock.results.length).toBe(1)
        expect(relay.mock.results[0].value).toMatchObject({ rocket: "🔥🚀" })
    })
})
