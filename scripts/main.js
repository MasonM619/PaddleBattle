
// Import any other script files here, e.g.:
// import * as myModule from "./mymodule.js";

runOnStartup(async runtime =>
{
	// Code to run on the loading screen.
	// Note layouts, objects etc. are not yet available.
	
	runtime.addEventListener("beforeprojectstart", () => OnBeforeProjectStart(runtime));
});

async function OnBeforeProjectStart(runtime)
{
	// Code to run just before 'On start of layout' on
	// the first layout. Loading has finished and initial
	// instances are created and available to use here.
	
	runtime.addEventListener("tick", () => Tick(runtime));
	
	window.ballCollision = onBallCollision.bind(null, runtime);
}

let ballVelX = 250;
let ballVelY = 250;

let gspeed = 15;

function onBallCollision(runtime, isWall = false, object = null) {
	// TODO: Fix collision against paddle. Detect side of paddle hit and incorporate paddle velocity into the ball velocity.
	
	// BASIC WALL/FLOOR RECTANGULAR COLLISION
	const ball = runtime.objects.Ball.getFirstInstance();
	const bphysics = ball.behaviors.Physics;
	const vel = bphysics.getVelocity();
	const newVel = [isWall ? vel[0] * -1 : vel[0], !isWall ? vel[1] * -1 : vel[1]];
	const contacts = bphysics.getContactCount();
	
	//Im trying to get the ball to correctly bounce in the direction it is traveling. So if it were to hit the wall it would change velocity correctly depending on the angle of the wall and whatnot. I also wanted it to incorporate the velocity of the paddle into bouncing the ball. So say you are moving down and the ball hits while the paddle is moving down. I wanted it to slow down the ball if it were moving up. If the ball is moving down and the paddle moves down when contact is made then it will speed up the ball and give it more "angle." I have a basic bouncing/collision technique already made, but yesterday I tried implementing the way I explained.
	
	console.log(object);
	
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
			
			console.log(speed);
			
			//instance.angleS
			
			break;
		}
	}
	
	console.log(bphysics.getContact(0), isWall);
	bphysics.setVelocity(...newVel);
	
	ballVelX = newVel[0];
	ballVelY = newVel[1];
	
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
	
	if (runtime.keyboard.isKeyDown("KeyW")) {
		paddle.y -= speed;
		paddle.Speed = -speed;
	}
	
	if (runtime.keyboard.isKeyDown("KeyS")) {
		paddle.y += speed;
		paddle.Speed = speed;
	}
	
	if (runtime.keyboard.isKeyDown("ArrowUp")) {
		paddle.y -= speed;
		paddle.Speed = -speed;
	}
	
	if (runtime.keyboard.isKeyDown("ArrowDown")) {
		paddle.y += speed;
		paddle.Speed = speed;
	}
	
	if (paddle.y >= maxHeight) {
		paddle.y = maxHeight;
	}
	
	if (paddle.y <= minHeight) {
		paddle.y = minHeight;
	}
}

function Tick(runtime)
{
	const ball = runtime.objects.Ball.getFirstInstance();
	const physics = ball.behaviors.Physics;
	physics.setVelocity(ballVelX, ballVelY);

	const paddle = runtime.objects.Paddle.getFirstInstance();
	movePaddle(runtime, paddle);
}
