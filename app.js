const puppeteer = require("puppeteer");
const fs = require('fs');
const args = require('yargs').argv;
const { SHA256 } = require('crypto-js');
const mkdirp = require('mkdirp');
const URLParser = require('url-parse');

// let { parsePage } = require('./utils/utils');

let url = args.url;
let origin = new URLParser(url).origin;
let url_hash = SHA256(url).toString();

console.log(origin);
console.log(url_hash);

let urlPath = `UrlScanData/${url_hash}/url`;
let originPath = `UrlScanData/${url_hash}/domain`;

mkdirp(`${urlPath}`, function (err) {
    if (err) console.error(err)
    else console.log('pow!')
});
mkdirp(`${originPath}`, function (err) {
    if (err) console.error(err)
    else console.log('pow!')
});


async function parsePage(path, url_hash, url) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3508.0 Safari/537.36')
    await page
        .goto(url, {
            waitUntil: "load",
            args: ["--disable-client-side-phishing-detection", "--safebrowsing-disable-download-protection", "--safebrowsing-manual-download-blacklist"]
        })
        .catch(e => (error = e));
    await page.screenshot({ path: `${path}/screenshot.png`, fullPage: true });
    let html = await page.content();
    fs.writeFile(path + `\\${url_hash}.html`, html, function (err) {
        if (err) throw err;
        console.log("success");
    });

    await browser.close();
};

parsePage(urlPath, url_hash, url)
parsePage(originPath, url_hash, origin)