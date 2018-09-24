// borrowed and edited from https://github.com/zenato/puppeteer-renderer 

'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');
const pathModule = require('path');

class Renderer {
	constructor(browser) {
		this.browser = browser;
	}

// 'networkidle2' - consider navigation to be finished when there are no more than 2 network connections for at least 500 ms
	async createPage(url, options = {}, extraHeaders = {}, expressResponse) {
		const { timeout, waitUntil } = options;
		const page = await this.browser.newPage();
		
		let failedResponse = false;
		// page.on('response', res => {
		// 	if (!res.ok()) {
		// 		try {
		// 			expressResponse.status(404).send('Error trying to visit the provided URL.');
		// 		} finally {
		// 			console.log('responding with error!!');
		// 		}
		// 		failedResponse = true;
		// 	}
		// 	console.log('RESPONSE CODE:  ', res.status());
		// });

		page.setExtraHTTPHeaders(extraHeaders);

		const response = await page.goto(url, {					// This line takes a couple seconds to complete...
			timeout: Number(timeout) || 30 * 1000,
			waitUntil: waitUntil || 'networkidle2',
		});

		if (!response.ok()) {
			try {
				expressResponse.status(404).send('Error trying to visit the provided URL.');
				return null;
			} finally {
				// console.log('responding with error!!');
			}
		}

		return !failedResponse ? page : null;
	}

	async render(url, options = {}) {
		let page = null;
		try {
			const { timeout, waitUntil } = options;
			page = await this.createPage(url, { timeout, waitUntil });
			const html = await page.content();
			return html;
		} finally {
			if (page) {
				await page.close();
			}
		}
	}

	async pdf(url, options = {}) {
		let page = null;
		try {
			const { timeout, waitUntil, ...extraOptions } = options;
			page = await this.createPage(url, { timeout, waitUntil });

			const { scale, displayHeaderFooter, printBackground, landscape } = extraOptions;
			const buffer = await page.pdf({
				...extraOptions,
				scale: Number(scale),
				displayHeaderFooter: displayHeaderFooter === 'true',
				printBackground: printBackground === 'true',
				landscape: landscape === 'true',
			});
			return buffer;
		} finally {
			if (page) {
				await page.close();
			}
		}
	}

	async screenshot(url, options = {}, res) {
		let page = null;
		try {
			var { timeout, waitUntil, ...extraOptions } = options;

			page = await this.createPage(url, { timeout, waitUntil }, {}, res);
			page.setViewport({
				width: Number(extraOptions.width || 800),
				height: Number(extraOptions.height || 600),
			});

			var { fullpage, omitbackground, type, quality, clip } = extraOptions;
			if (clip) {
				clip = this.parseKeyVal(clip);
			}

			if (!quality) {
				if (type === undefined) { 
					quality = 100; 
					type = 'jpeg';
				}
				else if (type == 'png') { quality = 0; }
			}

			var path = extraOptions.path;
			delete extraOptions.path;
			
			const buffer = await page.screenshot({
				// ...extraOptions,
				clip: clip || '',
				path: path,
				type: type || 'jpeg',
				quality: Number(quality),
				fullPage: (fullpage === 'true'),
				omitBackground: (omitbackground === 'true'),
			});

			return buffer;

		} finally {
			if (page) {
				await page.close();
			} else {
				return null;
			}
		}
	}

	async close() {
		await this.browser.close();
	}

	// Note, all values are cast to be a Number
	parseKeyVal(objStr) {
		let obj = {};
		let arr = objStr.split(',');
		arr.forEach(function(element, i) {
			let em = element.split('=');
			obj[em[0]] = Number(em[1]);
		});
		return obj;
	}
}

// https://github.com/GoogleChrome/puppeteer/blob/v1.7.0/docs/api.md#puppeteerlaunchoptions
async function create() {
	const options = {
		ignoreHTTPSErrors: true,
		defaultViewport: {
			width: 800,
			height: 600,
			isLandscape: true,
			deviceScaleFactor: 1,
			isMobile: false,
			hasTouch: false
		},
		args: ['--no-sandbox'],
	};
	const browser = await puppeteer.launch( options );

	return new Renderer(browser);
}

module.exports = create;