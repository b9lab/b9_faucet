#!/usr/bin/env node

const execSync = require('child_process').execSync;
const path = require("path");

[
    { path: "../build/css", flags: "-Rv" },
    { path: "../build/images", flags: "-Rv" },
    { path: "../build/js", flags: "-Rv" },
    { path: "../build/statuspage", flags: "-Rv" },
    { path: "../build/index.html", flags: "-v" }
].forEach(element => {
    console.log(execSync(`cp ${element.flags} ${path.resolve(__dirname, element.path)} ${__dirname}/ipfs`).toString());
});
