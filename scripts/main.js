
// Import any other script files here, e.g.:
// import * as myModule from "./mymodule.js";
import connectToServer from "./server.js";

// TODO:
/*
 - "Levels" for single player
 */

let gameMode = "SinglePlayer";
let ballMoving = false;
let leftScore = 0;
let rightScore = 0;

runOnStartup(async runtime =>
{
	// Code to run on the loading screen.
	// Note layouts, objects etc. are not yet available.
	
	runtime.addEventListener("beforeprojectstart", () => onBeforeProjectStart(runtime));
});

async function onBeforeProjectStart(runtime)
{
	// Code to run just before 'On start of layout' on
	// the first layout. Loading has finished and initial
	// instances are created and available to use here.
	
	runtime.addEventListener("tick", () => Tick(runtime));
	
	// using bind to bind the runtime object as the first parameter in the "event listener" callbacks.
	window.ballCollision = onBallCollision.bind(null, runtime);
	
	for (const layout of runtime.getAllLayouts())
		layout.addEventListener("beforelayoutstart", () => onLayoutChange(runtime));
	
	let func = checkForClick.bind(null, runtime);
	
	document.addEventListener("click", func);
	
	//onLayoutChange(runtime);
}

// Called everytime the user clicks the mouse
function checkForClick(runtime) {
	// Check if it is a screen with a menu (performance purposes)
	if (runtime.layout.name == "GameScreen")
		return;
	
	// This loops checks all SpriteMenuBtn instances or menu buttons
	// I checks to see if your mouse is hovering over the btn.
	for (const instance of runtime.objects.SpriteMenuBtn.getAllInstances()) {
		const [x, y] = runtime.mouse.getMousePosition();

		if (!instance.isVisible)
			continue;
		
		// Since the x and y is located at the center of each instance we have to take the width/2 and height/2 to get a corner of the object.
		// x - (width  / 2) = Left Side x Position
		// x + (width  / 2) = Right Side x Position
		// y - (height / 2) = Top Side y Position
		// y + (height / 2) = Bottom Side y Position

		if (x >= instance.x - (instance.width/2) && x <= instance.x + (instance.width/2)) {
			if (y >= instance.y - (instance.height/2) && y <= instance.y + (instance.height/2)) {
				instance.text = instance.instVars.text;
				
				let func = onMenuBtnClicked.bind(instance, runtime);
				func();
			}
		}
	}
}

let layoutChanged = false;
async function onLayoutChange(runtime) {
	for (const instance of runtime.objects.SpriteMenuBtn.getAllInstances()) {
		instance.addEventListener("click", onMenuBtnClicked.bind(instance, runtime));
	}
	
	console.log("test");
	layoutChanged = true;
}

function changeLayout(runtime, layout, cb) {
	layoutChanged = false;
	
	let timer = setInterval(() => {
		if (layoutChanged) {
			clearInterval(timer);
			
			if (cb instanceof Function)
				cb(runtime);
		}	
	}, 1000);
	
	runtime.goToLayout(layout);
	
	return timer;
}


//-------------Game Code Starts Here--------------//

let startVel = 250;
let ballVelX = startVel;
let ballVelY = startVel;

let gspeed = 15;

let client;

function setupMultiplayer(runtime) {
	console.log("Connecting to server");
	client = connectToServer(runtime);
	client.on("ready", () => {
		runtime.goToLayout("MultiplayerSetupScreen");
	});
}

function joinRoom(runtime) {
	if (!client)
		client = connectToServer(runtime);
	
	console.log(client);
	
	const roomInput = document.getElementById("roomcode");
	const roomCode = roomInput.value;
	console.log(roomInput, roomCode);
	
	changeLayout(runtime, "RoomScreen", () => {
		client.on("roomFull", () => alert("Full Room! Try A different room!"));
		client.on("roomJoined", (roomData, clientData) => {
			roomJoined(runtime, roomData, clientData);
		});
		client.on("roomCreated", (roomData, clientData) => {
			console.log("Room Created!");
			roomJoined(runtime, roomData, clientData);
		});

		client.joinRoom(roomCode);
	});
}

