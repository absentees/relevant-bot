require('dotenv').config()
var Twitter = require('twitter');
var Airtable = require('airtable');
var async = require('async');
var Hashids = require('hashids');
var hashids = new Hashids('mrpoopybutthole', 10, 'abcdefghijklmnopqrstuvwxyz1234567890');
var CronJob = require('cron').CronJob;

Airtable.configure({
	endpointUrl: 'https://api.airtable.com',
	apiKey: process.env.RELEVANT_BOT_AIRTABLE_API_KEY
});
var base = Airtable.base(process.env.RELEVANT_BOT_AIRTABLE_BASE_ID);

var client = new Twitter({
	consumer_key: process.env.RELEVANT_BOT_TWITTER_CONSUMER_KEY,
	consumer_secret: process.env.RELEVANT_BOT_TWITTER_CONSUMER_SECRET,
	access_token_key: process.env.RELEVANT_BOT_TWITTER_ACCESS_TOKEN_KEY,
	access_token_secret: process.env.RELEVANT_BOT_TWITTER_ACCESS_TOKEN_SECRET
});

function GetAvailableDomains(callback) {
	console.log("Getting all available domains from Airtable");
	var domains = [];

	base('Domains').select({
		view: "Available Domains"
	}).eachPage(function page(airTableRecords, fetchNextPage) {
		airTableRecords.forEach(function (record) {
			domains.push({
				recordId: record.get('id'),
				title: record.get('title'),
				word: record.get('word'),
				available: record.get('available'),
				url: hashids.encode(record.get('id'))
			});
		});
		fetchNextPage();

	}, function done(err) {
		if (err) {
			console.log(`Something went wrong getting domains: ${err}`);
			return callback(err);
		}

		return callback(null, domains);
	});
}

function ReplyToTweet(domains, callback) {
	// Select a random domain
	var randomDomain = domains[Math.floor(Math.random() * domains.length - 1)];

	if (randomDomain.word) {
		console.log("Finding relevant tweet for: " + randomDomain.word);
		client.get('search/tweets', {
			q: '\"' + randomDomain.word + '\"',
		}, function (error, tweets, response) {
			if (error || tweets.statuses.length <= 0) {
				return callback(error);
			}

			var replyTo = tweets.statuses[Math.floor(Math.random() * tweets.statuses.length)];

			console.log(replyTo.id_str + " @" + replyTo.user.screen_name + " tweeted: " + replyTo.text);
			client.post('statuses/update', {
				in_reply_to_status_id: replyTo.id_str,
				possibly_sensitive: true,
				status: "@" + replyTo.user.screen_name + " That's pretty relevant, the domain: " + randomDomain.title + " " + randomDomain.available + " https://www.relevant.domains/" + randomDomain.url
			}, function (error, tweet, response) {
				if (error) {
					return callback(error);
				}

				return callback(null, domains);
			});
		});
	}
}

function TweetUpdate(domains, callback) {
	var randomDomain = domains[Math.floor(Math.random() * domains.length - 1)];

	if (randomDomain.word) {
		console.log("Status update for: " + randomDomain.word);

		client.post('statuses/update', {
			status: "Stay relevant with the domain: " + randomDomain.title + " https://www.relevant.domains/" + randomDomain.url
		}, function (error, tweet, response) {
			if (error) {
				return callback(error);
			}

			callback();
		});
	}
}

var cronJob = new CronJob('0 0 */12 * * *', function() {
	// Tweet once a day
		async.waterfall([
			GetAvailableDomains,
			ReplyToTweet,
			TweetUpdate
		], function (err, words) {
			if (err) {
				console.log(`Something went wrong: ${err}`);
			}
		});
}, null, false, 'Australia/Sydney');

cronJob.start();
console.log("Job is: " + cronJob.running + " – tweeting every two hours.");

module.exports = (req, res) => {
  res.end('Relevant Bot: ' + cronJob.running)
}
