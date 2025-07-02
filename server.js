// server/index.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { Lobby } = require('./lobby.js');
// const { console } = require('inspector');

const app = express();
app.use(cors({
  origin: "https://group-6-vac-work-git-main-grindelwaldts-projects.vercel.app", // your frontend domain
  methods: ["GET", "POST"],
  credentials: true
}));
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    // origin: "https://group-6-vac-work.vercel.app", // Next.js runs on 3000 by default
    origin: "https://group-6-vac-work-git-main-grindelwaldts-projects.vercel.app", // Next.js runs on 3000 by default
    methods: ["GET", "POST"],
    // credentials: true
  }
});

let curr_players = [];
let lobbies = [];
let num_lobbies = 0;
const pendingLogins = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });

  // socket.on("Player-ID-Joined", (Player_ID) => {
  //   if (curr_players.includes(Player_ID)) {
  //     console.log("Player in session")
  //   } else {
  //     curr_players.push(Player_ID)
  //     console.log(Player_ID + " Player added to session")
  //   }
  // });

  // socket.on("Get-Lobby-Status", () => {
  //   console.log("getting lobby status")
  //   socket.emit("Give-Lobby-Status", (num_lobbies));
  // });

  socket.on("Create-Lobby-Request", () => {
    console.log("adding lobby")
    // if (lobbies.length > 5) {
    //   console.log("lobby capacity full")
    //   return;
    // }
    let lobby_id = lobbies.length
    lobbies.push(new Lobby(lobby_id))
    socket.emit("Lobby-Created", lobby_id)
    console.log("lobby created")
  });

  socket.on("Request-To-Join-Lobby", (data) => {
    console.log(data)
    if (lobbies.length <= data.id) {
      console.log(lobbies.length + ", " + data.id);
      return; //add stuff
    }
    if (lobbies[data.id].add_player(data.player_id, data.player_number))
    {
      socket.emit("Player-Added-To-Lobby")
    }
    // add stuff (socket that handels if player did not join lobby)
  });

  socket.on("Request-To-Join-Team", (data) => {
    console.log(data)
    if (lobbies.length <= data.id) {
      console.log(lobbies.length + ", " + data.id);
      return; //add stuff
    }
    lobbies[data.id].add_player_to_team(data.player_id, data.team);
    if (data.team == 1) {
      socket.emit("Player-Added-To-Team", lobbies[data.id].team1)
    } else {
      socket.emit("Player-Added-To-Team", lobbies[data.id].team2)
    }
    io.emit("Teams-Updated", [data.id, lobbies[data.id].team1, lobbies[data.id].team2])
  });

  socket.on("Leave-Lobby", (data) => {
    console.log("Removing player from lobby")
    if (lobbies.length <= data.id) {
      console.log(lobbies.length + ", " + data.id);
      return; //add stuff
    }
    lobbies[data.id].remove_player_from_lobby(data.player_id);
    if (lobbies[data.id].total_players === 0) {
      // add stuff -> remove lobby if empty.
      console.log("Deleting lobby")
    }
    
  });

  socket.on("Get-Existing-Lobbies", () => {
    let temp_lobbies = [];
    for (let index = 0; index < lobbies.length; index++) {
      temp_lobbies.push({id: index, lobbyName: "temp_name", players_length: lobbies[index].total_players})  
    }
    socket.emit("Lobbies-List",temp_lobbies);
  });

  socket.on("Get-Existing-Lobbies", () => {
    let temp_lobbies = [];
    for (let index = 0; index < lobbies.length; index++) {
      temp_lobbies.push({id: index, lobbyName: "temp_name", players_length: lobbies[index].total_players})  
    }
    socket.emit("Lobbies-List",temp_lobbies);
  });

  socket.on("Player-ready", (data) => {
    if (lobbies.length <= data.id) {
      console.log(lobbies.length + ", " + data.id);
      return; //add stuff
    }
    lobbies[data.id].set_player_ready(data.player_id, true);
    
    if(lobbies[data.id].start_game()) {
      io.emit("Start-Game", data.id)
    }
  });

  socket.on("Fire-Gun", (data) => {
    if (lobbies.length <= data.id) {
      console.log(lobbies.length + ", " + data.id);
      return; //add stuff
    }
    console.log(data)
    console.log("fire " + data.player_id + " " + data.number)
    if (lobbies[data.id].player_shot(data.player_id, data.number)) {
      // Player has been shot so I need to tell they player that they have been shot
      io.emit("Take-Damage", {id: data.id, player_id: lobbies[data.id].get_player_id_from_player_number(data.number), damage: data.damage})
      io.emit("Update-Score", {id: data.id, team1_points: lobbies[data.id].team1_points, team2_points: lobbies[data.id].team2_points})
      socket.emit("Increase-Player-Points", data.damage);
    }
  });

  socket.on("Player-Died", (data) => {
    if (lobbies.length <= data.id) {
      console.log(lobbies.length + ", " + data.id);
      return; //add stuff
    }
    lobbies[data.id].player_died(data.player_id);
    io.emit("Update-Score", {id: data.id, team1_points: lobbies[data.id].team1_points, team2_points: lobbies[data.id].team2_points})
    socket.emit("Increase-Player-Points", -100);
    
  });

  // When a user requests to log in
  socket.on("Login-Request", (requestedUsername) => {
    console.log(`Login request for ${requestedUsername}`);

    // Broadcast to others to check if ID is alive
    io.emit("Is-ID-Alive", requestedUsername);

    // Set timeout for 1 second
    const timeout = setTimeout(() => {
      // No one claimed the ID; approve login
      socket.emit("Login-approved", requestedUsername);
      pendingLogins.delete(requestedUsername);
      console.log(`No response for ${requestedUsername}, login approved`);
    }, 1000);

    // Save reference to socket and timer
    pendingLogins.set(requestedUsername, { socket, timeout });
  });

  // If some other client claims the ID is alive
  socket.on("ID-Alive", () => {
    for (const [username, { socket: requesterSocket, timeout }] of pendingLogins.entries()) {
      clearTimeout(timeout);
      requesterSocket.emit("Login-denied", username); // 💡 Emit denial message
      pendingLogins.delete(username);
      console.log(`Login denied for ${username}: ID already in use`);
    }
  });

});

