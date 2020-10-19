/* Magic Mirror Module
 * Module: MMM-idos
 * Description: Display estimations for public transport stops in the Czech Republic
 *
 * By elrubio https://github.com/soyrubio
 * MIT Licensed.
 * 
 * This is a web scraper for the MMM-idos module
 * The data is scraped from https://idos.idnes.cz/vlakyautobusymhdvse/odjezdy/
 */

const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

function parse_body(body) {
	const $ = cheerio.load(body)

	var stops = []
	$(".dep-row-first").each(function () {
		var stop = $(this).find("h3").map(function () {
			return $(this).text().trim()
		}).toArray();
		stops.push(stop);
	});
	var vehicles = $(".departures-table__cell img").map(function () {
		return $(this).attr("alt")
	});
	var delays = $(".cell-delay").map(function () {
		return $(this).find(".delay-bubble").text().replace(/[^0-9]/g, "").replace(/^$/, "0")
	});

	var output = [];
	for (let i = 0; i < stops.length; i++) {
		stop = stops[i];

		output.push({
			"destination": stop[0],
			"number": stop[1].replace("Bus", "").replace("Tram", "").trim(),
			"departure": stop[2].replace(/\n.*/g, ""),
			"delay": delays[i],
			"departurewdelay": getDepartureWDelay(stop[2], delays[i]),
			"type": vehicles[i].replace("tramvaj", "train").replace("autobus", "bus").replace("trolejbus", "bus")
		});
	}

  output.sort(getSortOrder("departurewdelay"));
  
	return output;
}

function getSortOrder(prop) {
	return function (a, b) {
		if (a[prop] > b[prop]) {
			return 1;
		} else if (a[prop] < b[prop]) {
			return -1;
		}
		return 0;
	}
}

function getDepartureWDelay(dep, delay) {
	var now = new Date();
	var time = dep.split(":");
	var departure = new Date(now.getFullYear(), now.getMonth(), now.getDate(), time[0], time[1], 0);
	var diff = (departure - now) / 60000;
	departure.setMinutes(departure.getMinutes() + parseInt(delay));
	diff = (departure - now) / 60000;
	diff = Math.round(diff);
	return diff;
}

async function scrape(options, callback) {
	try {
		var port_arg;
		if (options.ports.length > 0) {
			const randomPort = options.ports[Math.floor(Math.random() * options.ports.length)];
			port_arg = '--proxy-server=socks5://127.0.0.1:' + randomPort;
		}
		const browser = await puppeteer.launch({
			args: [port_arg],
			executablePath: '/usr/bin/chromium-browser'
		});
		const page = await browser.newPage();

		await page.setRequestInterception(true);
		page.on('request', (request) => {
			if (['image', 'stylesheet', 'font', 'script'].indexOf(request.resourceType()) !== -1) {
				request.abort();
			} else {
				request.continue();
			}
		});

		await page.goto(options.url);
		const content = await page.content();
		setTimeout(() => {
			browser.close();
		}, 3000);
		callback(null, content);
	} catch (err) {
		callback(err, null);
	}
}

exports.get_livetable = function (stop, ports) {
	var url = 'https://idos.idnes.cz/vlakyautobusymhdvse/odjezdy/vysledky/?f=' + stop;

	//var stops = scrape(url, props.ports);
	return new Promise(function (resolve, reject) {
		scrape({
			url: url,
			ports: ports
		}, function (err, body) {
			if (err)
				return reject(err);
			else
				return resolve(parse_body(body));
		})
	});

	return stops;
}
