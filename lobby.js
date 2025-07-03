export class Lobby {
  constructor(lobby_ID) {
    this.players = {};
    this.team1 = {};
    this.team2 = {};
    this.team1_points = 0;
    this.team2_points = 0;
    this.lobby_ID = lobby_ID;
    this.total_players = 0;
    this.game_start_time = 0;
    this.game_live = false;
    this.team1_flag_id = 1;
    this.team2_flag_id = 2;
    this.heal_id = 3;
    this.name = "Game " + lobby_ID;
  }

  add_player(Player_ID, player_number) {
    if (this.players[Player_ID]) return false; // already in lobby
    const player = { id: Player_ID, number: player_number, b_player_ready : false, b_player_alive : true };
    this.players[Player_ID] = player;
    this.total_players++;
    return true;
  }

  set_player_ready(Player_ID, bState) {
    if (!this.players[Player_ID]) return false; // player does not exist
    this.players[Player_ID].b_player_ready = bState;
    return true;
  }

  remove_player_from_team(Player_ID) {
    if (this.team1[Player_ID]) {
      delete this.team1[Player_ID];
      return true;
    }
    if (this.team2[Player_ID]) {
      delete this.team2[Player_ID];
      return true;
    }
    console.warn(`Player ${Player_ID} not in a team`)
    return false; // not on any team
  }

  remove_player_from_lobby(Player_ID) {
    // Check if player exists
    if (!this.players[Player_ID]) {
      console.warn(`Player ${Player_ID} not in lobby`);
      return false;
    }
    // Remove from teams if present
    delete this.team1[Player_ID];
    delete this.team2[Player_ID];

    // Remove from lobby
    delete this.players[Player_ID];
    this.total_players = Math.max(0, this.total_players - 1);
    console.warn(`Player ${Player_ID} removed`);
    return true;
  }

  add_player_to_team(Player_ID, team) {
    if (!this.players[Player_ID]) {
      console.warn(`Player ${Player_ID} not in lobby`);
      return false;
    }
    // already on a team?
    if (this.team1[Player_ID] || this.team2[Player_ID]) {
      console.warn(`Player ${Player_ID} already in a team`);
      this.remove_player_from_team(Player_ID);
    }

    if (team == 1) {
      this.team1[Player_ID] = this.players[Player_ID];
    } else {
      this.team2[Player_ID] = this.players[Player_ID];
    }
    return true;
  }

    flag_captured(Player_ID, team) {
        // team = which team scored (1 or 2), Player_ID is the capturer
        // Validate player is on the scoring team:
        const capturerTeam = (this.team1[Player_ID] ? 1 : this.team2[Player_ID] ? 2 : null);
        if (capturerTeam === null) {
            console.warn(`Invalid capture: player ${Player_ID} not on a team`);
            return false;
        }
        if (capturerTeam == team) {
            console.warn(`Invalid capture: player ${Player_ID} is on team ${team}`);
            this.players[Player_ID].b_player_alive = true;
            return true; //heal
        }
        if (team == 2) {
            this.team1_points += 200;
        } else {
            this.team2_points += 200;
        }
        console.warn(`Player ${Player_ID} captured flag of team ${team}`);
        return false;
    }

    player_shot(Player_ID, target_player_number) {
        const shooter = this.players[Player_ID];
        if (!shooter) {
        console.warn(`Shooter ${Player_ID} not found`);
        return false;
        }

        if (shooter.b_player_alive) {
          return false;
        }

        // find target by number
        const targetEntry = Object.values(this.players)
        .find(p => p.number == target_player_number);
        if (!targetEntry) {
          console.log(this.players)
        console.warn(`Target with number ${target_player_number} not found`);
        return false;
        }

        const targetID = targetEntry.id;

        // Check teams
        const shooterTeam = this.team1[Player_ID] ? 1 : this.team2[Player_ID] ? 2 : null;
        const targetTeam = this.team1[targetID] ? 1 : this.team2[targetID] ? 2 : null;

        if (!shooterTeam || !targetTeam) {
        console.warn("One of the players isn't on any team");
        return false;
        }
        if (shooterTeam === targetTeam) {
        console.warn("Friendly fire isn't allowed");
        return false;
        }
        if (shooterTeam === 1) {
            this.team1_points += 10;
        } else {
            this.team2_points += 10;
        }
        console.warn(`Player ${Player_ID} shot${target_player_number}`);
        return true;
    }

    flag_shot(target_player_number) {
      if (target_player_number == this.team1_flag_id) {
        return 1;
      } else if (target_player_number == this.team2_flag_id) {
        return 2
      }
      return 0;
    }

    heal_shot(target_player_number) {
      console.log("Heal shot " + target_player_number + " " + this.heal_shot)
      if (target_player_number == this.heal_id) {
        this.players[Player_ID].b_player_alive = true;
        return true;
      }
      return false;
    }

    get_player_id_from_player_number(target_player_number) {
    // Iterate over all players
    const targetEntry = Object.values(this.players)
        .find(p => p.number == target_player_number);
    
    if (targetEntry)
    {
        console.warn(`Player id'd as player ${targetEntry.id}`)
    } else {
        return 0;
    }
    return targetEntry ? targetEntry.id : null;
  }

    player_died(Player_ID) {
    // If player exists and is on a team, award 50 points to the opposing team
    const team = this.team1[Player_ID] ? 1
                 : this.team2[Player_ID] ? 2
                 : null;
    if (!team) {
        console.warn("Player not in team")
        return false;
    };
    this.players[Player_ID].b_player_alive = flase;

    if (team === 1) {
        console.warn("team 2 got points")
      this.team2_points += 50;
    } else {
        console.warn("team 1 got points")
      this.team1_points += 50;
    }
    return true;
  }

  start_game() {
    // Ensure every player in lobby is assigned to a team
    const allPlayers = Object.keys(this.players);
    const teamPlayers = new Set([...Object.keys(this.team1), ...Object.keys(this.team2)]);
    
    console.log(Object.keys(this.team1).length)

    if (allPlayers.length !== teamPlayers.size) {
      console.warn("!!!Not all players joined a team");
      return false;
    }

    if (Object.keys(this.team1).length == 0) {
      console.warn("!!!Team 1 is empty");
      return false;
    }
    if (Object.keys(this.team2).length == 0) {
      console.warn("!!!Team 2 is empty");
      return false;
    }

    for (let id in this.players) {
      if (!this.players[id].b_player_ready) {
        return false;
      }
    }

    this.start_time = Date.now(); // timestamp in ms since epoch :contentReference[oaicite:1]{index=1}
    this.game_live = true;
    console.warn("!!!Game started");
    return true;
  }

  check_end_conditions() {
    const LIMIT = 5000;
    const DURATION_MS = 5 * 60 * 1000; // 5 minutes in milliseconds

    if (this.team1_points >= LIMIT || this.team2_points >= LIMIT) {
      return true;
    }

    if (this.start_time !== null) {
      if (Date.now() - this.start_time >= DURATION_MS) {
        return true;
      }
    }
}

  end_game() {
    // Returns the team with the higher points, or 0 if tied
    if (this.team1_points > this.team2_points) {
        console.warn("team1 won")
        return 1;
    }
    if (this.team2_points > this.team1_points) {
        console.warn("team2 won")
        return 2;
    }
    console.warn("its a draw")
    return 1;
  }


}
