<template>
	<view class="container">
		<nav-menu></nav-menu>
		<view class="profile">
			<view class="header">
				<view class="avatar">
					<image src="https://jkssns.github.io/preview-base64-image/assets/bear.png" mode="aspectFill" class="avatar-img"></image>
				</view>
				<text class="name">博主</text>
				<text class="title">热爱生活的小比崽子</text>
			</view>

			<view class="quote-container">
				<view class="quote-wrapper">
					<view class="quote" v-for="(quote, index) in quotes" :key="index" :class="{ active: currentIndex === index }">
						{{ currentText }}<text class="cursor" v-if="currentIndex === index"></text>
					</view>
				</view>
			</view>

			<view class="skills">
				<text class="section-title">兴趣爱好</text>
				<view class="skill-tags">
					<view class="skill-tag" v-for="(hobby, index) in hobbies" :key="index">
						<text class="hobby-icon">{{ hobby.icon }}</text>
						<text>{{ hobby.name }}</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import NavMenu from '@/components/nav-menu/nav-menu.vue'

export default {
	components: {
		NavMenu
	},
	data() {
		return {
			quotes: [
				'生活就像一盒巧克力，你永远不知道下一块是什么味道，但你知道它一定很贵。',
				'你以为你是在努力，其实你只是在努力地看起来很努力。',
				'人生就像一杯茶，不会苦一辈子，但总会苦一阵子，而且苦的时候特别长。',
				'你以为你是在进步，其实你只是在原地踏步，只是别人都在后退。',
				'生活就像打游戏，你以为你是在升级，其实你只是在重复刷怪。'
			],
			currentIndex: 0,
			currentText: '',
			currentCharIndex: 0,
			isDeleting: false,
			typingSpeed: 100,
			deletingSpeed: 50,
			pauseTime: 3000,
			hobbies: [
				{ icon: '🏓', name: '乒乓球' },
				{ icon: '🏸', name: '羽毛球' },
				{ icon: '🎮', name: '打游戏' },
				{ icon: '🎬', name: '看电影' }
			]
		}
	},
	mounted() {
		this.typeWriter();
	},
	methods: {
		typeWriter() {
			const text = this.quotes[this.currentIndex];

			if (!this.isDeleting && this.currentCharIndex <= text.length) {
				// 打字阶段
				this.currentText = text.substring(0, this.currentCharIndex);
				this.currentCharIndex++;
				setTimeout(this.typeWriter, this.typingSpeed);
			} else if (this.isDeleting && this.currentCharIndex >= 0) {
				// 删除阶段
				this.currentText = text.substring(0, this.currentCharIndex);
				this.currentCharIndex--;
				setTimeout(this.typeWriter, this.deletingSpeed);
			} else {
				// 切换状态
				this.isDeleting = !this.isDeleting;
				if (!this.isDeleting) {
					// 切换到下一条
					this.currentIndex = (this.currentIndex + 1) % this.quotes.length;
					this.currentCharIndex = 0;
				}
				setTimeout(this.typeWriter, this.isDeleting ? this.pauseTime : this.typingSpeed);
			}
		}
	}
}
</script>

<style lang="scss" scoped>
.container {
	max-width: 1200px;
	margin: 0 auto;
	padding: 2rem;
}

.profile {
	background: rgba(255, 255, 255, 0.9);
	border-radius: 20px;
	padding: 3rem;
	box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
	backdrop-filter: blur(10px);
	margin-top: 2rem;
	transition: transform 0.3s ease;
	
	&:hover {
		transform: translateY(-5px);
	}
}

.header {
	text-align: center;
	margin-bottom: 3rem;
}

.avatar {
	width: 150px;
	height: 150px;
	border-radius: 50%;
	margin: 0 auto 1.5rem;
	background: #e0e0e0;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
	overflow: hidden;
	
	.avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
}

.name {
	font-size: 2.5rem;
	color: #2c3e50;
	margin-bottom: 0.5rem;
	display: block;
}

.title {
	font-size: 1.2rem;
	color: #666;
	margin-bottom: 1rem;
	display: block;
}

.quote-container {
	margin: 2rem auto;
	max-width: 650px;
	overflow: hidden;
	position: relative;
	height: 60px;
	background: rgba(255, 255, 255, 0.5);
	border-radius: 10px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.quote-wrapper {
	position: relative;
	width: 100%;
	text-align: center;
}

.quote {
	color: #666;
	font-style: italic;
	font-size: 1.1rem;
	display: none;
	
	&.active {
		display: block;
	}
}

.cursor {
	display: inline-block;
	width: 2px;
	height: 1rem;
	background-color: #666;
	margin-left: 2px;
	animation: blink 0.7s infinite;
}

@keyframes blink {
	0%, 100% { opacity: 1; }
	50% { opacity: 0; }
}

.skills {
	margin-top: 3rem;
	text-align: center;
}

.section-title {
	font-size: 1.5rem;
	color: #2c3e50;
	margin-bottom: 1rem;
	display: block;
}

.skill-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 1rem;
	justify-content: center;
	margin-top: 1rem;
}

.skill-tag {
	background: #e0e0e0;
	padding: 0.5rem 1rem;
	border-radius: 15px;
	font-size: 0.9rem;
	color: #666;
	transition: all 0.3s ease;
	display: flex;
	align-items: center;
	gap: 0.5rem;
	
	&:hover {
		background: #2c3e50;
		color: white;
		transform: scale(1.05);
	}
}

.hobby-icon {
	font-size: 1.2rem;
}

@media (max-width: 768px) {
	.container {
		padding: 1rem;
	}
	
	.profile {
		padding: 2rem;
	}
	
	.name {
		font-size: 2rem;
	}
	
	.avatar {
		width: 120px;
		height: 120px;
	}
	
	.quote-container {
		height: 80px;
	}
	
	.quote {
		font-size: 1rem;
	}
	
	.skill-tag {
		font-size: 0.8rem;
		padding: 0.4rem 0.8rem;
	}
}
</style> 