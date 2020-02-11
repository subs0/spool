import { pubsub } from "@thi.ng/rstream"

import {
  DOMContentLoaded$,
  DOMnavigated$,
  command$,
  popstate$,
  multiplex,
  registerRouterDOM,
  out$,
  run$,
  boot
} from "../lib/core"
import { registerCMD } from "../lib/commands"

export const test$ = pubsub({
  topic: x => x.cmd,
  id: "test$_stream"
})

const rhymes = obj =>
  Object.entries(obj).map(([stub, letters]) => letters.map(a => a + stub))

const WSRGX = /\s{2,}/g

export const limerickerize = cmd => ({ subj, bridge: b, ...remain }) => {
  const [r1, r2] = rhymes(remain)
  const res = `
    There once was a ${subj} from ${r1[0]}, 
    Who'd ${b[0]} ${r1[1]}. 
    ${b[1]} ${r2[0]}, 
    He'd ${b[2]} ${r2[1]}, 
    ${b[3]} ${r1[2]}
  `
  // console.log(res)
  test$.next({ cmd, res: res.replace(WSRGX, "") })
}

test("Command: basic", done => {
  test$.subscribeTopic("leeds", {
    next: x => (
      expect(x.res).toBe(
        `
          There once was a farmer from Leeds,
          Who'd swallowed a packet of seeds.
          It soon came to pass,
          He'd be covered with grass,
          Yet has all the tomatoes he needs
        `.replace(WSRGX, "")
      ),
      done()
    ),
    error: done
  })
  run$.next(LEEDS)
})

const LEEDS = registerCMD({
  sub$: "LEEDS",
  args: {
    subj: "farmer",
    eeds: ["L", "s", "n"],
    ass: ["p", "gr"],
    bridge: [
      "swallowed a packet of",
      "It soon came to",
      "be covered with",
      "Yet has all the tomatoes he"
    ]
  },
  work: limerickerize("leeds")
})

test("Task: basic", done => {
  test$.subscribeTopic("kanass", {
    next: x => (
      expect(x.res).toBe(
        `
          There once was a miser from Mass,  
          Who'd drink rain falling onto his grass.  
          In stormy weather,  
          He'd be light as a feather,  
          but be covered with cups made of brass 
        `.replace(WSRGX, "")
      ),
      done()
    ),
    error: done
  })

  run$.next([LEEDS, KANASS])
})

const KANASS = registerCMD({
  sub$: "KANASS",
  args: ({ ass, bridge }) => ({
    subj: "miser",
    ass: ["M", ass[1], "br", ass[0]],
    eather: ["w", "f"],
    bridge: [
      "drink rain falling onto his",
      "In stormy",
      "be light as a",
      `but ${bridge[2]} cups made of`
    ]
  }),
  work: limerickerize("kanass")
})

test("Task: accumulated values", done => {
  test$.subscribeTopic("acc", {
    next: x => (
      expect(x.res).toStrictEqual({
        subj: "miser",
        eeds: ["L", "s", "n"],
        ass: ["M", "gr", "br", "p"],
        bridge: [
          "drink rain falling onto his",
          "In stormy",
          "be light as a",
          "but be covered with cups made of"
        ],
        eather: ["w", "f"]
      }),
      done()
    ),
    error: done
  })

  run$.next([LEEDS, KANASS, ACC])
})

const ACC = registerCMD({
  sub$: "ACC",
  args: x => x,
  work: x => test$.next({ cmd: "acc", res: x })
})
