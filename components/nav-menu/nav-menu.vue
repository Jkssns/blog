<template>
	<view class="menu-button" 
		@mouseenter="showMenu" 
		@mouseleave="hideMenu"
		@click.stop="toggleMenu"
		@touchstart="showMenu"
	>
		<text class="menu-icon">☰</text>
		
		<!-- 下拉菜单 -->
		<view 
			class="dropdown-menu" 
			:class="{'show': isMenuVisible}"
			@mouseenter="showMenu"
			@mouseleave="hideMenu"
			@click.stop
		>
			<view class="menu-item" @click.stop="goToPage('/pages/index/index')">
				<text class="menu-item-icon">🏠</text>
				<text class="menu-item-text">首页</text>
			</view>
			<view class="menu-item" @click.stop="goToPage('/pages/about/about')">
				<text class="menu-item-icon">👤</text>
				<text class="menu-item-text">关于我</text>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'nav-menu',
	data() {
		return {
			isMenuVisible: false,
			menuTimer: null
		}
	},
	methods: {
		showMenu() {
			if (this.menuTimer) {
				clearTimeout(this.menuTimer);
				this.menuTimer = null;
			}
			this.isMenuVisible = true;
		},
		
		hideMenu() {
			this.menuTimer = setTimeout(() => {
				this.isMenuVisible = false;
			}, 200);
		},
		
		toggleMenu() {
			this.isMenuVisible = !this.isMenuVisible;
		},
		
		goToPage(path) {
			this.isMenuVisible = false;
			uni.navigateTo({
				url: path,
				success: () => {
					console.log('导航成功');
				},
				fail: (err) => {
					console.error('导航失败：', err);
					uni.showToast({
						title: '页面导航失败',
						icon: 'none'
					});
				}
			});
		}
	},
	beforeDestroy() {
		if (this.menuTimer) {
			clearTimeout(this.menuTimer);
			this.menuTimer = null;
		}
	}
}
</script>

<style lang="scss" scoped>
.menu-button {
	position: fixed;
	top: 30rpx;
	left: 30rpx;
	width: 90rpx;
	height: 90rpx;
	background: linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%);
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 4rpx 20rpx rgba(255, 154, 158, 0.3);
	z-index: 101;
	transition: all 0.3s ease;
	cursor: pointer;
	
	&:hover {
		transform: scale(1.1);
		box-shadow: 0 6rpx 25rpx rgba(255, 154, 158, 0.4);
	}
	
	&:active {
		transform: scale(0.95);
	}
	
	.menu-icon {
		color: white;
		font-size: 40rpx;
		font-weight: bold;
	}
}

.dropdown-menu {
	position: absolute;
	top: 100%;
	left: 0;
	margin-top: 10rpx;
	background: white;
	border-radius: 16rpx;
	box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15);
	backdrop-filter: blur(10px);
	overflow: hidden;
	opacity: 0;
	transform: translateY(-10rpx) scale(0.95);
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	pointer-events: none;
	min-width: 180rpx;
	z-index: 102;
	
	&.show {
		opacity: 1;
		transform: translateY(0) scale(1);
		pointer-events: auto;
	}
	
	.menu-item {
		display: flex;
		align-items: center;
		padding: 24rpx 30rpx;
		border-bottom: 1rpx solid #f0f0f0;
		transition: background 0.2s ease;
		cursor: pointer;
		
		&:last-child {
			border-bottom: none;
		}
		
		&:hover {
			background: #f8f9fa;
		}
		
		&:active {
			background: #e9ecef;
		}
		
		.menu-item-icon {
			font-size: 32rpx;
			margin-right: 20rpx;
		}
		
		.menu-item-text {
			font-size: 28rpx;
			color: #333;
			font-weight: 500;
		}
	}
}

// 移动端适配
@media screen and (max-width: 768px) {
	.menu-button {
		width: 80rpx;
		height: 80rpx;
		top: 20rpx;
		left: 20rpx;
		
		.menu-icon {
			font-size: 36rpx;
		}
	}
	
	.dropdown-menu {
		min-width: 160rpx;
		
		.menu-item {
			padding: 20rpx 24rpx;
			
			.menu-item-icon {
				font-size: 28rpx;
				margin-right: 16rpx;
			}
			
			.menu-item-text {
				font-size: 26rpx;
			}
		}
	}
}
</style> 