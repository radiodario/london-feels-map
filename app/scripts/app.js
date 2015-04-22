/** @jsx React.DOM */

var React = window.React = require('react');
var moment = require('moment');
var io = require('socket.io-client')
var d3 = require('d3');
var feels = require('./feels');
var tweetTemplate = require('./ui/tweet.html');

var londonStatus = document.querySelector('span.feeling');
var lastUpdated = document.querySelector('span.lastUpdated');

var L = require('leaflet');

L.Icon.Default.imagePath = '/images/';

var url = "http://london.feels.website";

this.socket = io(url);

var avgFormat = d3.format(".2f");
var color = d3.scale.linear()
   .domain([-11,11])  // min/max of data
   .range(["rgb(253,88,6)", "rgb(44,163,219)"])
   .interpolate(d3.interpolateHcl);


var mapCont = document.querySelector('#map');

function resizeMap () {

  var height
  if (window.innerWidth > 768) {
    height = ((window.innerHeight * 0.8) | 0) + "px";
  } else {
    height = ((window.innerHeight * 0.7) | 0) + "px";
  }

  mapCont.style.height = height;
  mapCont.style.width = "100%"

}

resizeMap();

window.addEventListener('resize', resizeMap)


var map = L.map('map');

var initialZoomLevel = 13;
var circleRadius = 50;

if (window.innerWidth < 768) {
  initialZoomLevel = 11;
  circleRadius = 60;
}

map.setView([51.502, -0.08], initialZoomLevel);

var mapSource = "//stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png"

var old = 'http://{s}.tile.osm.org/{z}/{x}/{y}.png'

// add an OpenStreetMap tile layer
L.tileLayer(mapSource, {
    attribution: '&copy; Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://www.openstreetmap.org/copyright">ODbL</a>.'
}).addTo(map);

// add a marker in the given location, attach some popup content to it and open the popup



d3.json(url+'/latest', function(error, tweets) {
  if (error) {
    return console.error('error grabbing latest tweets:', error);
  }

  console.log("loaded", tweets.length, "tweets")

  var i = 0;
  d3.timer(function(d) {
    drawPoint(tweets[i], true);

    return !(++i < tweets.length);

  }, 10)

  // tweets.map(drawPoint);

})

var follow = document.querySelector('input#follow');


this.socket.on('tweet', function(tweet) {

  var hidePopup = !follow.checked;



  drawPoint(tweet, hidePopup);
});

var tweets = [];

var time_fmt = "HH:mm:ss - D MMM YYYY";

function drawPoint (tweet, hidePopup) {

  if (!tweet.coordinates) {
    return;
  }

  // the coordinates need reversing - terrible names.
  var pos = tweet.coordinates.coordinates.reverse();

  var col = color(tweet.sentiment.score);

  var factor = 5;

  var circle = L.circle(pos, circleRadius * factor, {
    color: col,
    weight: 2,
    opacity: 1,
    fillColor: col,
    fillOpacity: 0.85
  })

  d3.timer(function() {
    circle.setRadius(circleRadius * factor)
    factor -= 0.1;

    return (factor <= 1)
  });

  tweet.created_human = moment(tweet.created_at).format(time_fmt)

  lastUpdated.innerHTML = "" + tweet.created_human;

  tweet.feels = feels[Math.floor(tweet.sentiment.score)] || "average";
  tweet.feels = tweet.feels.toLowerCase();
  tweet.color = col

  var popupContent = tweetTemplate(tweet);

  circle.bindPopup(popupContent)

  circle.addTo(map);

  if (!hidePopup && map.getBounds().contains(pos)) {
    circle.openPopup();
  }

  tweet.circle = circle;
  tweets.push(tweet);

  removeOldTweets();
  calculateFeels();

}

function removeOldTweets() {
  // 10 minutes
  var limit = new Date().getTime() - (60 * 60 * 1000);

  function getTimestamp(tweet) {
    return new Date(tweet.created_at).getTime();
  }

  var i, t;

  for (i = 0; getTimestamp(tweets[i]) < limit; i++) {
    t = tweets[i];
    map.removeLayer(t.circle);
  }

  tweets.splice(0, i-1);

}



function calculateFeels () {

  var sum = 0;

  var i, l, t;
  for (i = 0, l = tweets.length; i < l; i++) {
    t = tweets[i];
    sum += t.sentiment.score;
  }

  avg = sum/tweets.length;

  var feel = feels[Math.floor(avg)];



  londonStatus.innerHTML = feel + ' <span class="tiny">(' + avgFormat(avg) +")</tiny>";

  londonStatus.style.color = color(avg);

}