function roomJoined(runtime, roomData, clientData) {
	const iframe = document.getElementById("playerlistframe").contentWindow;
	const playerListEl = iframe.document.getElementById("playerlist");
	
	console.log("Room Joined!");
	console.log(roomData);
	
	console.log(playerListEl);

	console.log(playerListEl.innerHTML);
	playerListEl.innerHTML = "";

	const clientList = roomData.clients;
	client.clientData = clientData;
	client.room = roomData;
	client.id = clientData.id;
	client.isHost = clientData.isHost;
	
	client.checkHost(); // Checks for host privileges and enables host specific features

	for (const clientInfo of clientList) {
		playerListEl.innerHTML +=
		`<div class="player" data-id="${clientInfo.id}">
			<span class="name">Player</span>
			<span class="tag">${clientInfo.isHost ? '(host)' : ''}</span>
		</div>`;
	}
	
	client.on("clientJoined", (newClient) => {
		console.log("Player Joined!");
		console.log(newClient);
		
		playerListEl.innerHTML +=
		`<div class="player" data-id="${newClient.id}">
			<span class="name">Player</span>
			<span class="tag">${newClient.isHost ? '(host)' : ''}</span>
		</div>`;
	});
	
	client.on("clientLeft", (newRoomData, leavingClient) => {
		playerListEl.querySelector(`.player[data-id='${leavingClient.id}']`).remove();
	});
	
	client.on("newHost", (newRoomData, newHost) => {
		const newHostPlayer = playerListEl.querySelector(`.player[data-id='${newHost.id}']`);
		newHostPlayer.querySelector(".tag").innerText = "(host)";
		
		if (newHost.id == client.id) {
			client.isHost = true;
			client.clientData = newHost;
		}
	});
	
	client.on("gameStarted", () => {
		changeLayout(runtime, "GameScreen");
	});
	
	client.on("paddleData", (clientData, { paddle }) => {
		const gpaddle = clientData.isHost
			? runtime.objects.Paddle.getFirstInstance()
			: runtime.objects.Paddle2.getFirstInstance();
		
		gpaddle.x = paddle.x;
		gpaddle.y = paddle.y;
	});
	
	client.on("ballData", ({ ball }) => {
		const gball = runtime.objects.Ball.getFirstInstance();
		const gphysics = gball.behaviors.Physics;
		
		gball.x = ball.x;
		gball.y = ball.y;
		gphysics.angularVelocity = ball.angularVelocity;
	});
	
	client.on("gameData", ({
		ball,
		paddle,
		paddle2,
		scoreLeft,
		scoreRight
	}) => {
		const gball = runtime.objects.Ball.getFirstInstance();
		const gphysics = gball.behaviors.Physics;
		const gpaddle = runtime.objects.Paddle.getFirstInstance();
		const gpaddle2 = runtime.objects.Paddle2.getFirstInstance();
		
		gball.x = ball.x;
		gball.y = ball.y;
		gphysics.angularVelocity = ball.angularVelocity;
		
		gpaddle.x = paddle.x;
		gpaddle.y = paddle.y;
		gpaddle2.x = paddle2.x;
		gpaddle2.y = paddle2.y;
		
		runtime.objects.ScoreRight.getFirstInstance().text = scoreRight.toString();
		runtime.objects.ScoreLeft.getFirstInstance().text = scoreLeft.toString();
	});
}

function onMenuBtnClicked(runtime) {
	// "this" refers to the instance that was clicked
	
	switch (this.text) {
		case "Singleplayer":
			runtime.goToLayout("GameScreen");
			break;
		
		case "Multiplayer":
// 			alert("Not available yet!");
			gameMode = "Multiplayer";
			setupMultiplayer(runtime);
			break;
		
		case "Directions":
			runtime.goToLayout("DirectionsScreen");
			break;
			
		case "Go Back":
			runtime.goToLayout("TitleScreen");
			if (client) {
				client.leaveRoom();
			}
			break;
			
		case "Join Room":
			joinRoom(runtime);
			break;
			
		case "Start Game":
			if (client) {
				client.startGame();
			}
			break;
			
		default:
			runtime.goToLayout("TitleScreen");
			break;
	}
}

function onBallCollision(runtime, isWall = false, object = null) {
	if (gameMode !== "SinglePlayer" && (gameMode == "Multiplayer" && client && !client.isHost))
		return;
	// TODO: Fix collision against paddle. Detect side of paddle hit and incorporate paddle velocity into the ball velocity.
	
	// BASIC WALL/FLOOR RECTANGULAR COLLISION
	const ball = runtime.objects.Ball.getFirstInstance();
	const bphysics = ball.behaviors.Physics;
	const vel = bphysics.getVelocity();
	const newVel = [isWall ? vel[0] * -1 : vel[0], !isWall ? vel[1] * -1 : vel[1]];
	const contacts = bphysics.getContactCount();
	
	console.log(bphysics.getContact(0), isWall);
	bphysics.setVelocity(...newVel);
	
	// Keep track of this new velocity so we can keep updating the ball velocity every tick since it loses speed over time.
	ballVelX = newVel[0];
	ballVelY = newVel[1];
	
	if (object) {
		const instances = object.getAllInstances();
		
		// Efficient? No. Works? Probably not. Do I care? No. So this is the ultimate/best choice in collision detection
		for (const instance of instances) {
			const iphysics = instance.behaviors.Physics;
			const contactsCount = iphysics.getContactCount();
			
			if (contactsCount <= 0) {
				continue;
			}
			
			const speed = instance?.Speed ?? 0;
			ballVelY += speed * 12;
			
			break;
		}
	}

	
	// TODO (POSSIBLE?): Is this the best way??? IDK? Couldn't think of any other way using Construct. Other ways involve math I don't want to do.
	// Add "curvy" collision detection / Rotated walls
	// Use collision points of object
	// Determine which 2 points the collision is in-between.
	// Get rotation of line between two points.
}

