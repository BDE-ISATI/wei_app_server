/*
players:
id {
	name,
	id,
	points,
	challenges_done
}

challenges:
id {
	name,
	id,
	description,
	points
}

*/

const playerHashName = "players";
const defiHashName = "defis";
const teamHashName = "teams";
const validationSetName = "toValidate";

//Users are in db 1 in a basic set. User set, exists and del
//Challenges are stored in db 2, under hash defis. use hSet, hVals, hDel

const redis = require("redis");

//Our redis client
var client;


/**
 * Initialization of redis
 */
async function initRedis() {
	console.log("Initiating redis");
	client = redis.createClient({ url: process.env.REDIS_URL });
	client.on("error", (err) => console.log("Redis Client Error", err));
	await client.connect();
	await client.select(0);
}



/**
 * @param {*} client Redis client
 * @returns a list of all players in the db (as json objects)
 */
async function getAllPlayers() {
	const players_vals = await client.hVals(playerHashName);

	const players = players_vals.map(player => JSON.parse(player));

	return players;
}

async function createPlayer(id, name, teamId, profilePictureUrl) {//Avoid overwriting player
	if (await client.hGet(playerHashName, id) != null) return false;

	const player = await client.hSet(playerHashName, id, JSON.stringify({
		name: name,
		id: id,
		points: 0,
		teamId: teamId,
		challenges_done: [],
		profilePictureUrl: profilePictureUrl
	}))

	return player >= 1;
}

async function deletePlayer(id) {
	const player = await client.hDel(playerHashName, id);

	return player >= 1;
}

async function validateChallenge(id, defiId) {
	const defi = await getDefi(defiId);

	const player = await client.hGet(playerHashName, id);
	const json = JSON.parse(player);

	if (json.challenges_done.includes(defi.id)) {
		return false;
	} else {
		json.challenges_done.push(defi.id);
		json.points = json.points + defi.points;

		const res = await client.hSet(playerHashName, id, JSON.stringify(json));

		return res == 0
	}
}

async function getAllDefi() {
	const defis_keys = await client.hVals(defiHashName);

	const defis = defis_keys.map(defi => JSON.parse(defi));

	return defis;
}

async function createDefi(defiId, defiName, defiDescription, defiPoints, defiImageUrl) {
	const defi = await client.hSet(defiHashName, defiId, JSON.stringify({
		name: defiName,
		id: defiId,
		description: defiDescription,
		points: defiPoints,
		image: defiImageUrl
	}))

	return defi >= 1;
}

async function deleteDefi(defiId) {
	const defi = await client.hDel(defiHashName, defiId);

	return defi >= 1;
}

async function clearDefis() {
	const res = client.del(defiHashName);

	return res >= 1;
}

async function getDefi(defiId) {
	return JSON.parse(await client.hGet(defiHashName, defiId));
}

async function addPendingValidation(validationId) {
	const res = await client.sAdd(validationSetName, validationId);

	return res >= 1;
}

async function tryValidation(validationId) {
	const res = await client.sRem(validationSetName, validationId);

	return res >= 1;
}

async function createTeam(teamName, teamId, teamLeaderMail, teamImageUrl) {
	const res = await client.hSet(teamHashName, teamId, JSON.stringify({
		teamId: teamId,
		teamName: teamName,
		teamLeaderMail: teamLeaderMail,
		teamImageUrl: teamImageUrl
	}))

	return res >= 1;
}

async function getTeam(teamId) {
	const res = await client.hGet(teamHashName, teamId);
	const team = await JSON.parse(res);

	const players = await getAllPlayers();
	const teamPlayers = await players.filter(player => player.teamId == teamId);
	const points = await teamPlayers.reduce((previous, current) => previous.points + current.points, 0);

	team.players = teamPlayers;
	team.points = points;

	return team;
}

async function getAllTeams() {
	const teams_keys = await client.hKeys(teamHashName);

	const teams = teams_keys.map(async function (teamId) {
		console.log(teamId);
		const team = await getTeam(teamId);
		console.log(team);
		return team;
	});

	return teams;
}

async function clearTeams() {
	const res = client.del(teamHashName);

	return res >= 1;
}



module.exports = {
	initRedis,
	getAllPlayers,
	createPlayer,
	deletePlayer,
	validateChallenge,
	getAllDefi,
	createDefi,
	deleteDefi,
	clearDefis,
	getDefi,
	addPendingValidation,
	tryValidation,
	createTeam,
	getTeam,
	getAllTeams,
	clearTeams
};
