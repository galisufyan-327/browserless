const puppeteer = require("puppeteer");
const fs = require('fs');
const { base64encode, base64decode } = require('nodejs-base64');
// const curl = new (require('curl-request'))();
const { SHA256 } = require('crypto-js');
const mkdirp = require('mkdirp');
const URLParser = require('url-parse');
const { promisify } = require('util');
var Curl = require('node-libcurl').Curl;
var zipper = require('zip-local');

let { urlPackage } = require('../models/urlPackage');

PROTOCOL = 'https';
SERVERIP = '10.0.8.79';

async function urlHandler(url) {
    let origin = '';
    let protocol = '';
    if (!url.match(/http|https/)) {
        origin = new URLParser('http://' + url).origin;
        console.log(origin);
        protocol = 'http://';
    } else {
        origin = new URLParser(url).origin;
        protocol = new URLParser(url).protocol;
    }

    let url_hash = SHA256(url).toString();
    let user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3508.0 Safari/537.36';

    let package = `UrlScanData/${url_hash}`;
    let packageZIP = `${package}.zip`;
    let urlPath = `${package}/url`;
    let originPath = `${package}/domain`;
    let faviconPath = `${package}/icons`;

    mkdirp(`${urlPath}`, function (err) {
        if (err) console.error(err)
        // else console.log(`URL director created at: ${urlPath}`);
    });
    mkdirp(`${originPath}`, function (err) {
        if (err) console.error(err)
        // else console.log(`Domain director created at: ${originPath}`)
    });

    let STATUS_U = 0;
    let STATUS_D = 0;
    STATUS_U = await parsePage(urlPath, faviconPath, url_hash, url, origin, STATUS_U, user_agent, protocol)
    STATUS_D = await parsePage(originPath, faviconPath, url_hash, origin, origin, STATUS_D, user_agent, protocol);
    console.log(`Browser Closed Successfully. Domain Status: ${STATUS_D} URL Status: ${STATUS_U}`);
    if (STATUS_D === 1 && STATUS_U === 1) {
        return new Promise((resolve, reject) => {
            resolve(1);
        });
    } else {
        zipper.sync.zip(`${package}/`).compress().save(`${packageZIP}`);
        uploadZIP(url_hash, user_agent, packageZIP);
        return new Promise((resolve, reject) => {
            resolve(0);
        });
    }
    // return (STATUS_U);

    // setTimeout(() => {
    //     response = await parsePage(originPath, faviconPath, url_hash, origin, origin);
    //     return response;
    // }, 5000);
}

async function saveURLData(package) {
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
    package = await newPackage.save();
    return package
    // newPackage.save().then((package) => {
    //     // console.log('Package saved: ', package);
    // }).catch((e) => console.log(e.message));
};

const getJob = () => {

}

const uploadZIP = (url_hash, user_agent, packageZIP) => {
    let user_agent_hash = SHA256(user_agent).toString();
    //upload status(success :=1, failiure :=-10)
    APIPACKAGE = '{1}://{0}/worker/uploadstatus/'.format(SERVERIP, PROTOCOL)
    post_data = {
        'url_hash': url_hash, 'user_agent_hash': user_agent_hash, 'status': 1,
        'user_agent': user_agent, 'uname': 'snx', 'password': 'top4glory'
    }
    response = requests.post(APIPACKAGE, files = files, data = post_data, verify = False)
}

async function downloadFavicon(url, faviconPath) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    let isHTML = false;
    page.on("response", async (response) => {
        contentType = response._headers['content-type'];
        // console.log(contentType, response.url);
        if (contentType) {
            if (contentType.match(/text\/html/)) {
                console.log(response._status);
                isHTML = true;
            }
        }
    });
    let viewSource = await page.goto(url);

    if (!isHTML) {
        console.log('Favicon URL: ', url);
        mkdirp(`${faviconPath}`, function (err) {
            if (err) console.error(err)
            // console.log(`Icons director created at: ${faviconPath}`)
        });
        fs.writeFile(faviconPath + `\\${SHA256(url).toString()}.png`, await viewSource.buffer(), function (err) {
            if (err) {
                return console.log(err);
            }
            console.log("The file was saved!");
        });
    }
    await browser.close();
    return new Promise((resolve, reject) => {
        resolve('Done with favicon');
    });
}

async function handleCURL(path, url_hash, url_base64, url) {
    var curl = new Curl();

    curl.setOpt(Curl.option.URL, url);
    curl.setOpt('FOLLOWLOCATION', false);

    curl.on('end', async function (statusCode, body, headers) {

        console.info(statusCode);
        console.info('---');
        console.info(body.length);
        if (statusCode !== 403 || statusCode !== 404 || statusCode !== 500 || statusCode !== 501 || statusCode !== 502 || statusCode !== 503 || statusCode !== 504) {
            await promisify(fs.writeFile)(path + `\\${url_hash}`, body);
        } else {
            return new Promise((resolve, reject) => {
                resolve(1);
            })
        }
        console.info('---');
        console.info(headers);
        console.info('---');
        console.info(this.getInfo(Curl.info.TOTAL_TIME));

        this.close();
    });

    curl.on('error', function (err, curlErrorCode) {

        console.error(err.message);
        console.error('---');
        console.error(curlErrorCode);

        this.close();

    });

    await curl.perform();
    return new Promise((resolve, reject) => {
        resolve(0);
    })
    // try {

    //     console.log('File type is not an html');
    //     const { statusCode, body, headers } = await curl.setHeaders(['user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3508.0 Safari/537.36']).get(url);
    //     let file_hash = SHA256(body).toString();
    //     // if (headers['content-type'].match(/text\/html/)) {
    //     //     return new Promise((resolve, reject) => {
    //     //         resolve(0);
    //     //     })
    //     // }
    //     await promisify(fs.writeFile)(path + `\\${url_hash}`, body);

    //     let package = new urlPackage({
    //         url_hash: url_hash,
    //         url_base64: url_base64,
    //         file_type: 'text/html',
    //         file_hash: file_hash,
    //         dir_path: path
    //     });

    //     return await saveURLData(package);
    // } catch (err) {
    //     console.log('Curl catch block', err.message);
    // }
}

