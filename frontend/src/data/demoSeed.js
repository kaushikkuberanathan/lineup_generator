// Demo All-Stars seed data - frozen point-in-time clone of the Mud Hens team, with all
// player and opponent names remapped to demo names. Source of truth: .demo-seed/
// demo-all-stars-seed.json (gitignored). Consumed by loadDemoTeam() in App.jsx.
//
// Values are VERBATIM from the seed - players are already full 38-key shape, so do NOT
// add defaults or modify. Schedule preserves scoreReported / gameBall arrays / mixed
// battingPerf value types exactly. Grid rows are left untruncated (migrateGrid reshapes
// to innings on read). team.id is generated at runtime (not here); coachPin omitted (empty).

export var DEMO_AGE_GROUP = "8U";
export var DEMO_INNINGS = 6;
export var DEMO_SEED_VERSION = 2;

export var DEMO_ROSTER = [
  {
    "name": "Ironman Flintstone",
    "tags": [],
    "power": "high",
    "prefs": [
      "1B",
      "2B"
    ],
    "speed": "fast",
    "effort": "average",
    "skills": [
      "developing"
    ],
    "contact": "high",
    "ballType": "both",
    "dislikes": [
      "C",
      "LF",
      "RF",
      "P"
    ],
    "lastName": "Flintstone",
    "reaction": "average",
    "batSkills": [],
    "firstName": "Ironman",
    "skipBench": true,
    "walkUpEnd": null,
    "walkUpLink": "https://open.spotify.com/track/6ATrsVaZT7XjkCynxM8cTS?si=o9Sv6XVoRiyzCPcZUO0DNg",
    "walkUpSong": "Turn My Swag On",
    "armStrength": "strong",
    "battingHand": "R",
    "lastUpdated": "2026-04-19T02:01:01.890Z",
    "outThisGame": false,
    "reliability": "high",
    "walkUpNotes": null,
    "walkUpStart": null,
    "awareOnBases": true,
    "backsUpPlays": false,
    "callsForBall": false,
    "walkUpArtist": "Soulja Boy",
    "patientAtPlate": true,
    "tracksBallWell": false,
    "confidentHitter": true,
    "swingDiscipline": "disciplined",
    "anticipatesPlays": true,
    "developmentFocus": "balanced",
    "listensToCoaches": true,
    "runsThroughFirst": true,
    "knowsWhereToThrow": false
  },
  {
    "name": "Hulk Jetson",
    "tags": [],
    "power": "high",
    "prefs": [
      "P",
      "1B",
      "2B"
    ],
    "speed": "fast",
    "effort": "high",
    "skills": [
      "developing"
    ],
    "contact": "high",
    "ballType": "ground_ball",
    "dislikes": [
      "C",
      "RF",
      "LF"
    ],
    "lastName": "Jetson",
    "reaction": "quick",
    "batSkills": [],
    "firstName": "Hulk",
    "skipBench": true,
    "walkUpEnd": "00:10",
    "walkUpLink": "https://open.spotify.com/track/7ACxUo21jtTHzy7ZEV56vU?si=8XVaAG43SSS-5fsGUmCoug",
    "walkUpSong": "Crazy Train",
    "armStrength": "strong",
    "battingHand": "R",
    "lastUpdated": "2026-04-19T02:08:53.331Z",
    "outThisGame": false,
    "reliability": "high",
    "walkUpNotes": null,
    "walkUpStart": "00:00",
    "awareOnBases": true,
    "backsUpPlays": false,
    "callsForBall": false,
    "walkUpArtist": "Ozzy Osbourne",
    "patientAtPlate": true,
    "tracksBallWell": true,
    "confidentHitter": true,
    "swingDiscipline": "disciplined",
    "anticipatesPlays": true,
    "developmentFocus": "balanced",
    "listensToCoaches": false,
    "runsThroughFirst": true,
    "knowsWhereToThrow": true
  },
  {
    "name": "Spiderman Rubble",
    "tags": [],
    "power": "medium",
    "prefs": [
      "3B",
      "2B",
      "SS"
    ],
    "speed": "average",
    "effort": "high",
    "skills": [
      "developing"
    ],
    "contact": "medium",
    "ballType": "developing",
    "dislikes": [],
    "lastName": "Rubble",
    "reaction": "average",
    "batSkills": [],
    "firstName": "Spiderman",
    "skipBench": false,
    "walkUpEnd": "00:10",
    "walkUpLink": "https://open.spotify.com/track/5ddME3ojStqcg5IAMpqv5n?si=sBW3MZ1pTq-j1BS6NBH40A",
    "walkUpSong": "Still D.R.E.",
    "armStrength": "average",
    "battingHand": "R",
    "lastUpdated": "2026-04-19T02:08:06.643Z",
    "outThisGame": false,
    "reliability": "high",
    "walkUpNotes": null,
    "walkUpStart": "00:00",
    "awareOnBases": true,
    "backsUpPlays": false,
    "callsForBall": false,
    "walkUpArtist": "Dr. Dre (Instrumental)",
    "patientAtPlate": true,
    "tracksBallWell": true,
    "confidentHitter": true,
    "swingDiscipline": "disciplined",
    "anticipatesPlays": true,
    "developmentFocus": "balanced",
    "listensToCoaches": true,
    "runsThroughFirst": true,
    "knowsWhereToThrow": true
  },
  {
    "name": "Thor Scooby",
    "tags": [],
    "power": "high",
    "prefs": [
      "P",
      "1B"
    ],
    "speed": "average",
    "effort": "high",
    "skills": [
      "developing"
    ],
    "contact": "high",
    "ballType": "ground_ball",
    "dislikes": [],
    "lastName": "Scooby",
    "reaction": "quick",
    "batSkills": [],
    "firstName": "Thor",
    "skipBench": false,
    "walkUpEnd": "00:10",
    "walkUpLink": "https://open.spotify.com/track/6hTcuIQa0sxrrByu9wTD7s?si=6h2wkzVWTVGK_xnNOvMHqA",
    "walkUpSong": "Born to Run",
    "armStrength": "average",
    "battingHand": "R",
    "lastUpdated": "2026-04-19T02:10:06.004Z",
    "outThisGame": false,
    "reliability": "average",
    "walkUpNotes": null,
    "walkUpStart": "00:00",
    "awareOnBases": true,
    "backsUpPlays": false,
    "callsForBall": false,
    "walkUpArtist": "Bruce Springsteen",
    "patientAtPlate": true,
    "tracksBallWell": true,
    "confidentHitter": true,
    "swingDiscipline": "disciplined",
    "anticipatesPlays": true,
    "developmentFocus": "balanced",
    "listensToCoaches": true,
    "runsThroughFirst": true,
    "knowsWhereToThrow": true
  },
  {
    "name": "Wolverine Bunny",
    "tags": [],
    "power": "medium",
    "prefs": [],
    "speed": "average",
    "effort": "average",
    "skills": [
      "developing"
    ],
    "contact": "developing",
    "ballType": "developing",
    "dislikes": [
      "1B",
      "P"
    ],
    "lastName": "Bunny",
    "reaction": "average",
    "batSkills": [],
    "firstName": "Wolverine",
    "skipBench": false,
    "walkUpEnd": "00:10",
    "walkUpLink": "https://open.spotify.com/track/0TZiZV8pQ6RBlo3Fmd5LX1?si=w3WNOEdaT9Cjcc6pLGdOqw",
    "walkUpSong": "Tootsie Roll",
    "armStrength": "average",
    "battingHand": "R",
    "lastUpdated": "2026-04-19T02:12:11.370Z",
    "outThisGame": false,
    "reliability": "needs_support",
    "walkUpNotes": null,
    "walkUpStart": "00:00",
    "awareOnBases": false,
    "backsUpPlays": false,
    "callsForBall": false,
    "walkUpArtist": "69 Boyz",
    "patientAtPlate": true,
    "tracksBallWell": false,
    "confidentHitter": false,
    "swingDiscipline": "disciplined",
    "anticipatesPlays": false,
    "developmentFocus": "balanced",
    "listensToCoaches": true,
    "runsThroughFirst": true,
    "knowsWhereToThrow": false
  },
  {
    "name": "Batman Sponge",
    "tags": [],
    "power": "high",
    "prefs": [
      "3B",
      "SS",
      "2B"
    ],
    "speed": "average",
    "effort": "high",
    "skills": [
      "developing"
    ],
    "contact": "high",
    "ballType": "ground_ball",
    "dislikes": [
      "LF",
      "RF"
    ],
    "lastName": "Sponge",
    "reaction": "average",
    "batSkills": [],
    "firstName": "Batman",
    "skipBench": false,
    "walkUpEnd": "00:10",
    "walkUpLink": "https://open.spotify.com/track/5iupE5tK6WVGkK2wXN7DlC?si=_Zkzu5IFQ_epv_paTmvmtg",
    "walkUpSong": "Your Idol",
    "armStrength": "average",
    "battingHand": "R",
    "lastUpdated": "2026-04-19T02:07:01.552Z",
    "outThisGame": false,
    "reliability": "high",
    "walkUpNotes": null,
    "walkUpStart": "00:00",
    "awareOnBases": true,
    "backsUpPlays": true,
    "callsForBall": true,
    "walkUpArtist": "TBD",
    "patientAtPlate": false,
    "tracksBallWell": true,
    "confidentHitter": true,
    "swingDiscipline": "disciplined",
    "anticipatesPlays": true,
    "developmentFocus": "balanced",
    "listensToCoaches": true,
    "runsThroughFirst": true,
    "knowsWhereToThrow": false
  },
  {
    "name": "Superman Mouse",
    "tags": [],
    "power": "low",
    "prefs": [
      "C"
    ],
    "speed": "developing",
    "effort": "needs_encouragement",
    "skills": [
      "developing"
    ],
    "contact": "developing",
    "ballType": "developing",
    "dislikes": [
      "1B",
      "2B",
      "SS",
      "P"
    ],
    "lastName": "Mouse",
    "reaction": "slow",
    "batSkills": [],
    "firstName": "Superman",
    "skipBench": false,
    "walkUpEnd": null,
    "walkUpLink": "https://open.spotify.com/track/68mG7AwXBzIXTC47HlRN19?si=2WCGMdUOT3qfCWtIawRfXw",
    "walkUpSong": "Big Dawgs",
    "armStrength": "developing",
    "battingHand": "R",
    "lastUpdated": "2026-04-19T02:03:35.778Z",
    "outThisGame": false,
    "reliability": "needs_support",
    "walkUpNotes": null,
    "walkUpStart": null,
    "awareOnBases": false,
    "backsUpPlays": false,
    "callsForBall": false,
    "walkUpArtist": "Hanunankind",
    "patientAtPlate": false,
    "tracksBallWell": false,
    "confidentHitter": false,
    "swingDiscipline": "free_swinger",
    "anticipatesPlays": false,
    "developmentFocus": "balanced",
    "listensToCoaches": true,
    "runsThroughFirst": false,
    "knowsWhereToThrow": false
  },
  {
    "name": "Flash Duck",
    "tags": [],
    "power": "medium",
    "prefs": [],
    "speed": "average",
    "effort": "average",
    "skills": [
      "developing"
    ],
    "contact": "medium",
    "ballType": "ground_ball",
    "dislikes": [
      "1B",
      "P"
    ],
    "lastName": "Duck",
    "reaction": "average",
    "batSkills": [],
    "firstName": "Flash",
    "skipBench": false,
    "walkUpEnd": "00:10",
    "walkUpLink": "https://open.spotify.com/track/1H5tvpoApNDxvxDexoaAUo?si=g-Rj50nSQrCMzwA_og4ndQ",
    "walkUpSong": "Who Let the Dogs Out",
    "armStrength": "average",
    "battingHand": "R",
    "lastUpdated": "2026-04-19T02:05:21.900Z",
    "outThisGame": false,
    "reliability": "average",
    "walkUpNotes": null,
    "walkUpStart": "00:00",
    "awareOnBases": false,
    "backsUpPlays": true,
    "callsForBall": false,
    "walkUpArtist": "Baha Men",
    "patientAtPlate": false,
    "tracksBallWell": true,
    "confidentHitter": false,
    "swingDiscipline": "free_swinger",
    "anticipatesPlays": false,
    "developmentFocus": "outfield",
    "listensToCoaches": true,
    "runsThroughFirst": true,
    "knowsWhereToThrow": false
  },
  {
    "name": "Aquaman Pebbles",
    "tags": [],
    "power": "medium",
    "prefs": [
      "3B",
      "2B",
      "P"
    ],
    "speed": "average",
    "effort": "high",
    "skills": [
      "developing"
    ],
    "contact": "high",
    "ballType": "developing",
    "dislikes": [
      "C"
    ],
    "lastName": "Pebbles",
    "reaction": "quick",
    "batSkills": [],
    "firstName": "Aquaman",
    "skipBench": false,
    "walkUpEnd": "00:10",
    "walkUpLink": "https://open.spotify.com/track/7mobUfp1aL8A6CdugCMWft?si=Z6KaDsaiTjqtL7NSn1ioNA",
    "walkUpSong": "Both",
    "armStrength": "average",
    "battingHand": "R",
    "lastUpdated": "2026-04-19T02:11:33.421Z",
    "outThisGame": false,
    "reliability": "high",
    "walkUpNotes": null,
    "walkUpStart": "00:00",
    "awareOnBases": true,
    "backsUpPlays": true,
    "callsForBall": false,
    "walkUpArtist": "Tiësto",
    "patientAtPlate": true,
    "tracksBallWell": true,
    "confidentHitter": true,
    "swingDiscipline": "disciplined",
    "anticipatesPlays": true,
    "developmentFocus": "balanced",
    "listensToCoaches": true,
    "runsThroughFirst": true,
    "knowsWhereToThrow": false
  },
  {
    "name": "Wonder Squarepants",
    "tags": [],
    "power": "high",
    "prefs": [
      "1B",
      "2B",
      "3B"
    ],
    "speed": "average",
    "effort": "high",
    "skills": [
      "developing"
    ],
    "contact": "high",
    "ballType": "both",
    "dislikes": [],
    "lastName": "Squarepants",
    "reaction": "quick",
    "batSkills": [],
    "firstName": "Wonder",
    "skipBench": false,
    "walkUpEnd": "00:10",
    "walkUpLink": "https://open.spotify.com/track/54flyrjcdnQdco7300avMJ?si=XD6I1tCsT7KpT3SCF0TUkA",
    "walkUpSong": "We Will Rock You",
    "armStrength": "strong",
    "battingHand": "R",
    "lastUpdated": "2026-04-19T02:13:25.898Z",
    "outThisGame": false,
    "reliability": "high",
    "walkUpNotes": null,
    "walkUpStart": "00:00",
    "awareOnBases": true,
    "backsUpPlays": true,
    "callsForBall": false,
    "walkUpArtist": "Queen",
    "patientAtPlate": true,
    "tracksBallWell": true,
    "confidentHitter": true,
    "swingDiscipline": "disciplined",
    "anticipatesPlays": true,
    "developmentFocus": "balanced",
    "listensToCoaches": true,
    "runsThroughFirst": true,
    "knowsWhereToThrow": true
  },
  {
    "name": "Panther Roadrunner",
    "tags": [],
    "power": "medium",
    "prefs": [
      "3B",
      "2B",
      "1B"
    ],
    "speed": "average",
    "effort": "high",
    "skills": [
      "developing"
    ],
    "contact": "high",
    "ballType": "ground_ball",
    "dislikes": [],
    "lastName": "Roadrunner",
    "reaction": "average",
    "batSkills": [],
    "firstName": "Panther",
    "skipBench": false,
    "walkUpEnd": "00:10",
    "walkUpLink": "https://open.spotify.com/track/12fN9BO9WpTZN5SMEsPeFH?si=v4aCg3uBQL2v3-Ay406IJQ",
    "walkUpSong": "Party Starter",
    "armStrength": "average",
    "battingHand": "R",
    "lastUpdated": "2026-04-19T02:02:56.215Z",
    "outThisGame": false,
    "reliability": "average",
    "walkUpNotes": null,
    "walkUpStart": "00:00",
    "awareOnBases": true,
    "backsUpPlays": true,
    "callsForBall": false,
    "walkUpArtist": "Will Smith",
    "patientAtPlate": false,
    "tracksBallWell": true,
    "confidentHitter": false,
    "swingDiscipline": "disciplined",
    "anticipatesPlays": false,
    "developmentFocus": "outfield",
    "listensToCoaches": true,
    "runsThroughFirst": true,
    "knowsWhereToThrow": true
  }
];

