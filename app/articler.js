/*
 * Copyright (C) 2017 Menome Technologies Inc.
 *
 * Entry point for parsing an article and extracting text
 */
var conf = require('./config');
var amqp = require('amqplib/callback_api');
var bot = require('@menome/botframework');
var queryBuilder = require('./queryBuilder');
var metascraper = require('metascraper');
var extractor = require('unfluff');
var request = require('request');
var conf = require('./config');
var rabbitListener = require('./rabbitListener');

module.exports = {
  addArticle
}

function addArticle(url, rabbitClient) {
  return new Promise(function (resolve) {
    bot.logger.info("Articler has started.");
    var articleInfo = {
      "Name": "string",
      "Key": url.slice(1, -1),
      "NodeType": "string",
      "Properties": {
        "Description": "string",
        "ImageURL": "string",
        "FullText": "string",
        "Author": "string",
        "DatePublished": "string",
        "Publisher": "string",
        "FullText": "string"
      },
      "Connections": []
    };

    var actions = [];
    actions.push(extractMetadata(url, articleInfo));
    actions.push(extractFullText(url, articleInfo));
    // Wait for all actions to finish.
    Promise.all(actions)
      .then(function (result) {
        //bot.logger.info("Finished Extracting text\n" + JSON.stringify(articleInfo));
        //Now we need to add it to the neo4j graph
        //build the query
        var queryObj = queryBuilder.addArticleQuery(articleInfo);

        bot.query(queryObj.compile(), queryObj.params())
          .then(function (result) {
            var request = {
              EventType: "ModelArticle",
              Key: articleInfo.Key
            }
            bot.logger.info("Added Article info");

            //now we send over to the topic modeler
            rabbitListener.rabbitClientOutgoing.publishMessage(request)
            resolve();
          })
          .catch(function (error) {
            bot.logger.error("Could not add article info %s", err.message);
            resolve(error);
          })
      })
      .catch(function (error) {
        bot.logger.error("Operation failed: %s", error.message);
        resolve(error);
      });
  });
}

function extractFullText(url, articleInfo) {
  bot.logger.info("Extracting fullText article");
  return new Promise(function (resolve) {
    request(url.slice(1, -1), function (error, response, body) {
      if (error) {
        return resolve(error);
      }
      data = extractor(body);
      articleInfo.Properties.FullText = data.text.replace(/(\r\n|\n|\r)/gm, "").substr(0, 29000);
      //bot.logger.info(articleInfo.Properties.FullText);
      return resolve(response);
    })
  })
}

function extractMetadata(url, articleInfo) {
  //use the metascraper to scrape the data
  return new Promise(function (resolve) {
    try {
      bot.logger.info("Starting Scraper on URL: <" + url + ">");
      metascraper.scrapeUrl(url.slice(1, -1)).then((metadata) => {
        bot.logger.info("Scraper has returned!");
        articleInfo.Name = metadata.title;
        articleInfo.NodeType = 'Article';
        articleInfo.Properties.Description = metadata.description;
        articleInfo.Properties.ImageURL = metadata.image;
        articleInfo.Properties.Author = metadata.author;
        articleInfo.Properties.Publisher = metadata.publisher;
        articleInfo.Properties.DatePublished = metadata.date;

        return resolve(metadata);
      })
    } catch (err) {
      bot.logger.error("Caught that goddam error" + err);
      return resolve(err);
    }
  });
}