# FOR KISH

This is a back-end application for managing driver and passenger coordination. The product is designed by my friend ["Mostafa Khalilnasab"](https://github.com/mostafakhn).

The driver mobile app is here[https://github.com/karianpour/forkish-driver]

The passenger mobile app is here[https://github.com/karianpour/forkish-app]

Here you can see a video of the apps in action:

[![Demo](https://img.youtube.com/vi/3bYX-b0S-2U/0.jpg)](https://www.youtube.com/watch?v=3bYX-b0S-2U)


### Build

in `tsconfig.json` I have to add `"baseUrl"="."` but it does not work properly while coding

for build 

I added the following line to `index.d.ts` line 11 in `@types/bent`, there is closed issue about it here[https://github.com/mikeal/bent/issues/71]

```
type Response = any;
```
