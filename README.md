# `spule`

Spule
~ Scottish: **[ˈspül]** variant of Spool
~ German: **[ˈʃpuːlə]** Coil, Reel

## Introduction: State MGMT and Side-Effects

All too often, state management (MGMT) is an "add-on", an
afterthought of a UI/API. However, you may realize by now -
if you've spent any significant time using the available
MGMT libraries - that state (and coupled effects) is the
most infuriating source of complexity and bugs in modern
JavaScript apps. Spule aims to be _far simpler_ than the
status quo by starting with a simple abstraction over the
hardest parts and working outwards to the easier ones.

## Getting Started

```
npm install spule
```

What if you could compose your app logic on an ad-hoc basis
without creating spagetthi code? Yes, it's possible and one
of the primary goals of `spule`

At it's core, `spule` is async-first. It allows you to write
your code using `async`/`await`/`Promises` in the most
painless and composable way you've ever seen. `spule` does
some stream-based
([FRP](https://en.wikipedia.org/wiki/Functional_reactive_programming))
gymnastics under the hood to correograph everything,
however, you won't have to worry about the implementation
details. `spule` aims at being approachable to those who
have zero experience with streams. Let's see some examples.

## Commands

At the core of `spule` is an async spooler (hence the name),
which recieves "Commands" and responds to them. We'll go
into more detail later, but let's jump right in with some
copy/paste examples.

Stupid Command example:

```js
// src/genie.js

import { run$, registerCMD } from "spule"

const GENIE = registerCMD({
  sub$: "GENIE",
  args: "your wish",
  work: x => console.log("🧞‍♀️:", x, "is my command")
})

// work handler is digested during registration

console.log(GENIE)

// => { sub$: "GENIE", args: "your wish" }

run$.next(GENIE)

//=> 🧞‍♀️: your wish is my command
```

`registerCMD` takes a config `Object`, attaches the `work`
callback to a pubsub stream for you and returns a Command
`Object` that you can use to trigger that callback
(subscription based on the Command `sub$` value).

This `Object` signature is not only handy as a means to
manage a lot of Commands, but it also avails `spule`'s
superpower: Tasks

## Tasks

Tasks, like Commands, are _just data_ (including Lambdas).
Commands are `Object`s and Tasks are `Array`s of Commands.
This allows them to be dis/reassembled and reused on an
ad-hoc basis. Let's compose our `GENIE` Command with an API
call...

```js
// src/genie.js (continued)

export const GET__FORTUNE = [
  // 1st Command args' Object initializes an accumulator
  { args: { api: "http://yerkee.com/api/fortune" } },

  // lambda args have access to the accumulation
  {
    args: ({ api }) => fetch(api).then(r => r.json()),
    reso: (acc, { fortune }) => ({ fortune }),
    erro: (acc, err) => ({ error: err })
  }
]

const FORTUNE__GENIE = [
  ...GET__FORTUNE,
  { ...GENIE, args: ({ fortune }) => fortune }
]

run$.next(FORTUNE__GENIE)

// => 🧞‍♀️: Deliver yesterday, code today, think tomorrow. is my command
```

# Logic as Data™

As you can see - within a Task - the only required key on a
Command `Object` is the `args` key, which provide the
signal-passing functionality between intra-Task Commands.
The only Command that actually does any `work` here is
`GENIE` (the one with a registered `sub$`).

> 🔍 UTH (Under the Hood): This intra-Task handoff works via
> an [async `reduce`](#TODO-link-to-code) function. Any
> `Object` returned by a Command is spread into an
> "accumulator" that can be accessed by any following
> Commands within a Task (via a unary Lambda in the `args`
> position).

Hopefully you get a sense of how handy this is already. Have
you ever wished you could pull out and pass around a `.then`
from one Promise chain to compose with another? Well, now
you - effectively - can. Not only can you recombine Promises
with Tasks, you can also recombine side-effecting code. This
is "Logic as Data"™

And, yes, it gets even better. It may be obvious that you
can de/compose or spread together Tasks (they're just
`Array`s). But, what if the shape/signature of your
"Subtask" doesn't match that of the Task that you'd like
spread it into?

### Subtasks

```js
// src/zoltar.js

import { run$, registerCMD } from "spule"

import { GET__FORTUNE } from "./genie"

const ZOLTAR = registerCMD({
  sub$: "ZOLTAR",
  args: { zoltar: "make your wish" },
  work: ({ zoltar }) => console.log("🧞‍♂️:", zoltar)
})

const TOM = registerCMD({
  sub$: "TOM",
  args: { tom: "👶: I wish I were big" },
  work: ({ tom }) => console.log(tom)
})

/**
 * use a unary function that takes the accumulator
 * Object and returns a Task
 */
const ZOLTAR__X = ({ zoltar }) => [
  { ...TOM, args: { tom: "🧒: I wish I was small again" } },
  { ...ZOLTAR, args: { zoltar } }
]

const BIG__MORAL = [
  ZOLTAR,
  TOM,
  { ...ZOLTAR, args: { zoltar: "your wish is granted" } },
  ...GET__FORTUNE,
  ({ fortune }) => ZOLTAR__X({ zoltar: fortune })
]

run$.next(BIG__MORAL)

//=> 🧞‍♂️: make your wish

//=> 👶: I wish I were big

//=> 🧞‍♂️: your wish is granted

//=> 🧒: I wish I was small again

//=> 🧞‍♂️: Growing old is mandatory; growing up is optional.
```

Just as using a unary `args` function in a Command allows
passing state between Commands, you can use a unary function
within a Task to pass state between Subtasks.

## Goodbye 🍝 Code!

This gives new meaning to the term "side-effect" as - in
`spule` - side-effects are kept **on the side** and _out of
the guts of your logic_. This frees you from the pain that
tight-coupling of state, side-effects and logic entails.
Every feature is **strongly decoupled** from the others
providing a DX that is versatile, modular and composable.

##### TODO: IMAGE(s) ♻ Framework Architecture

### Command Keys

| Key    | Type   | Role                                             | Required for |
| ------ | ------ | ------------------------------------------------ | ------------ |
| `args` | Any    | Command payload/accumulator transforming lambda  | always       |
| `sub$` | String | Pubsub stream topic: connects Command to handler | `work`       |
| `work` | Lambda | dispatch side-effects/state-updates on Command   | "work"       |
| `reso` | Lambda | Promise `args` resolution handler                | Promises     |
| `erro` | Lambda | Promise `args` rejection handler                 | Promises     |
| `src$` | Stream | Upstream/source stream ([advanced](#advanced))   | optional     |

## The `SET_STATE` Command (built-in)

TODO

### Shorthand Symbols Glossary (`spule` surface grammar)

Now that we've seen some examples of Commands and Tasks in use, we'll use a shorthand syntax for describing Task/Command signatures as a compact conveyance when convenient.

| Symbol              | Description                               |
| ------------------- | ----------------------------------------- |
| `{C}`               | Command `Object`                          |
| `{*}`               | `Object`                                  |
| `#`                 | Primitive value (boolean, string, number) |
| `{?}`               | Promise                                   |
| `{A}`               | Accumulator `Object`                      |
| `(*) =>`            | Lambda with any number of parameters      |
| `(+) =>`            | Non-nullary lambda                        |
| `(1) =>`            | Unary lambda                              |
| `(0) =>`            | Nullary lambda (aka "thunk")              |
| `[{C},,]` or `[T]`  | Task                                      |
| `[,,T,,]` or `[sT]` | Subtask                                   |

## Router

One of the things that can be really frustrating to users of
some frameworks is either the lack of a built-in router or
one that seems tacked-on after the fact. `spule` was built
with the router in mind.

`spule` provides two routers:

1. A DOM router (for clients/SPAs)
2. a data-only router (for servers/Node).

> 🔍 UTH: The DOM router is built on top of the data-only
> router. Both are implemented as Tasks.

### URL = Lens

What is a URL? It's really just a path to a specific
resource or collection of resources. Before the glorious age
of JavaScript, this - in fact - was _the only way_ you could
access the Internet. You typed in a URL, which pointed to
some file within a directory stored on a computer at some
specific address.

Taking queues from the best parts of functional programming,
`spule`'s router is really just a
[lens](https://medium.com/javascript-scene/lenses-b85976cb0534)
into the application state. As natural as URLs are to remote
resources, this router accesses local memory using
[paths](http://thi.ng/paths)

At it's core the `spule` router doesn't do very much. It
relies on a JavaScript `Map` implementation that retains the
`Map` API, but has [value
semantics](https://en.wikipedia.org/wiki/Value_semantics) -
rather than identity semantics (aka:
[PLOP](https://youtu.be/-6BsiVyC1kM?t=240)), which the
native `Map` implementation uses - for evaluating equality
of a non-primitive `Map` keys (e.g., for `Object`/`Array`
keys).

This - dare I say _better_ - implementation of Map avails
something that many are asking for in JS: [pattern
matching](https://github.com/tc39/proposal-pattern-matching).
With pattern matching, we don't have to resort to any
non-intuitive/complex/fragile regular expression gymnastics
for route matching.

To start, we'll diverge away from the problem at hand for
just a moment look at some of the benefits of a
value-semantic `Map`...

Value semantics have so many benefits. As a router, just
one. So, how might we apply such a pattern matching solution
against the problem of routing?

```js
// src/routes.js
import { EquivMap } from "@thi.ng/associative"

const known = x => ["fortunes", "lessons"].find(y => y === x)
const four04 = [{ chinese: 404, english: 404 }]
const home = [{ chinese: "家", english: "home" }]
const url = "https://fortunecookieapi.herokuapp.com/v1/"
const query = (a, b) =>
  fetch(`${url}${a}?limit=1&skip=${b}`).then(r => r.json())

export const match = async path => {
  const args = path ? path.split("/") : []

  let [api, id] = args

  const data =
    new EquivMap([
      // prevent unneeded requests w/thunks (0)=>
      [[], () => home],
      [[known(api), id], () => query(api, id)], // guarded match
      [[known(api)], () => query(api, 1)] // guarded match
    ]).get(args) || (() => four04)

  // call the thunk to trigger the actual request
  const res = await data()
  const r = res[0]

  return r.message || `${r.chinese}: ${r.english}`
}

const log = console.log

match("fortunes/88").then(log)
// //=> "A handsome shoe often pinches the foot."

match("").then(log)
// //=> "家: home"

match("lessons/4").then(log)
// //=> "请给我一杯/两杯啤酒。: A beer/two beers, please."

match("bloop/21").then(log)
// //=> "404: 404"
```

If you can see the potential of pattern matching for other
problems you may have encountered, you can check out the
[more detailed section](#more-pattern-matching) later. We
can create pattern-matching
[guards](<https://en.wikipedia.org/wiki/Guard_(computer_science)#Pattern_guard>)
by using an _in situ_ expression that either returns a
"falsy" value or the value itself.

Even if you don't end up using `spule`, you may find the
[`@thi.ng/associative`](https://github.com/thi-ng/umbrella/tree/develop/packages/associative)
library very handy!

Now, let's integrate our router. Everything pretty much
stays the same, but we'll need to make a few changes to
mount our router to the DOM.

```diff
// src/routes.js

import { parse } from "spule"

...

export const match = async path => {
- const args = path ? path.split("/") : [];
+ const args = parse(path).URL_path

  let [api, id] = args

  const data =
    new EquivMap([
      [[], () => home],
      [[known(api), id], () => query(api, id)],
      [[known(api)], () => query(api, 1)]
    ]).get(args) || (() => four04)

  const res = await data()
  const r = res[0]

- return r.message || `${r.chinese}: ${r.english}`
+ return {
+   URL_data: r.message || `${r.chinese}: ${r.english}`,
+ }
}

- ...
```

<iframe
  src="https://stackblitz.com/edit/spule-router?embed=1&file=routes.js&hideExplorer=1"
  style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;"
  allow="accelerometer; gyroscope"
></iframe>

TODO

It's beyond the scope of this introduction to `spule` to
dive into the implementation of our next example. It will
work, but you try it out for yourself on your own (toy)
problem in order to get a feel for it.

### UI-first or UI-last?

As you may deduce - if you've gotten this far - is there's a
heavy data-oriented/biased approach taken by `spule`. In
fact, we argue that the UI should be informed by the data,
not the other way around.

I.e., start with building out the application state for your
various routes and then frame it with a UI. Think of the
application state as your information architecture and the
UI as your information interior design. While it's possible
to start with the design and end with an information
architecture, the customer journey can suffer from an
over-reliance on "signage" for helping them navigate through
the information.

It's not uncommon to start an application/site design with a
"site map". Think of this approach like a site map on
steroids

## Advanced

ADVANCED USE ONLY 👽

HURL tries to hide the stream implentation from the user as
much as possible, but allows you to go further down the
rabbit hole if so desired. You may send Commands to a
separate stream of your own creation during a Task by using
a nullary ("thunk") `(0)=>` function signature as the `args`
value of a Command. If this is the case, the spool assumes
the `sub$` key references a stream and sends the return
value of the thunk to that stream This feature can come in
handy for "fire and forget" events (e.g., logging,
analytics, etc.)

```js
import { stream } from "@thi.ng/rstream"
import { map, comp } from "@thi.ng/transducers"
// ad-hoc stream
let login = stream().subscribe(
  comp(
    map(x => console.log("login ->", x)),
    map(({ token }) => loginToMyAuth(token))
  )
)
// subtask ({A})=>
let ANALYTICS = ({ token }) => [
  {
    sub$: login, // <- stream
    // thunk custom stream dispatch (0)=>
    args: () => ({ token })
  }
]
// task
let task = [
  // no sub$, just pass data
  { args: { href: "https://my.io/auth" } },
  { sub$: login, args: () => "logging in..." },
  {
    sub$: "AUTH",
    args: ({ href }) => fetch(href).then(r => r.json()),
    erro: (acc, err) => ({ sub$: "cancel", args: err }),
    reso: (acc, res) => ({ token: res })
  },
  acc => ANALYTICS(acc),
  { sub$: login, args: () => "log in success" }
]
```

## Stream Architecture:

`run$` is the primary event stream exposed to the user via
the `ctx` object injected into every `hdom` component the
command stream is the only way the user changes anything in
`hurl`

### Marble Diagram

```diff
0>- |------c-----------c--[~a~b~a~]-a----c-> : calls
1>- |ps|---1-----------1----------0-1----1-> : run$
2>- |t0|---------a~~b~~~~~~~~~~~a~|--------> : task$
3>- |t1|---c-----------c------------a----c-> : command$
4>- ---|ps|c-----a--b--c--------a---a----c-> : out$

Userland Handlers:

a>- ---|ta|------*--------------*---*------> : registerCMD
b>- ---|tb|---------*----------------------> : registerCMD
c>- ---|tc|*-----------*-----------------*-> : registerCMD
```

### Streams

- `0>-`: userland stream emmissions (`run`)
- `1>-`: pubsub forking stream (if emmission has a `sub$`)
- `2>-`: pubsub = `false`? -> `task$` stream
- `3>-`: pubsub = `true`? -> `command$` stream
- `4>-`: pubsub emits to `registerCMD` based on `sub$` value

### `work` Handlers

- `4>-` this is the stream to which the user (and framework)
  attaches `work` handlers. Handlers receive events they
  subscribe to as topics based on a `sub$` key in a Command
  object.

#### Built-in Commands/Tasks:

- `SET_STATE`: Global state update Command
- `URL__ROUTE`: Routing Task
- "FLIP" :
  [F.L.I.P.](https://aerotwist.com/blog/flip-your-animations/)
  animations Commands for route/page transitiions

### `run$`

User-land event dispatch stream

This stream is directly exposed to users. Any one-off
Commands `next`ed into this stream are sent to the
`command$` stream. Arrays of Commands (Tasks) are sent to
the `task$` stream.

<iframe
  src="https://stackblitz.com/edit/spule-spa?embed=1&file=index.js&hideExplorer=1"
  style="width:100%; height:900px; border:0; border-radius: 4px; overflow:hidden;"
  allow="accelerometer; gyroscope"
></iframe>

## Constants Glossary

| URL component key | description                            |
| ----------------- | -------------------------------------- |
| DOM               | DOM node target                        |
| URL               | full URL/route                         |
| URL_path          | route path as array                    |
| URL_domain        | top-level domain as array              |
| URL_subdomain     | subdomain as array                     |
| URL_query         | node querystring parsed URL parameters |
| URL_hash          | hash string to/from URL if any         |
| URL_data          | data returned by router                |
| URL_page          | page component to render URL_data with |

| router config key | description                                      |
| ----------------- | ------------------------------------------------ |
| HEAD              | metadata wrapper for router (targets DOM <head>) |
| BODY              | data wrapper for router                          |
| prep              | pre-router behavior Task/Command injection       |
| post              | post=router behavior Task/Command injection      |
| prefix            | URL path string for the router to ignore         |
| router            | @thi.ng/EquivMap pattern matching function       |

| Command key (🔎) | description                                     |
| ---------------- | ----------------------------------------------- |
| sub\$            | Command primary/unique key (topic subscription) |
| args             | signal passing intra-Task Command state value   |
| reso             | Promise resolution handler                      |
| erro             | Promise rejection handler                       |
| work             | where Commands' actual "work" is done           |
| src\$            | upstream (source stream) Command connector      |

| `boot` config key | description                                 |
| ----------------- | ------------------------------------------- |
| run               | primary userland dispatch function          |
| state             | global immutable state container            |
| root              | DOM mount node for application              |
| app               | root application view                       |
| trace             | enable logging of every global state update |
| draft             | state shape scaffolding                     |

### More Pattern Matching

```js
import { EquivMap } from "@thi.ng/associative"

const haiku = args => {
  const { a, b, c } = args
  const [d] = c || []

  const line =
    new EquivMap([
      [{ a, b }, `${a} are ${b}`],
      [{ a, b, c: [d] }, `But ${a} they don't ${b} ${d}`]
    ]).get(args) || "refrigerator"

  console.log(line)
}

haiku({ a: "haikus", b: "easy" })
//=> haikus are easy

haiku({ a: "sometimes", b: "make", c: ["sense"] })
//=> But sometimes they don't make sense

haiku({ b: "butterfly", f: "cherry", a: "blossom" })
//=> refrigerator
```

We can use any expression in the context of an Object as a
guard. Let's see an example of guarding matches for
`Objects`...

```js
let guarded_matcher = args => {
  let { a, c } = args

  let res =
    // for guards on objects use computed properties
    new EquivMap([
      [{ a, [c > 3 && "c"]: c }, `${c} is greater than 3`],
      [{ a, [c < 3 && "c"]: c }, `${c} is less than 3`]
    ]).get(args) || "no match"

  console.log(res)
}

guarded_matcher({ a: "b", c: 2 })
//=> less than 3

guarded_matcher({ a: "b", c: 3 })
//=> no match

guarded_matcher({ a: "b", c: 4 })
//=> greater than 3
```

- Naming Conventions:
  - constants: `CAPITAL_SNAKE_CASE`
    - generally accepted convention for constants in JS
    - used for defining Commands (as though they might cause
      side effects, their subscription names are constant -
      i.e., a signal for emphasising this aspect of a
      Command)
  - pure functions: `snake_case`
    - some novelty here due to pure functions acting like
      constants in that with the same input they always
      return the same output
  - impure functions: `camelCase`
    - regular side-effecty JS
  - Tasks: `DOUBLE__UNDERSCORE__SNAKE__CASE`
    - implies the inputs and outputs on either end of a Task
    - Tasks also should be treated as pure functions where
      the output is really just data (and lambdas). This is
      going in the direction of "code as data"
- lots'o'examples

## Credits

`spule` is built on the [@thi.ng/umbrella](https://thi.ng/umbrella) ecosystem
