export const POWERUPS = {
	"FastBall": {
		name: "FastBall",
		duration: 15000,
		action: function (runtime, instance) {
			const previousAnimation = instance.animationName;
			instance.setAnimation(this.name);
			
			setTimeout(() => {instance.setAnimation(previousAnimation); instance.destroy()}, this.duration);
		}
	},
	"Split": {
		name: "Split",
		duration: 10000,
		action: function (runtime, instance) {
			const previousAnimation = instance.animationName;
			instance.setAnimation(this.name);
			
			setTimeout(() => {instance.setAnimation(previousAnimation); instance.destroy()}, this.duration);
		}
	},
	"Shrink": {
		name: "Shrink",
		duration: 20000,
		action: function (runtime, instance) {
			const previousAnimation = instance.animationName;
			instance.setAnimation(this.name);
			
			setTimeout(() => {instance.setAnimation(previousAnimation); instance.destroy()}, this.duration);
		}
	}
} 