async function parsePage(path, faviconPath, url_hash, url, origin, STATUS, user_agent, protocol) {
    let url_base64 = base64encode(url);
    let isHTML = false;
    let page_res = false;
    let result = '';
    let page_title = '';
    let html = '';
    let file_hash = '';

    json_data = {
        'page_title': page_title,
        'protocol': protocol
    }

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    page.on("response", async (response) => {
        // console.log(response);
        page_res = true;
        // console.log('Response found!');
        contentType = response._headers['content-type'];
        // console.log(contentType);
        // console.log(response._status, response._url);
        if ((response._status === 403 || response._status === 404 || response._status === 500 || response._status === 501 || response._status === 502 || response._status === 503 || response._status === 504) && response._url === url) {
            STATUS = 1;
            console.log('STATUS with URL ', STATUS, response._status, contentType, response._url);
        } else {
            STATUS = 0;
            // console.log('STATUS with URL ', STATUS, contentType, response._url);
        }
        if (contentType) {
            if (contentType.match(/text\/html/)) {
                console.log(response._status, contentType, url);
                isHTML = true;
            }
        }
        // console.log('No response found!');
        // result = await handleCURL(path, url_hash, url_base64, url);
        // console.log(response._url);
    });
    page.on('dialog', async dialog => {
        // console.log(dialog.message());
        try {

            await dialog.dismiss();

        } catch (err) {

            console.log('Error on dialog event: ', err.message);

        }

    });
    page.setUserAgent(user_agent)
    await page
        .goto(url, {
            waitUntil: "load",
            args: ["--disable-client-side-phishing-detection", "--safebrowsing-disable-download-protection", "--safebrowsing-manual-download-blacklist"]
        }, 9000)
        .catch(e => {
            (error = console.log('Error: ', e.message));
            STATUS = 1;
        });

    // if (page_res === false) {
    //     result = await handleCURL(path, url_hash, url_base64, url).catch((e) => {
    //         console.log('Curl catch block', e.message);
    //     });
    //     console.log('Result is: ', result);
    //     if (result === 0) {
    //         isHTML = true;
    //     } else if (result === undefined) {
    //         result = await handleCURL(path, url_hash, url_base64, url).catch((e) => {
    //             console.log('Curl catch block', e.message);
    //         });
    //         console.log('Result is: ', result);
    //     }
    // }

    if (STATUS === 1) {
        await browser.close();
        return new Promise((resolve, reject) => {
            resolve(STATUS);
        });
    }
    if (isHTML) {
        await page.screenshot({ path: `${path}/screenshot.png`, fullPage: true });
        page_title = await page.title();
        html = await page.content();
        file_hash = SHA256(html).toString();
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

        if (hrefs.length !== 0) {
            console.log('hrefs', hrefs);
            for (const href of hrefs) {
                await downloadFavicon(href, faviconPath);
            }
        } else {
            console.log('No icon found!');
            await downloadFavicon(`${origin}/favicon.ico`, faviconPath);
        }

        // for (const href of hrefs) {
        //     console.log(href);
        //     await downloadFavicon(path, href);
        // }
        // let package = new urlPackage({
        //     url_hash: url_hash,
        //     url_base64: url_base64,
        //     page_title: page_title,
        //     file_type: 'text/html',
        //     file_hash: file_hash,
        //     dir_path: path
        // });
        // result = await saveURLData(package);

    } else {
        STATUS = await handleCURL(path, url_hash, url_base64, url).catch((e) => {
            console.log('Curl catch block', e.message);
        });
    }
    await browser.close();
    // console.log('STATUS', STATUS);
    return new Promise((resolve, reject) => {
        resolve(STATUS);
    });
};

module.exports.parsePage = parsePage;
module.exports.uploadZIP = uploadZIP;
module.exports.urlHandler = urlHandler;




//////////

// console.log('File type is not an html');
// curl.setHeaders([
//     'user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3508.0 Safari/537.36'
// ])
//     .get(url)
//     .then(({ statusCode, body, headers }) => {
//         // console.log(url, statusCode);
//         let file_hash = SHA256(body).toString();
//         fs.writeFile(path + `\\${url_hash}`, body, function (err) {
//             if (err) throw err;
//             // console.log("success");
//         });

//         let package = new urlPackage({
//             url_hash: url_hash,
//             url_base64: url_base64,
//             file_type: 'text/html',
//             file_hash: file_hash,
//             dir_path: path
//         });
//         saveURLData(package);
//     })
//     .catch((e) => {
//         console.log('Curl catch block', e.message);
//     });