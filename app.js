const puppeteer = require("puppeteer");
const fs = require('fs');
const args = require('yargs').argv;
const { SHA256 } = require('crypto-js');
const mkdirp = require('mkdirp');
const URLParser = require('url-parse');
const curl = new (require('curl-request'))();
const { base64encode, base64decode } = require('nodejs-base64');

let { urlPackage } = require('./models/urlPackage');

// let { parsePage } = require('./utils/utils');

let url = args.url;
// let url = "http://www.mainspaceforlinksfree.icu/rtr?b9zd1=uV05AnynSKA2Q6FxmVOkB3iQzec0_HHOtfMB_GC5ajA.&cid=63491254347907072⊂=1500726";
let origin = new URLParser(url).origin;
let url_hash = SHA256(url).toString();
let protocol = new URLParser(url).protocol;

console.log(origin);
console.log(url_hash);

let urlPath = `UrlScanData/${url_hash}/url`;
let originPath = `UrlScanData/${url_hash}/domain`;
let faviconPath = `UrlScanData/${url_hash}/icons`;

mkdirp(`${urlPath}`, function (err) {
    if (err) console.error(err)
    else console.log('pow!')
});
mkdirp(`${originPath}`, function (err) {
    if (err) console.error(err)
    else console.log('pow!')
});

let saveURLData = (package) => {
    // console.log(package);
    let newPackage = new urlPackage({
        url_hash: package.url_hash,
        url_base64: package.url_base64,
        page_title: package.page_title,
        file_type: package.file_type,
        filename: package.filename,
        file_hash: package.file_hash,
        dir_path: package.dir_path
    });

    newPackage.save().then((package) => {
        console.log('Package saved: ', package);
    }).catch((e) => console.log(e));
};

async function downloadFavicon(url) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    var viewSource = await page.goto(url);

    fs.writeFile(faviconPath + `\\${SHA256(url).toString()}.png`, await viewSource.buffer(), function (err) {
        if (err) {
            return console.log(err);
        }

        console.log("The file was saved!");
    });

    await browser.close();
}

async function parsePage(path, url_hash, url) {
    let url_base64 = base64encode(url);
    let isHTML = false;
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    page.on("response", async (response) => {
        // console.log(response);
        contentType = response._headers['content-type'];
        // console.log(response._status);
        // console.log(response._headers);
        if (contentType) {
            if (contentType.match(/text\/html/)) {
                console.log(contentType);
                isHTML = true;
            }
        }

        // console.log(response._url);
    });
    page.on('dialog', async dialog => {
        // console.log(dialog.message());
        await dialog.dismiss();
    });
    page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3508.0 Safari/537.36')
    await page
        .goto(url, {
            waitUntil: "load",
            args: ["--disable-client-side-phishing-detection", "--safebrowsing-disable-download-protection", "--safebrowsing-manual-download-blacklist"]
        })
        .catch(e => (error = e));
    if (isHTML) {
        await page.screenshot({ path: `${path}/screenshot.png`, fullPage: true });
        let page_title = await page.title();
        let html = await page.content();
        let file_hash = SHA256(html).toString();
        fs.writeFile(path + '\\page.html', html, function (err) {
            if (err) throw err;
            // console.log("success");
        });
        // const hrefs = await page.evaluate(
        //     () => Array.from(document.head.querySelectorAll('link[href]'), ({ href }) => href.match(/\S+\.(ico|png|svg)\S*/))
        // );

        const hrefs = await page.evaluate(
            () => Array.from(document.head.querySelectorAll('link[rel*="icon"]'), ({ href }) => href)
        );
        mkdirp(`${faviconPath}`, function (err) {
            if (err) console.error(err)
            else console.log('pow!')
        });
        if (hrefs) {
            for (const href of hrefs) {
                console.log(href);
                downloadFavicon(href);
            }
        } else {
            console.log('No icon found!');
            // downloadFavicon(`${origin}/favicon.ico`);
        }

        // for (const href of hrefs) {
        //     console.log(href);
        //     await downloadFavicon(path, href);
        // }
        let package = new urlPackage({
            url_hash: url_hash,
            url_base64: url_base64,
            page_title: page_title,
            file_type: 'text/html',
            file_hash: file_hash,
            dir_path: path
        });
        // saveURLData(package);
    } else {
        console.log('File type is not an html');
        curl.setHeaders([
            'user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3508.0 Safari/537.36'
        ])
            .get(url)
            .then(({ statusCode, body, headers }) => {
                console.log(statusCode);
                let file_hash = SHA256(body).toString();
                fs.writeFile(path + `\\${url_hash}`, body, function (err) {
                    if (err) throw err;
                    // console.log("success");
                });

                let package = new urlPackage({
                    url_hash: url_hash,
                    url_base64: url_base64,
                    file_type: 'text/html',
                    file_hash: file_hash,
                    dir_path: path
                });
                // saveURLData(package);
            })
            .catch((e) => {
                console.log(e);
            });


    }


    await browser.close();
};

parsePage(urlPath, url_hash, url)
parsePage(originPath, url_hash, origin)