export var DEMO_SCHEDULE = [
  {
    "id": "g1",
    "date": "2026-03-17",
    "time": "7:30 PM",
    "location": "JV 2",
    "opponent": "Wakanda Panthers",
    "home": true,
    "result": "X",
    "ourScore": "",
    "theirScore": "",
    "battingPerf": {},
    "snackDuty": "",
    "gameBall": [],
    "scoreReported": false
  },
  {
    "id": "g2",
    "date": "2026-03-19",
    "time": "6:00 PM",
    "location": "JV 2",
    "opponent": "Asgard Thunder",
    "home": false,
    "result": "W",
    "ourScore": "14",
    "theirScore": "11",
    "battingPerf": {
      "Ironman Flintstone": {
        "h": 4,
        "r": 2,
        "ab": 5,
        "bb": 0,
        "rbi": 1
      },
      "Aquaman Pebbles": {
        "h": 2,
        "r": 1,
        "ab": 4,
        "bb": 0,
        "rbi": 1
      },
      "Panther Roadrunner": {
        "h": 2,
        "r": 1,
        "ab": 5,
        "bb": 0,
        "rbi": 0
      },
      "Wolverine Bunny": {
        "h": 3,
        "r": 2,
        "ab": 4,
        "bb": 0,
        "rbi": 1
      },
      "Wonder Squarepants": {
        "h": 2,
        "r": 1,
        "ab": 5,
        "bb": 0,
        "rbi": 1
      },
      "Superman Mouse": {
        "h": 2,
        "r": 1,
        "ab": 3,
        "bb": 0,
        "rbi": 2
      },
      "Spiderman Rubble": {
        "h": 3,
        "r": 1,
        "ab": 4,
        "bb": 0,
        "rbi": 2
      },
      "Batman Sponge": {
        "h": 3,
        "r": 1,
        "ab": 5,
        "bb": 0,
        "rbi": 0
      },
      "Flash Duck": {
        "h": 2,
        "r": 1,
        "ab": 4,
        "bb": 0,
        "rbi": 1
      },
      "Hulk Jetson": {
        "h": 4,
        "r": 2,
        "ab": 5,
        "bb": 0,
        "rbi": 2
      },
      "Thor Scooby": {
        "h": 3,
        "r": 1,
        "ab": 4,
        "bb": 0,
        "rbi": 2
      }
    },
    "snackDuty": "Superman",
    "gameBall": [
      "Ironman"
    ],
    "scoreReported": true
  },
  {
    "id": "g3",
    "date": "2026-03-26",
    "time": "6:00 PM",
    "location": "JV 2",
    "opponent": "Bedrock Dinos",
    "home": false,
    "result": "L",
    "ourScore": "8",
    "theirScore": "16",
    "battingPerf": {
      "Ironman Flintstone": {
        "h": "3",
        "r": "1",
        "ab": "3",
        "rbi": "1"
      },
      "Aquaman Pebbles": {
        "h": "2",
        "r": "1",
        "ab": "2",
        "rbi": "3"
      },
      "Panther Roadrunner": {
        "h": "1",
        "ab": "2",
        "rbi": "2"
      },
      "Wolverine Bunny": {
        "ab": "3",
        "rbi": "1"
      },
      "Wonder Squarepants": {
        "h": "2",
        "r": "1",
        "ab": "2"
      },
      "Superman Mouse": {
        "h": "1",
        "r": "1",
        "ab": "3"
      },
      "Spiderman Rubble": {
        "ab": "3"
      },
      "Batman Sponge": {
        "h": "2",
        "r": "2",
        "ab": "2"
      },
      "Flash Duck": {
        "h": "1",
        "r": "1",
        "ab": "2"
      },
      "Hulk Jetson": {
        "h": "2",
        "r": "1",
        "ab": "3",
        "rbi": "1"
      },
      "Thor Scooby": {
        "h": "3",
        "r": "",
        "ab": "3",
        "rbi": "1"
      }
    },
    "snackDuty": "Spiderman",
    "gameBall": [
      "Spiderman"
    ],
    "scoreReported": true
  },
  {
    "id": "g4",
    "date": "2026-03-31",
    "time": "7:30 PM",
    "location": "FP 4",
    "opponent": "Gotham Goblins",
    "home": false,
    "result": "L",
    "ourScore": "6",
    "theirScore": "17",
    "battingPerf": {
      "Ironman Flintstone": {
        "ab": "0"
      },
      "Aquaman Pebbles": {
        "ab": "3"
      },
      "Panther Roadrunner": {
        "h": "3",
        "r": "2",
        "ab": "3",
        "rbi": "2"
      },
      "Wolverine Bunny": {
        "h": "1",
        "ab": "3"
      },
      "Wonder Squarepants": {
        "h": "2",
        "ab": "3",
        "rbi": "1"
      },
      "Superman Mouse": {
        "h": "2",
        "r": "1",
        "ab": "3"
      },
      "Spiderman Rubble": {
        "ab": "3"
      },
      "Batman Sponge": {
        "h": "2",
        "ab": "3",
        "rbi": "1"
      },
      "Flash Duck": {
        "h": "2",
        "r": "1",
        "ab": "3"
      },
      "Hulk Jetson": {
        "h": "2",
        "r": "1",
        "ab": "3",
        "rbi": "1"
      },
      "Thor Scooby": {
        "h": "3",
        "ab": "4"
      }
    },
    "snackDuty": "Thor",
    "gameBall": [
      "Aquaman"
    ],
    "scoreReported": true
  },
  {
    "id": "g5",
    "date": "2026-04-02",
    "time": "7:30 PM",
    "location": "JV 2",
    "opponent": "Wakanda Panthers",
    "home": false,
    "result": "L",
    "ourScore": "14",
    "theirScore": "17",
    "battingPerf": {
      "Ironman Flintstone": {
        "h": "3",
        "r": "1",
        "ab": "4"
      },
      "Aquaman Pebbles": {
        "h": "2",
        "ab": "3",
        "rbi": "2"
      },
      "Panther Roadrunner": {
        "h": "2",
        "r": "1",
        "ab": "2"
      },
      "Wolverine Bunny": {
        "ab": "3",
        "rbi": "1"
      },
      "Wonder Squarepants": {
        "h": "3",
        "r": "3",
        "ab": "4",
        "rbi": "3"
      },
      "Superman Mouse": {
        "h": "1",
        "r": "1",
        "ab": "3",
        "rbi": "2"
      },
      "Spiderman Rubble": {
        "h": "1",
        "r": "1",
        "ab": "3"
      },
      "Batman Sponge": {
        "h": "3",
        "r": "3",
        "ab": "4",
        "rbi": "2"
      },
      "Flash Duck": {
        "h": "2",
        "ab": "3",
        "rbi": "3"
      },
      "Hulk Jetson": {
        "h": "3",
        "r": "2",
        "ab": "4"
      },
      "Thor Scooby": {
        "h": "2",
        "r": "2",
        "ab": "4",
        "rbi": "1"
      }
    },
    "snackDuty": "Wonder",
    "gameBall": [
      "Hulk"
    ],
    "scoreReported": true
  },
  {
    "id": "g6",
    "date": "2026-04-15",
    "time": "6:00 PM",
    "location": "JV 2",
    "opponent": "Asgard Thunder",
    "home": true,
    "result": "L",
    "ourScore": "15",
    "theirScore": "25",
    "battingPerf": {},
    "snackDuty": "Flash",
    "gameBall": [
      "Panther",
      "Flash"
    ],
    "scoreReported": false
  },
  {
    "id": "g7",
    "date": "2026-04-18",
    "time": "1:00 PM",
    "location": "FP 2",
    "opponent": "Metropolis Meteors",
    "home": false,
    "result": "L",
    "ourScore": "8",
    "theirScore": "25",
    "battingPerf": {
      "Ironman Flintstone": {
        "h": "0",
        "r": "0",
        "ab": "3",
        "rbi": "2"
      },
      "Aquaman Pebbles": {
        "h": "3",
        "r": "1",
        "ab": "4",
        "rbi": "2"
      },
      "Panther Roadrunner": {
        "h": "3",
        "r": "3",
        "ab": "4"
      },
      "Wolverine Bunny": {
        "h": "1",
        "r": "1",
        "ab": "3",
        "rbi": "1"
      },
      "Wonder Squarepants": {
        "h": "2",
        "r": "2",
        "ab": "4"
      },
      "Superman Mouse": {
        "h": "1",
        "r": "0",
        "ab": "3"
      },
      "Spiderman Rubble": {
        "h": "3",
        "r": "1",
        "ab": "3"
      },
      "Batman Sponge": {
        "h": "4",
        "r": "0",
        "ab": "4",
        "rbi": "3"
      },
      "Flash Duck": {
        "h": "1",
        "r": "0",
        "ab": "3"
      },
      "Hulk Jetson": {
        "h": "1",
        "r": "0",
        "ab": "3",
        "rbi": "0"
      },
      "Thor Scooby": {
        "h": "0",
        "r": "0",
        "ab": "3",
        "rbi": "0"
      }
    },
    "snackDuty": "Spiderman",
    "gameBall": [
      "Wonder"
    ],
    "scoreReported": true
  },
  {
    "id": "g8",
    "date": "2026-04-23",
    "time": "7:00 PM",
    "location": "JV 3",
    "opponent": "Gotham Goblins",
    "home": true,
    "result": "L",
    "ourScore": "8",
    "theirScore": "19",
    "battingPerf": {
      "Ironman Flintstone": {
        "h": "2",
        "r": "1",
        "ab": "3",
        "rbi": "1"
      },
      "Aquaman Pebbles": {
        "h": "1",
        "r": "1",
        "ab": "4"
      },
      "Panther Roadrunner": {
        "ab": "3"
      },
      "Wolverine Bunny": {
        "h": "3",
        "ab": "3",
        "rbi": "1"
      },
      "Wonder Squarepants": {
        "h": "3",
        "r": "1",
        "ab": "3",
        "rbi": "2"
      },
      "Superman Mouse": {
        "ab": "3"
      },
      "Spiderman Rubble": {
        "h": "1",
        "r": "1",
        "ab": "3"
      },
      "Batman Sponge": {
        "h": "4",
        "r": "2",
        "ab": "4",
        "rbi": "1"
      },
      "Flash Duck": {
        "h": "3",
        "r": "1",
        "ab": "3",
        "rbi": "2"
      },
      "Hulk Jetson": {
        "h": "2",
        "ab": "3",
        "rbi": "1"
      },
      "Thor Scooby": {
        "h": "1",
        "r": "1",
        "ab": "3"
      }
    },
    "snackDuty": "Superman",
    "gameBall": [
      "Wolverine"
    ],
    "scoreReported": false
  },
  {
    "id": "g9",
    "date": "2026-04-25",
    "time": "11:30 AM",
    "location": "FP 2",
    "opponent": "Bedrock Dinos",
    "home": true,
    "result": "L",
    "ourScore": "6",
    "theirScore": "18",
    "battingPerf": {
      "Ironman Flintstone": {
        "h": "2",
        "ab": "3",
        "rbi": "2"
      },
      "Aquaman Pebbles": {
        "h": "1",
        "ab": "2"
      },
      "Panther Roadrunner": {
        "h": "2",
        "r": "2",
        "ab": "2"
      },
      "Wolverine Bunny": {
        "h": "1",
        "r": "1",
        "ab": "3",
        "rbi": "1"
      },
      "Wonder Squarepants": {
        "ab": "3"
      },
      "Superman Mouse": {
        "h": "1",
        "ab": "2",
        "rbi": "1"
      },
      "Spiderman Rubble": {
        "ab": "2"
      },
      "Batman Sponge": {
        "h": "3",
        "r": "2",
        "ab": "3"
      },
      "Flash Duck": {
        "h": "2",
        "ab": "3",
        "rbi": "3"
      },
      "Hulk Jetson": {
        "h": "2",
        "ab": "3"
      },
      "Thor Scooby": {
        "ab": "2"
      }
    },
    "snackDuty": "Aquaman",
    "gameBall": [
      "Thor"
    ],
    "scoreReported": false
  },
  {
    "id": "g10",
    "date": "2026-05-04",
    "time": "6:00 PM",
    "location": "JV 3",
    "opponent": "Metropolis Meteors",
    "home": true,
    "result": "L",
    "ourScore": "4",
    "theirScore": "18",
    "battingPerf": {
      "Aquaman Pebbles": {
        "h": "2",
        "r": "1",
        "ab": "3",
        "rbi": "1"
      },
      "Panther Roadrunner": {
        "ab": "2"
      },
      "Wolverine Bunny": {
        "h": "1",
        "r": "1",
        "ab": "2"
      },
      "Superman Mouse": {
        "h": "1",
        "r": "0",
        "ab": "3",
        "rbi": "2"
      },
      "Spiderman Rubble": {
        "ab": "2",
        "rbi": "1"
      },
      "Batman Sponge": {
        "h": "2",
        "ab": "3"
      },
      "Flash Duck": {
        "ab": "3"
      },
      "Hulk Jetson": {
        "h": "3",
        "r": "2",
        "ab": "3"
      },
      "Thor Scooby": {
        "h": "1",
        "ab": "2"
      }
    },
    "snackDuty": "",
    "gameBall": [
      "Batman"
    ],
    "scoreReported": false
  },
  {
    "id": "g11",
    "date": "2026-05-06",
    "time": "7:30 PM",
    "location": "JV 2",
    "opponent": "Wakanda Panthers",
    "home": true,
    "result": "",
    "ourScore": "",
    "theirScore": "",
    "battingPerf": {},
    "snackDuty": "",
    "gameBall": [],
    "scoreReported": false
  }
];