httpServer.listen(4000, () => {
  console.log("Socket.IO server listening on http://192.168.46.56:4000");
});

// let lobbies = []
// lobbies.push(new Lobby(1));
// testing_player_join_lobby
// console.log(lobbies[0].add_player('p1',1))
// console.log(lobbies[0].add_player('p2',2))
// console.log(lobbies[0].add_player('p3',3))
// console.log(lobbies[0].add_player('p4',4))
// console.log(lobbies[0].add_player('p5',5))
// console.log(lobbies[0].add_player('p6',6))
// console.log(lobbies[0].add_player('p1'))
// console.log(lobbies[0].add_player('p2'))
// console.log(lobbies[0].add_player('p3'))
// console.log(lobbies[0].add_player('p4'))
// console.log(lobbies[0].add_player('p5'))
// console.log(lobbies[0].add_player('p6'))
// lobbies[0].start_game()

// // joining teams test
// console.log(lobbies[0].add_player_to_team('p1',1))
// console.log(lobbies[0].add_player_to_team('p2',1))
// console.log(lobbies[0].add_player_to_team('p3',1))
// console.log(lobbies[0].add_player_to_team('p4',2))
// console.log(lobbies[0].add_player_to_team('p5',2))
// console.log(lobbies[0].add_player_to_team('p6',2))
// console.log(lobbies[0].add_player_to_team('p4',1))
// console.log(lobbies[0].add_player_to_team('p5',1))
// console.log(lobbies[0].add_player_to_team('p6',1))
// console.log(lobbies[0].add_player_to_team('p7',1))
// lobbies[0].start_game()

// // leaving teams test
// console.log(lobbies[0].remove_player_from_team('p1'))
// lobbies[0].start_game()
// console.log(lobbies[0].remove_player_from_team('p1'))
// console.log(lobbies[0].add_player_to_team('p7'))
// console.log(lobbies[0].add_player_to_team('p1',1))

// // leaving lobby test
// console.log(lobbies[0].remove_player_from_lobby('p7'))
// console.log(lobbies[0].remove_player_from_lobby('p1'))
// lobbies[0].start_game()
// console.log(lobbies[0].add_player('p1',1))
// lobbies[0].start_game()
// console.log(lobbies[0].add_player_to_team('p1',1))

// // capturing flag
// console.log(lobbies[0].flag_captured('p1',1))
// console.log(lobbies[0].flag_captured('p1',2))
// console.log(lobbies[0].flag_captured('p7',1))
// console.log(lobbies[0].flag_captured('p4',1))

// // shooting player
// console.log(lobbies[0].player_shot('p1',1))
// console.log(lobbies[0].player_shot('p1',2))
// console.log(lobbies[0].player_shot('p1',4))
// console.log(lobbies[0].player_shot('p1',4))
// console.log(lobbies[0].player_shot('p4',4))
// console.log(lobbies[0].player_shot('p4',5))
// console.log(lobbies[0].player_shot('p4',1))
// console.log(lobbies[0].player_shot('p7',1))

// // getting player id if shot
// console.log(lobbies[0].get_player_id_from_player_number(1))
// console.log(lobbies[0].get_player_id_from_player_number(2))
// console.log(lobbies[0].get_player_id_from_player_number(7))

// // test player dead
// lobbies[0].player_died('p1')
// lobbies[0].player_died('p4')
// lobbies[0].player_died('p7')

// //test end game
// lobbies[0].end_game();


