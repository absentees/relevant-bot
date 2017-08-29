require('dotenv').config()
var Twitter = require('twitter');
var Airtable = require('airtable');
var async = require('async');
var Hashids = require('hashids');
var hashids = new Hashids('mrpoopybutthole', 10, 'abcdefghijklmnopqrstuvwxyz1234567890');
var moment = require('moment');

Airtable.configure({
	endpointUrl: 'https://api.airtable.com',
	apiKey: process.env.AIRTABLE_API_KEY
});
var base = Airtable.base(process.env.AIRTABLE_BASE_ID);

var client = new Twitter({
	consumer_key: process.env.RELEVANT_BOT_TWITTER_CONSUMER_KEY,
	consumer_secret: process.env.RELEVANT_BOT_TWITTER_CONSUMER_SECRET,
	access_token_key: process.env.RELEVANT_BOT_TWITTER_ACCESS_TOKEN_KEY,
	access_token_secret: process.env.RELEVANT_BOT_TWITTER_ACCESS_TOKEN_SECRET
});

function GetAvailableDomains(callback){
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
		}

		return callback(null, domains);
	});
}

function ReplyToTweets(domains, callback) {
	console.log("Finding relevant tweets");
	domains.forEach(function(domain){
		if (domain.word) {
			client.get('search/tweets', {
				// q: '\"' + domain.word + '\"',
				q: '\"Relevant Domains\"',
				count: '1'
			}, function (error, tweets, response) {
				if (error && tweets.statuses.length > 0) {
					return callback(error);
				}

				// Select random tweet
				var replyTo = tweets.statuses[Math.floor(Math.random()*tweets.statuses.length)];

				console.log("Posting in reply to screen name: " + replyTo.user.screen_name);
				client.post('statuses/update', {
					status: ".@" + replyTo.user.screen_name + " the domain: " + domain.title + " " + domain.available + " https://www.relevant.domains/" + domain.url
				}, function(error, tweet, response){
					if (error) {
						return callback(error);
					}

					callback();
				});
			});
		}
	});
}

// Tweet every hour
var timer = moment.duration(1, "hour").timer({
  loop: true
}, function() {
	async.waterfall([
		GetAvailableDomains,
		ReplyToTweets
	], function (err, words) {
		if (err) {
			console.log(`Something went wrong: ${err}`);
		}
	});
});
