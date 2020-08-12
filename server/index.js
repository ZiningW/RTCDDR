const webSocketsServerPort = 8000;
const webSocketServer = require('websocket').server;
const http = require('http');
// Spinning the http server and the websocket server.
const server = http.createServer();
server.listen(webSocketsServerPort);
const wsServer = new webSocketServer({
  httpServer: server
});

// Generates unique ID for every new connection
const getUniqueID = () => {
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return s4() + s4() + '-' + s4();
};

// all active connections in this object
const clients = {};
// all active users in this object
const users = {};
// keep track of who's Simon
var simon = null;
// keep track of followers
const followers = [];

// User activity history.
let userActivity = [];

const sendMessage = (json, sender) => {
  // We are sending the current data to all connected clients except for sender
  Object.keys(clients).map((client) => {
    if (clients[client] !== sender){
      clients[client].sendUTF(json);
    }
  });
}

const sendMessage2Self = (json, sender) => {
  // We are sending the current data back to sender
  Object.keys(clients).map((client) => {
    if (clients[client] === sender){
      clients[client].sendUTF(json);
    }
  });
}

const typesDef = {
  USER_EVENT: "userevent",
  KEYPOINT: "keypoint"
}

const roleDef = {
  SIMON: "simon",
  FOLLOWER: "follower"
}


wsServer.on('request', function(request) {
  var userID = getUniqueID();
  console.log((new Date()) + ' Recieved a new connection from origin ' + request.origin + '.');
  const connection = request.accept(null, request.origin);
  clients[userID] = connection;
  console.log('connected: ' + userID + ' in ' + Object.getOwnPropertyNames(clients));

  // On login, check if SIMON is available and determine whether or not to show the Join as SIMON button

  if (simon === null){
    sendMessage2Self("SIMON AVAILABLE", connection)
    console.log("available")
  } else {
    sendMessage2Self("SIMON UNAVAILABLE", connection)
    console.log("SIMON Role Unavailable")
  }

  connection.on('message', function(message) {
    message['id'] = userID

    if (message.type === 'utf8') {

      const dataFromClient = JSON.parse(message.utf8Data);
      const json = { type: dataFromClient.type };

      if (dataFromClient.type === typesDef.USER_EVENT) {
        // Check if the message was a USER_EVENT i.e. login
        users[userID] = dataFromClient;
        if (dataFromClient.role === roleDef.SIMON){
          sendMessage2Self(roleDef.SIMON, connection)
          simon = userID
          console.log(userID + " joined as SIMON")
        } else {
          sendMessage2Self(roleDef.FOLLOWER, connection)
          console.log(userID + " joined as a FOLLOWER")
          followers.push(userID)
        }
        userActivity.push(`${dataFromClient.username} joined the room as `, dataFromClient.role);
        json.data = { users, userActivity };

      } else if (dataFromClient.type === typesDef.KEYPOINT) {
        // Check if the message was a Keypoint i.e. movement from SIMON

        editorContent = dataFromClient.content;
        json.data = { dataFromClient, userActivity };

      }
      sendMessage(JSON.stringify(json), connection);
    }
  });
  
  // user disconnected
  connection.on('close', function(connection) {
    // console.log('users[userID]', users[userID])
    // console.log('users[userID].username', users[userID].username)
    if (users[userID] !== null){
      if (simon === userID) {
        simon = null;
        console.log(userID + "SIMON Left")
      }
      console.log((new Date()) + " Peer " + userID + " disconnected.");
      const json = { type: typesDef.USER_EVENT };
      userActivity.push(`${users[userID].username} left the document`);
      json.data = { users, userActivity };
      delete clients[userID];
      delete users[userID];
      sendMessage(JSON.stringify(json));
    }
  });

});
