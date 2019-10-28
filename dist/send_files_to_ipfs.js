#!/usr/bin/env node

const execSync = require('child_process').execSync;

const lines = execSync("ipfs add -r " + __dirname + "/ipfs").toString();
const lastHashCatcher = new RegExp(/added (Qm[0-9a-zA-Z]{44}) ipfs\n/);
const results = lastHashCatcher.exec(lines);
console.log(results[1]);