export var DEMO_GRID = {
  "Ironman Flintstone": [
    "Bench",
    "LC",
    "RF",
    "SS",
    "1B",
    "LF",
    "2B"
  ],
  "Aquaman Pebbles": [
    "P",
    "2B",
    "LC",
    "P",
    "RF",
    "1B",
    "3B"
  ],
  "Panther Roadrunner": [
    "2B",
    "1B",
    "LF",
    "2B",
    "3B",
    "RC",
    "C"
  ],
  "Wolverine Bunny": [
    "RF",
    "C",
    "2B",
    "LF",
    "Bench",
    "3B",
    "LC"
  ],
  "Wonder Squarepants": [
    "1B",
    "3B",
    "RC",
    "1B",
    "2B",
    "LC",
    "RF"
  ],
  "Superman Mouse": [
    "C",
    "LF",
    "C",
    "3B",
    "RC",
    "C",
    "Bench"
  ],
  "Spiderman Rubble": [
    "RC",
    "SS",
    "Bench",
    "LC",
    "SS",
    "P",
    "LF"
  ],
  "Batman Sponge": [
    "SS",
    "RC",
    "SS",
    "RF",
    "C",
    "Bench",
    "P"
  ],
  "Flash Duck": [
    "3B",
    "RF",
    "3B",
    "C",
    "LF",
    "2B",
    "SS"
  ],
  "Hulk Jetson": [
    "LC",
    "Bench",
    "P",
    "RC",
    "P",
    "RF",
    "1B"
  ],
  "Thor Scooby": [
    "LF",
    "P",
    "1B",
    "Bench",
    "LC",
    "SS",
    "RC"
  ]
};
