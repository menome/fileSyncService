/*
 * Copyright (C) 2017 Menome Technologies Inc.
 *
 * Add functions that build CQL queries to add links to Facets.
 * TODO: These should be swift and synchronous. We'll need a better framework for async queries.
 * (Such as more in-depth ML/NLP/TM strategies.)
 */
var helpers = require('../app/helpers');
var Query = require('decypher').Query;

 
module.exports = [
  
  // BASE FILE HANDLING
  // If any Facet shares a name with a folder on this guy's filepath, attach it.
  function(fileObj) {
    // dont run if this is an image
    if(helpers.isImage(fileObj.urlWithBucket)) return null;

    // for now assume site exists.
    var nodeNames = fileObj.urlWithBucket.split('/');
    if(nodeNames.length < 1) return null;
    var siteCode=nodeNames[1].substring(0,6);

    var query = new Query();
    query.match("(f:File:Card), (c:Site)");
    query.where("f <> c AND f.Uri  = {uri} AND c.Code contains {siteCode}",{uri: fileObj.urlWithBucket, siteCode: siteCode});
    query.merge("(f)-[:FILE_ATTACHED_TO]->(c)");
    return query;
  },

    // extract file extention as facet
    function(fileObj) {
      // for now assume site exists.
      var fileExt = fileObj.urlWithBucket.split('.').pop();
      if(fileExt.length > 4) return null;
      var fileTypeStr="(c:FileType:Facet {Name:'" + fileExt.toLowerCase() + "'})";
      var query = new Query();
      query.match("(f:File:Card)");
      query.where("f.Uri = {uri} ",{uri: fileObj.urlWithBucket});
      query.merge(fileTypeStr);
      query.merge("(f)-[:HAS_FACET]->(c)");
      return query;
    },

  // geotech reports
  function(fileObj){
     // dont run if this is an image
      if(helpers.isImage(fileObj.urlWithBucket)) return null;

      var filename = fileObj.urlWithBucket.toLowerCase(); 
      var query = new Query();
      query.match("(f:File:Card), (c:ReportType {Name:'Geotechnical Report'})");
      query.where("f <> c AND f.Uri = {uri} AND lower({uri}) contains 'geotech'",{uri: fileObj.urlWithBucket});
      query.merge("(f)-[:HAS_FACET]->(c)");
      return query;
    }, 
    // schematic reports
      function(fileObj){
         // dont run if this is an image
        if(helpers.isImage(fileObj.urlWithBucket)) return null;

        var query = new Query();
        query.match("(f:File:Card), (c:ReportType {Name:'SD Report'})");
        query.where("f <> c AND f.Uri  = {uri} AND lower({uri}) contains 'schema'",{uri: fileObj.urlWithBucket});
        query.merge("(f)-[:HAS_FACET]->(c)");
        return query;
      },
     // development reports
      function(fileObj){
         // dont run if this is an image
        if(helpers.isImage(fileObj.urlWithBucket)) return null;

        var query = new Query();
        query.match("(f:File:Card), (c:ReportType {Name:'DD Report'})");
        query.where("f <> c AND f.Uri  = {uri} AND lower({uri}) contains 'dd report' or lower({uri}) contains 'devel'",{uri: fileObj.urlWithBucket});
        query.merge("(f)-[:HAS_FACET]->(c)");
        return query;
      },
      // tecnical design reports
      function(fileObj){
        if(helpers.isImage(fileObj.urlWithBucket)) return null;

          var query = new Query();
        query.match("(f:File:Card), (c:ReportType {Name:'TD Report'})");
        query.where("f <> c AND f.Uri  = {uri} AND lower({uri}) contains 'td report' or lower({uri}) contains 'technical'",{uri: fileObj.urlWithBucket});
        query.merge("(f)-[:HAS_FACET]->(c)");
        return query;
      },
      // final reports
      function(fileObj){
        if(helpers.isImage(fileObj.urlWithBucket)) return null;

        var query = new Query();
        query.match("(f:File:Card), (c:ReportType {Name:'Final Report'})");
        query.where("f <> c AND f.Uri  = {uri} AND lower({uri}) contains 'final'",{uri: fileObj.urlWithBucket});
        query.merge("(f)-[:HAS_FACET]->(c)");
        return query;
      },
      // structural reports
      function(fileObj){
        if(helpers.isImage(fileObj.urlWithBucket)) return null;

        var query = new Query();
        query.match("(f:File:Card), (c:ReportType {Name:'Structural Report'})");
        query.where("f <> c AND f.Uri = {uri} AND lower({uri}) contains 'structural'",{uri: fileObj.urlWithBucket});
        query.merge("(f)-[:HAS_FACET]->(c)");
        return query;
      },

      // link up the images
      // use UUID off upload object to look up project node 
      function(fileObj){
        // pull the project UUID
        var nodeNames = fileObj.urlWithBucket.split('/');
        if(nodeNames.length < 1) return null;
        var projectUuid=nodeNames[1];

        var query = new Query();
        query.match("(f:File:Card)");
        query.where("f.Uri  = {uri} ",{uri: fileObj.urlWithBucket});
        query.match("(p:Project:Card)");
        query.where("p.Uuid={projectUuid} set f.ProjectName=p.Name",{projectUuid: projectUuid});
        query.merge("(f)-[:FILE_ATTACHED_TO]->(p)");
        return query;
      },

      // wire up hero images
      // link up the images
      // use UUID off upload object to look up project node - set if no hero (profileImage)
      function(fileObj){
        // pull the project UUID
        var nodeNames = fileObj.urlWithBucket.split('/');
        if(nodeNames.length < 1) return null;
        var projectUuid=nodeNames[1];

        var query = new Query();
        query.match("(p:Project:Card)");
        query.where("p.Uuid={projectUuid} and not exists(p.ProfileImage) set p.ProfileImage={url}",{projectUuid: projectUuid,url:fileObj.urlWithBucket});
        return query;
      },

      // wire up hero images
      // link up the images
      // use UUID off upload object to look up project node - set if no photo (photoURl)
      function(fileObj){
        // pull the project UUID
        var nodeNames = fileObj.urlWithBucket.split('/');
        if(nodeNames.length < 1) return null;
        var projectUuid=nodeNames[1];

        var query = new Query();
        query.match("(p:Project:Card)");
        query.where("p.Uuid={projectUuid} and not exists(p.PhotoUrl) set p.PhotoUrl={url}",{projectUuid: projectUuid,url:fileObj.urlWithBucket});

        return query;
      }


];