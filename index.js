exports.handler = async (event) => {
    return new Promise((resolve, reject) => {
        params = {};

        for (let seg of event.body.split('&')){
          let parts = seg.split('=');
          params[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
        }

        for (let field of ['Level', 'Score', 'Game']){
          if (!params[field]){
            resolve({statusCode: 400, body: JSON.stringify({Error: `Field '${field}' is required`})});
            return;
          }
        }

        // Load the AWS SDK for Node.js
        var AWS = require('aws-sdk');
        // Set the region
        AWS.config.update({region: 'us-east-1'});

        // Create the DynamoDB service object
        var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

        const id = Math.round(Math.random() * 10000000000);

        var item = {};

        for (let k in params){
          if (k != 'Game' && k != 'Score' && k != 'Level'){
            item[k] = {S: params[k]};
          }
        }

        item['GameLevel'] = {S: `${params['Game']}-${params['Level']}`};
        item['Game'] = {S: `${params['Game']}`};
        item['Level'] = {S: `${params['Level']}`};
        item['Id'] = {N: id.toString()};
        item['Score'] = {N: params['Score']};
        item['Ip'] = {S: event.requestContext.identity.sourceIp};
        item['Timestamp'] = {S: new Date().toUTCString()};

        var params = {
          TableName: 'Scores',
          Item: item
        };

        const response = {
            statusCode: 200,
            body: `???`
        };

        ddb.putItem(params, function(err, data) {
          if (err) {
            console.log("Error", err);
            reject(`Error: ${err}`);
          } else {
            console.log("Success", data);

            var params = {
              ExpressionAttributeValues: {
               ":v1": item['GameLevel']
              },
              KeyConditionExpression: "GameLevel = :v1",
              ScanIndexForward: false,
              IndexName: "GameLevel-Score-index",
              TableName: "Scores",
              Limit: 10,
            };
            ddb.query(params, function(err, data) {
              if (err){
                reject(err);
              } else {
                let responseJson = [];

                for (let row of data.Items){
                  let responseRow = {};
                  responseRow['IsYou'] = row['Id']['N'] == id;
                  for (let k in row){
                    if (k != 'Id' || k != 'Ip' || k != 'Timestamp'){
                        responseRow[k] = row[k].S ? row[k].S : row[k].N;
                    }
                  }
                  responseJson.push(responseRow);
                }

                response.body = JSON.stringify(responseJson);

                resolve(response);
              }
             });
          }
        });
    });
};
