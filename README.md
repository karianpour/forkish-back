### Build

is `tsconfig.json` I have to add `"baseUrl"="."` but it does not work properly while coding

for build 

I added the following line to `index.d.ts` line 11 in `@types/bent`, there is closed issue about it here[https://github.com/mikeal/bent/issues/71]

```
type Response = any;
```