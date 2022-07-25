const http = require("http");
const db = require("./dbtools");

// Listen on a specific host via the HOST environment variable
var host = process.env.HOST || "0.0.0.0";
// Listen on a specific port via the PORT environment variable
var port = process.env.PORT || 80;

const RequestType = {
	GetClassement: "classement",

	GetUserAuth: "auth",
	GetUserPerm: "permissions",
	GetUser: "user",
	GetAllUser: "getall_user",
	CreateUser: "create_user",
	DeleteUser: "delete_user",

	GetDefi: "defis",
	CreateDefi: "create_defi",
	DeleteDefi: "delete_defi",
	ValidateDefi: "validate_defi",
};

//Redis stuff
const redis = require("redis");
const client = redis.createClient({ url: process.env.REDIS_URL });

client.on("error", (err) => console.log("Redis Client Error", err));

async function initRedis() {
	console.log("Initiating redis");
	await client.connect();
}

initRedis();

const server = http.createServer(function (request, response) {
	console.dir(request.param);

	//On request from client
	if (request.method == "POST") {
		//Data
		var body = "";

		request.on("data", function (data) {
			body += data;
		});

		request.on("end", async function () {
			//Parse data
			body = JSON.parse(body);
			console.log(body);

			var answer = {};
			try {
				if (body.type) {
					switch (body.type) {
						case RequestType.GetUserAuth:
							var auth = await db.authUser(
								client,
								body.username,
								body.password
							);

							answer = { auth: auth };
							break;
						case RequestType.GetUserPerm:
							var user = await db.getUser(
								client,
								body.username
							);

							answer = { perms: user.perms };
							break;
						case RequestType.GetUser:
							var user = await db.getUser(
								client,
								body.username
							);

							answer = { user: user };
							break;
						case RequestType.GetAllUser:
							var users = await db.getAllUser(
								client
							);

							answer = { users: users };
							break;
						case RequestType.CreateUser:
							var success = await db.createUser(
								client,
								body.username,
								body.password,
								body.data.username,
								body.data.nickname,
								body.data.perms,
								body.data.password
							);

							answer = { success: success };
							break;
						case RequestType.DeleteUser:
							var success = await db.deleteUser(
								client,
								body.username,
								body.password,
								body.data.username
							);

							answer = { success: success };
							break;
						case RequestType.GetDefi:
							var defis = await db.listDefi(client);
							answer = defis;
							break;
						case RequestType.CreateDefi:
							var success = await db.createDefi(
								client,
								body.username,
								body.password,
								body.data.name,
								body.data.id,
								body.data.description,
								body.data.points
							);

							answer = { success: success };
							break;
						case RequestType.DeleteDefi:
							var success = await db.deleteDefi(
								client,
								body.username,
								body.password,
								body.data.id
							);

							answer = { success: success };
							break;
						case RequestType.ValidateDefi:
							var success = await db.validateDefi(
								client,
								body.username,
								body.password,
								body.data.defi.id,
								body.data.player
							);

							answer = { success: success };
							break;
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
});

server.listen(port, host);
console.log(`Listening at http://${host}:${port}`);
