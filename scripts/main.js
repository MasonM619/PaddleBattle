
// Import any other script files here, e.g.:
// import * as myModule from "./mymodule.js";

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
	
	
	
	//onLayoutChange(runtime);
}

function checkForClick(runtime) {
	if (runtime.layout.name != "TitleScreen" && runtime.layout.name != "DirectionsScreen")
		return;
	
	for (const instance of runtime.objects.SpriteMenuBtn.getAllInstances()) {
		const [x, y] = runtime.mouse.getMousePosition();

		if (x >= instance.x - (instance.width/2) && x <= instance.x + (instance.width/2)) {
			if (y >= instance.y - (instance.height/2) && y <= instance.y + (instance.height/2)) {
				instance.text = instance.instVars.text;
				console.log(instance.text);
				let func = onMenuBtnClicked.bind(instance, runtime);
				func();
			}
		}
	}
}

async function onLayoutChange(runtime) {
	for (const instance of runtime.objects.SpriteMenuBtn.getAllInstances()) {
		instance.addEventListener("click", onMenuBtnClicked.bind(instance, runtime));
	}
	
	let func = checkForClick.bind(null, runtime);
	
	document.removeEventListener("click", func);
	document.addEventListener("click", func);
	
	console.log("test");
}

let startVel = 250;
let ballVelX = startVel;
let ballVelY = startVel;

let gspeed = 15;

function onMenuBtnClicked(runtime) {
	switch (this.text) {
		case "Singleplayer":
			runtime.goToLayout("GameScreen");
			break;
		
		case "Multiplayer":
// 			alert("Not available yet!");
			gameMode = "Multiplayer";
			runtime.goToLayout("GameScreen");
			break;
		
		case "Directions":
			runtime.goToLayout("DirectionsScreen");
			break;
			
		case "Go Back":
			runtime.goToLayout("TitleScreen");
			break;
			
		default:
			runtime.goToLayout("TitleScreen");
			break;
	}
}

function onBallCollision(runtime, isWall = false, object = null) {
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
}

function resetBall(rt, ball) {
	ball.x = rt.layout.width / 2;
	ball.y = rt.layout.height / 2;
}
	
function resetPaddles(rt, player1, player2) {
	player1.y = rt.layout.height / 2;
	player2.y = rt.layout.height / 2;
}
	
function GameTick(runtime) {
	const ball = runtime.objects.Ball.getFirstInstance();
	const physics = ball.behaviors.Physics;
	const paddle = runtime.objects.Paddle.getFirstInstance();
	const paddle2 = runtime.objects.Paddle2.getFirstInstance();
	
	if (ballMoving) {
		physics.isImmovable = false;
		// Keep track of ballVel so that we have a constant velocity.
		physics.setVelocity(ballVelX, ballVelY); // I hate gravity and air resistance. I do this to "negate" air resistance and gravity from slowing down the ball.
		
		if (ball.x <= (paddle.x - (paddle.width ))) {
			rightScore++;
			resetBall(runtime, ball);
			resetPaddles(runtime, paddle, paddle2);
			
			ballVelX = startVel;
			ballVelY = startVel;
		}
		
		if (ball.x >= (paddle2.x + (paddle2.width))) {
			leftScore++;
			resetBall(runtime, ball);
			resetPaddles(runtime, paddle, paddle2);
			
			ballVelX = -startVel;
			ballVelY = -startVel;
		}
	} else {
		physics.isImmovable = true;
	}

	movePaddle(runtime, paddle);
}

function TitleTick(runtime) {
	
}

function Tick(runtime)
{
	if (runtime.layout.name == "GameScreen")
		return GameTick(runtime);
	
	TitleTick(runtime);
}