function movePaddle(runtime, paddle, speed = gspeed) {
	const physics = paddle.behaviors.Physics;
	
	const maxHeight = runtime.layout.height - (paddle.height / 2) - 32;
	const maxWidth = runtime.layout.width;
	
	const minHeight = 32 + paddle.height / 2;
	const minWidht = 0;
	
	paddle.Speed = 0;
	
	if (runtime.keyboard.isKeyDown("KeyW")) {
		paddle.y -= speed;
		paddle.Speed = -speed;
		
		// Yea I know this is redundant but eh.
		if (!ballMoving) {
			ballMoving = true;
		}
	}
	
	if (runtime.keyboard.isKeyDown("KeyS")) {
		paddle.y += speed;
		paddle.Speed = speed;
		
		if (!ballMoving) {
			ballMoving = true;
		}
	}
	
	if (runtime.keyboard.isKeyDown("ArrowUp")) {
		paddle.y -= speed;
		paddle.Speed = -speed;
		
		if (!ballMoving) {
			ballMoving = true;
		}
	}
	
	if (runtime.keyboard.isKeyDown("ArrowDown")) {
		paddle.y += speed;
		paddle.Speed = speed;
		
		if (!ballMoving) {
			ballMoving = true;
		}
	}
	
	if (paddle.y >= maxHeight) {
		paddle.y = maxHeight;
	}
	
	if (paddle.y < minHeight) {
		paddle.y = minHeight;
	}
	
	client.send("paddleDataUpdate", {
		paddle: { x: paddle.x, y: paddle.y, speed: paddle.Speed }
	});
}

function resetBall(rt, ball) {
	ball.x = rt.layout.width / 2;
	ball.y = rt.layout.height / 2;
}
	
function resetPaddles(rt, player1, player2) {
	player1.y = rt.layout.height / 2;
	player2.y = rt.layout.height / 2;
}
	
function addPoint(runtime, player, paddle, paddle2, ball) {	
	if (player == 0) {
		leftScore++;
			
		ballVelX = -startVel;
		ballVelY = -startVel;
		
		runtime.objects.ScoreLeft.getFirstInstance().text = leftScore.toString();
	} else if (player == 1) {
		rightScore++;
		
		ballVelX = startVel;
		ballVelY = startVel;
		
		runtime.objects.ScoreRight.getFirstInstance().text = rightScore.toString();
	}
	
	resetBall(runtime, ball);
	resetPaddles(runtime, paddle, paddle2);
	
	client.send("gameDataUpdate", {
		ball: { x: ball.x, y: ball.y, angularVelocity: ball.behaviors.Physics.angularVelocity },
		paddle: { x: paddle.x, y: paddle.y },
		paddle2: { x: paddle2.x, y: paddle2.y },
		scoreLeft: leftScore,
		scoreRight: rightScore
	});
}
	
function checkForPoint(runtime, paddle, paddle2, ball) {
	if (ball.x <= (paddle.x - (paddle.width))) {
		addPoint(runtime, 1, paddle, paddle2, ball);
	}

	if (ball.x >= (paddle2.x + (paddle2.width))) {
		addPoint(runtime, 0, paddle, paddle2, ball);
	}
}
	
function GameTick(runtime) {
	const ball = runtime.objects.Ball.getFirstInstance();
	const physics = ball.behaviors.Physics;
	const paddle = runtime.objects.Paddle.getFirstInstance();
	const paddle2 = runtime.objects.Paddle2.getFirstInstance();
	
	if (ballMoving) {
		physics.isImmovable = false;
		// Keep track of ballVel so that we have a constant velocity.
		
		if (gameMode === "Multiplayer" && client && client.isHost) {
			physics.setVelocity(ballVelX, ballVelY);
			checkForPoint(runtime, paddle, paddle2, ball);
		} else if (gameMode === "SinglePlayer") {
			physics.setVelocity(ballVelX, ballVelY); // I hate gravity and air resistance. I do this to "negate" air resistance and gravity from slowing down the ball.
			checkForPoint(runtime, paddle, paddle2, ball);
		} else {
			physics.setVelocity(0, 0);
		}
	} else {
		physics.isImmovable = true;
	}

	if (gameMode === "Multiplayer" && client) {
		if (client.isHost) {
			client.send("ballDataUpdate", {
				ball: { x: ball.x, y: ball.y, angularVelocity: physics.angularVelocity }
			});
		}
		
		movePaddle(runtime, client.isHost ? paddle : paddle2);
	} else if (gameMode === "SinglePlayer") {
		movePaddle(runtime, paddle);		
	}
}

function TitleTick(runtime) {
	
}

function Tick(runtime)
{
	if (runtime.layout.name == "GameScreen")
		return GameTick(runtime);
	
	TitleTick(runtime);
}
