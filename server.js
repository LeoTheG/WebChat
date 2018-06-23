'use strict';

const express = require('express');
const SocketServer = require('ws').Server;
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const stream = require('stream');

// for username generation
var names = [];
var adjectives = [];
var usernames = [];


// reads names and adjectives files and stores in arrays
(function(){
  let instream = fs.createReadStream('./names.txt');
  const outstream = new stream;
  let rl = readline.createInterface(instream, outstream);


  rl.on('line',function(line){
    names.push(line);
  });

  instream = fs.createReadStream('./adjectives.txt');
  rl = readline.createInterface(instream, outstream);

  rl.on('line',function(line){
    adjectives.push(line);
  });
})();

const PORT = process.env.PORT || 3000;
//var server = express();

/*
server.use(express.static(__dirname))
      .use(express.static('public'))
      .use('/blog', function(req,res,next){
        res.sendFile('blog.html');
      })
      .listen(PORT, ()=>console.log('Listening on %d',PORT));
*/

  const server = express()
.use(express.static(__dirname))
  .use(express.static('public'))
  .use('/blog', function(req,res,next){
    res.sendFile(__dirname+ '/blog.html');
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`));

  const wss = new SocketServer({ server });

  var clients = [];

  wss.on('connection', function connection(ws) {
    ws.id = makeUsername();
    console.log("%s Connected to server",ws.id);
    ws.isAlive = true;
    ws.on('pong', ()=>{ws.isAlive=true});
    const welcomeMsg = {
      type: "server-message",
      text: "Welcome to Leo's chat room, " + ws.id +". Type \'!help\' for help",
    };
    ws.send(JSON.stringify(welcomeMsg));
    sendAllExcept("server-message",ws.id + " joined the chat room!",ws.id);
    const serverTime = {
      type: "server-time",
      text: new Date().toTimeString()
    }
    ws.send(JSON.stringify(serverTime));

    clients.push(ws);

    // message from client
    ws.on('message',function(msg){
      const userMsg = JSON.parse(msg);
      if(userMsg.type=="message"){
        userMsg.text = ws.id+": "+userMsg.text;

        wss.clients.forEach((client)=>{
          if(client==ws){
            userMsg.selfMsg = true;
          }
          else userMsg.selfMsg = false;
          client.send(JSON.stringify(userMsg));
        });
      }
      //command handling
      else if(userMsg.type=="command"){
        const command = userMsg.text;
        //changename
        if(command.substring(0,"changename".length)=="changename"){
          const requestedName = command.substring("changename".length).trim();
          let message = "Changed name to: " + requestedName;
          if(requestedName.length < 1){
            message = "Name too short";
          }
          // successfully change name
          else if(!usernames.includes(requestedName)){
            replaceUsername(ws.id,requestedName);
            ws.id = requestedName;
          }
          // name taken
          else{
            message = "Name already taken!";
          }
          ws.send(JSON.stringify(createMsg("server-message",message)));
        }
        //help
        else if(command.substring(0,"help".length)=="help"){
          const helpMsg = {
            type: "server-message",
            text: "Type \'!changename <some_name>\' to change your name! Type \'!users\' for a list of connected users",
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
            text: "users: " + userList
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

const ping = setInterval(()=>{
  clients.forEach((ws)=>{
    // check if open
    if(ws.readyState==ws.OPEN) ws.ping();
    else ws.isAlive = false;
    if(ws.isAlive === false){
      sendAll("server-message",ws.id +" has disconnected");
      removeClient(ws);
      return;
    }
    ws.isAlive = false;
  });
}, 1000);

// send time to clients
setInterval(() => {
  wss.clients.forEach((client) => {
    var msg = {
      type: "server-time",
      text: new Date().toTimeString()
    }
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

// called when user connects for first time
function makeUsername(){
  let numTries = 0;
  const maxTries = 50;
  let cont = true;
  let newUsername = null;
  // check taken usernames
  while((usernames.includes(newUsername) || cont ) && numTries < maxTries){
    if(usernames.includes(newUsername)){
    }
    numTries++;
    if(cont==true) cont=false;

    const randNameNum = Math.floor(Math.random() * names.length);
    const randAdjectiveNum = Math.floor(Math.random() * adjectives.length);
    newUsername = adjectives[randAdjectiveNum] + " " + names[randNameNum];
  }
  if(numTries < maxTries){
    usernames.push(newUsername);
  }
  else ws.close();
  return newUsername;
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

function replaceUsername(originalName, replacement){
  console.log("removing name:" + originalName);
  const indexToRemove = usernames.indexOf(originalName);
  if(indexToRemove > -1){
    usernames.splice(indexToRemove,1);
  }
  usernames.push(replacement);

}

function removeClient(ws){
  const indexToRemove = clients.indexOf(ws);
  if(indexToRemove > -1){
    clients.splice(indexToRemove,1);
  }
}

function log(ws,msg){
  ws.send(JSON.stringify(createMsg("server-message",msg)));
}
