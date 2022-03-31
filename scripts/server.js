const serverURL = "wss://paddlebattleserver.masonmarquez.repl.co/";

class IEventListener {
	constructor() {
		this.events = {}
	}
	
	hasEvent(event) {
		return this.events.hasOwnProperty(event);
	}
	
	on(event, cb) {
		if (!this.hasEvent(event))
			this.events[event] = [];
		
		this.events[event].push(cb);
		
		return true;
	}
	
	emit(event, ...data) {
		if (!this.hasEvent(event))
			return false;
		
		const listeners = this.events[event];
		
		for (const cb of listeners) {
			cb(...data);
		}
		
		return true;
	}
}

class Client extends IEventListener {
	constructor(runtime) {
		super();
		this.runtime = runtime;
		this.ws = new WebSocket(serverURL);
		
		this.ws.addEventListener("open", data => this.emit("ready", data));
		this.ws.addEventListener("message", msg => {
			const data = JSON.parse(msg.data);
			this.emit(data.event, ...data.data)
		});
		
		this.username = "";
		this.room = {};
		this.id = 0;
		this.isHost = false;
		this.clientData = {};
	}
	
	checkHost() {
		if (this.isHost) {
			for (const instance of this.runtime.objects.SpriteMenuBtn.getAllInstances()) {
				instance.text = instance.instVars.text;
				if (instance.text !== "Start Game")
					continue;

				instance.isVisible = true;
			}
			
			for (const instance of this.runtime.objects.BtnText2.getAllInstances()) {
				if (instance.text !== "Start Game")
					continue;

				instance.isVisible = true;
			}
		}
	}
	
	send(event, ...data) {
		const msgData = {
			event,
			data: Array.isArray(data) ? data : [data]
		};
		
		return this.ws.send(JSON.stringify(msgData));
	}
	
	joinRoom(room) {
		if (!room)
			return false;
		
		this.send("joinRoom", room);
		return true;
	}
	
	leaveRoom() {
		this.send("leaveRoom");
	}
	
	startGame() {
		this.send("startGame");
	}
};

export default function connectToServer(runtime) {
	return new Client(runtime);
}