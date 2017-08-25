var Twitter = require('twitter');
require('dotenv').config()

var client = new Twitter({
	consumer_key: process.env.RELEVANT_BOT_TWITTER_CONSUMER_KEY,
	consumer_secret: process.env.RELEVANT_BOT_TWITTER_CONSUMER_SECRET,
	access_token_key: process.env.RELEVANT_BOT_TWITTER_ACCESS_TOKEN_KEY,
	access_token_secret: process.env.RELEVANT_BOT_TWITTER_ACCESS_TOKEN_SECRET
});

client.get('search/tweets', {
	q: '\"relevant domains\"',
	count: '1'
}, function (error, tweets, response) {
	console.log(tweets.statuses);
});
