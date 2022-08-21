const http = require("http");
const db = require("./dbtools");
const encryption = require("./encryption.js");
const nodemailer = require('nodemailer');

// Listen on a specific host via the HOST environment variable
var host = process.env.HOST || "0.0.0.0";
// Listen on a specific port via the PORT environment variable
var port = process.env.PORT || 80;

//We need to send emails to the verification team
var transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: process.env.MAIL_LOGIN,
		pass: process.env.MAIL_PASSWORD
	}
});

const mailOptions = {
	from: process.env.MAIL_LOGIN,
	to: 'cto@isati.org',
	subject: '',
	text: ''
};

const RequestType = {
	getAllPlayers: "getAllPlayers",
	createPlayer: "createPlayer",
	deletePlayer: "deletePlayer",
	validateChallenge: "validateChallenge",
	getAllDefi: "getAllDefi",
	createDefi: "createDefi",
	deleteDefi: "deleteDefi",
	generateEncryptionKey: "generateEncryptionKey",
};

//Redis stuff
const redis = require("redis");
const client = redis.createClient({ url: process.env.REDIS_URL });

client.on("error", (err) => console.log("Redis Client Error", err));

//We need the await, otherwise the server will start before redis is ready
async function initRedis() {
	console.log("Initiating redis");
	await client.connect();
}

//Run the init
initRedis();

const server = http.createServer(function (request, response) {
	console.dir(request.param);

	//On request from client
	if (request.method == "POST") {
		//Data
		var body = "";

		//Retrieve data
		request.on("data", function (data) {
			body += data;
		});

		request.on("end", async function () {
			//Parse data
			body = JSON.parse(body);
			//console.log(body);

			var answer = {};
			try {
				//Should not happen
				if (body.type) {

					//Change depending on what the client is requesting
					switch (body.type) {
						case RequestType.getAllPlayers:
							answer = await db.getAllPlayers(client);
							break;
						case RequestType.createPlayer:
							answer = await db.createPlayer(client, body.data.createdUserId, body.data.createdUserUsername);
							break;
						case RequestType.deletePlayer:
							answer = await db.deletePlayer(client, body.data.deletedUserId);
							break;
						case RequestType.validateChallenge:
							//if (isAuth(body.password, body.key))
							//	answer = await db.validateChallenge(client, body.data.validatedUserId, body.data.validatedChallengeId);

							var mo = mailOptions;
							mo.subject = "Défi à valider pour " + body.data.validatedUserId;
							mo.text = "Défi à valider: " + body.data.validatedChallengeId + " pour " + body.data.validatedUserId;
							transporter.sendMail(mailOptions, function (error, info) {
								if (error) {
									console.log(error);
								} else {
									console.log('Email sent: ' + info.response);
								}
							});
							break;
						case RequestType.getAllDefi:
							answer = await db.getAllDefi(client);
							break;
						case RequestType.createDefi:
							answer = await db.createDefi(client, body.data.createdDefiId, body.data.createdDefiName, body.data.createdDefiDescription, body.data.createdDefiPoints);
							break;
						case RequestType.deleteDefi:
							answer = await db.deleteDefi(client, body.data.deletedDefiId);
							break;
						case RequestType.generateEncryptionKey:
							answer = await encryption.generateKeyPairs();
							break;
						default:
							break;
					}
				}
			} catch (error) {
				console.log(error);
			}

			response.writeHead(200, { "Content-Type": "application/json" });
			response.end(JSON.stringify(answer));
		});
	}

	if (request.method == "GET") {
		var body = "";

		//Retrieve data
		request.on("data", function (data) {
			body += data;
		});

		
		request.on("end", function () { 
			console.log(body);

			response.writeHead(200, { "Content-Type": "application/json" });
			response.end(JSON.stringify(body));
		});

	}
});

server.listen(port, host);
console.log(`Listening at http://${host}:${port}`);

function isAuth(password, key) {
	const password_decrypted = encryption.decrypt(password, key);

	return password_decrypted.message == process.env.ADMIN_PASSWORD;
}
