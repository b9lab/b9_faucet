# B9lab Throttled Faucet
Project to yield some Ether at regular interval to developers who need some.

## Usage

```sh
# in terminal 1
$ npm install
$ ./node_modules/.bin/testrpc

# in terminal 2
$ ./node_modules/.bin/truffle migrate
$ npm run dev
```

## Building and the frontend

1. First run `truffle compile`, then run `truffle migrate` to deploy the contracts onto your network of choice (default "development").
1. Then run `npm run dev` to build the app and serve it on http://localhost:8080

## Possible upgrades

* Use the webpack hotloader to sense when contracts or javascript have been recompiled and rebuild the application. Contributions welcome!

## Common Errors

* **Error: Can't resolve '../build/contracts/ThrottledFaucet.json'**

This means you haven't compiled or migrated your contracts yet. Run `truffle compile` and `truffle migrate` first.

Full error:

```
ERROR in ./app/main.js
Module not found: Error: Can't resolve '../build/contracts/ThrottledFaucet.json' in 'blah blah/app'
 @ ./app/main.js 11:16-59
```

## Troubleshooting

If your errors are incomplete, considering commenting out the line `reporter: 'eth-gas-reporter'` in `truffle.js`.