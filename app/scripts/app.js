/** @jsx React.DOM */

var React = window.React = require('react');
var moment = require('moment');
var io = require('socket.io-client')
var d3 = require('d3');
var feels = require('./feels');
var tweetTemplate = require('./ui/tweet.html');

var L = require('leaflet');

L.Icon.Default.imagePath = '/images/';

var url = "";// "http://localhost:3080";

this.socket = io(url);

var avgFormat = d3.format(".2f");
var color = d3.scale.linear()
   .domain([-10,10])  // min/max of data
   .range(["rgb(250, 20, 100)", "rgb(30, 120, 250)"])
   .interpolate(d3.interpolateHcl);


var mapCont = document.querySelector('#map');

function resizeMap () {

  mapCont.style.height = ((window.innerHeight * 0.8) | 0) + "px";
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
  tweets.map(drawPoint);
})



this.socket.on('tweet', drawPoint);

var tweets = [];

var time_fmt = "HH:mm - D MMM YYYY";

function drawPoint (tweet) {

  if (!tweet.coordinates) {
    return;
  }

  // the coordinates need reversing - terrible names.
  var pos = tweet.coordinates.coordinates.reverse();

  var col = color(tweet.sentiment.score);

  var circle = L.circle(pos, circleRadius, {
    color: col,
    weight: 2,
    opacity: 1,
    fillColor: col,
    fillOpacity: 0.85
  })


  tweet.created_human = moment(tweet.created_at).format(time_fmt)

  var popupContent = tweetTemplate(tweet);

  circle.bindPopup(popupContent)

  circle.addTo(map);

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

var londonStatus = document.querySelector('span.feeling');

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



