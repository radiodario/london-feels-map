/** @jsx React.DOM */

var React = window.React = require('react');

var io = require('socket.io-client')
var d3 = require('d3');

var tweetTemplate = require('./ui/tweet.html');

var L = require('leaflet');

L.Icon.Default.imagePath = '/images/';

this.socket = io("http://localhost:3080");

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
map.setView([51.502, -0.08], 12);

var mapSource = "//stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png"

var old = 'http://{s}.tile.osm.org/{z}/{x}/{y}.png'

// add an OpenStreetMap tile layer
L.tileLayer(mapSource, {
    attribution: '&copy; Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://www.openstreetmap.org/copyright">ODbL</a>.'
}).addTo(map);

// add a marker in the given location, attach some popup content to it and open the popup


this.socket.on('tweet', drawPoint);




function drawPoint (tweet) {

  if (!tweet.coordinates) {
    return;
  }
  // the coordinates need reversing - terrible names.
  var pos = tweet.coordinates.coordinates.reverse();

  var col = color(tweet.sentiment.score);

  var circle = L.circle(pos, 40, {
    color: col,
    weight: 2,
    opacity: 1,
    fillColor: col,
    fillOpacity: 0.85
  })

  var popupContent = tweetTemplate(tweet);

  circle.bindPopup(popupContent)

  circle.addTo(map);
  // circle.openPopup()


}



