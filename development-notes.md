## Development Notes

While making small integrated changes that require updating
multiple packages in the stack frequently, in `package.json`
change:

```diff
{   ...,
    "scripts": {
        ...,
-       "patch": "npm version patch && npm run docs && npm run pages && npm publish",
+       "patch": "npm version patch && npm publish",
        ...
    },
    ...
}
```

This will speed up the process by removing unnecessary
updates to the docs. Just don't forget to change it back on
changes effecting public APIs.