'use strict';

const express = require('express');
const SocketServer = require('ws').Server;
const path = require('path');

const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, 'index.html');

const server = express()
  .use((req, res) => res.sendFile(INDEX) )
  .listen(PORT, () => console.log(`Listening on ${ PORT }`));

const wss = new SocketServer({ server });

wss.on('connection', function connection(ws) {
  console.log("Connected to server");
  ws.id = makeid();
  const welcomeMsg = {
    type: "server-message",
    text: "Welcome to Leo's chat room, " + ws.id +". Type \'!help\' for help",
  };
  ws.send(JSON.stringify(welcomeMsg));
  sendAllExcept("server-message",ws.id + " joined the chat room with ip: "+ws._socket.remoteAddress +"!",ws.id);
  const serverTime = {
      type: "server-time",
      text: new Date().toTimeString()
  }
  ws.send(JSON.stringify(serverTime));

	// message from client
  ws.on('message',function(msg){
		const userMsg = JSON.parse(msg);
		if(userMsg.type=="message"){
			userMsg.text = ws.id+": "+userMsg.text;
      wss.clients.forEach((client)=>{
        client.send(JSON.stringify(userMsg));
      });
		}
    //command handling
		else if(userMsg.type=="command"){
			const command = userMsg.text;
      //changename
			if(command.substring(0,"changename".length)=="changename"){
				ws.id=command.substring("changename".length);
        ws.send(JSON.stringify(createMsg("server-message","Changed name to: " + ws.id)));
			}
      //help
      else if(command.substring(0,"help".length)=="help"){
        const helpMsg = {
          type: "server-message",
          text: "Type \'!changename <some_name>\' to change your name!",
        };
        ws.send(JSON.stringify(helpMsg));
      }
      //users
      else if(command.substring(0,"users".length)=="users"){
        let userList="";
        wss.clients.forEach((client)=>{
          if(userList.length>0)
            userList += ", "+client.id;
          else userList += client.id;
        });
        const usersMsg = {
          type: "server-message",
          text: "userList: " + userList
        };
        ws.send(JSON.stringify(usersMsg));
      }
    }
  });
});
function createMsg(msgType,msgText){
  let msg = {
    type: msgType,
    text: msgText
  }
  return msg;
}

// send time to clients
setInterval(() => {
  wss.clients.forEach((client) => {
    var msg = {
      type: "server-time",
      text: new Date().toTimeString()
    }
    //client.send(new Date().toTimeString());
    client.send(JSON.stringify(msg));
    });
}, 1000);

function makeid() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 5; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

function sendAll(msgType, msgText){
  const msg = {
    type: msgType,
    text: msgText
  };
  wss.clients.forEach((client)=>{
    client.send(JSON.stringify(msg));
  });
}
function sendAllExcept(msgType, msgText, id){
const msg = {
    type: msgType,
    text: msgText
  };
  wss.clients.forEach((client)=>{
    if(client.id != id)
    client.send(JSON.stringify(msg));
  });
}
