var fs = require('fs');
var path = require('path');

var request = require('superagent');
var async = require('async');
var _ = require('lodash');

var yargs = require('yargs');
var chalk = require('chalk');

var workshops = require('./workshops').list;

var argv = yargs.argv;
var jsonRes;

var githubReposUrl = 'https://api.github.com/repos';
var workshopperUrlSuffix = 'contents/exercises/menu.json';
var adventureUrlSuffix = 'contents/menu.json';


async.each(workshops, function(workshop) {
  async.waterfall([
    function(callback) {
      if(workshop.excercises) {
        callback(null, workshop, null);
      }
      else {
        var menuUrl;
        if(workshop.type === "workshopper") {
          menuUrl = githubReposUrl + '/' + workshop.owner + '/' + workshop.name + '/' + workshopperUrlSuffix;
        } else if(workshop.type === "adventure") {
          menuUrl = githubReposUrl + '/' + workshop.owner + '/' + workshop.name + '/' + adventureUrlSuffix;
        }
        request
          .get(menuUrl)
          .end(function(err, res) {
            if(err) throw err;
            jsonRes = JSON.parse(res.text);
            callback(null, workshop, jsonRes.download_url);
          });
      }
    }, 
    function(workshop, menuDownloadUrl, callback) {
      if(!menuDownloadUrl) {
        callback(null, workshop, null);
      } else {
        request
          .get(menuDownloadUrl)
          .end(function(err, res) {
            if(err) throw err;
            jsonRes = JSON.parse(res.text);
            callback(null, workshop, jsonRes);
          });
      }
    },
    function(workshop, menu, callback) {
      if(!menu) {
        menu = workshop.excercises;
      }
      var names = _.map(menu, function(val, index) {
        var filename = "";
        if(workshop.numbered) {
          val = val.split(" ").splice(1).join(" "); //remove numbering added at the beginning
        }
        filename += _.padLeft((index+1), 2, '0') + ' ';
        filename += val + '.js';
        return filename
          .toLowerCase()
          .replace(/ /g, '-')
          .replace(/\//g, '')
          .replace(/\:/g, '')
          .replace(/\!/g, '');
      });
      callback(null, workshop, names);
    },
    function(workshop, files, callback) {
      var cwd = process.cwd();
      var workshopDirPath = path.join(cwd, 'workbook', workshop.track, workshop.name);
      var workshopFilePath;
      fs.mkdir(workshopDirPath, function(err) {
        _.forEach(files, function(file) {
          workshopFilePath = path.join(workshopDirPath, file);
          fs.open(workshopFilePath, "wx", function(err, fd) {
            if(err) throw err;
            fs.close(fd, function(err) {
              if(err) throw err;
            });
          });
        });
        callback(null, workshop);
      });
    }
  ], function(err, workshop) {
    console.log(workshop.name + " done!");
  });
}, function(err) {
  if(err) throw err;
});