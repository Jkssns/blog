<template>
	<view class="blog-container">
		<!-- 博客列表 -->
		<scroll-view 
			scroll-y 
			class="blog-list"
			@scrolltolower="loadMore"
			:refresher-enabled="true"
			@refresherrefresh="onRefresh"
			:scroll-top="scrollTop"
			:scroll-with-animation="true"
			:show-scrollbar="false"
		>
			<!-- 添加博客表单 - 始终显示在列表第一个位置 -->
			<view class="blog-item editor">
				<view class="editor-content">
					<div
						class="blog-editor"
						contenteditable="true"
						placeholder="写下你的想法...(Ctrl+Enter发布)"
						@input="onContentChange"
						@paste="onEditorPaste"
						@keydown="handleKeyDown"
					></div>
				</view>
			</view>
			
			<!-- 空状态 -->
			<view class="empty-state" v-if="blogList.length === 0">
				<image src="/static/empty.png" mode="aspectFit" class="empty-image"></image>
				<text class="empty-text">还没有任何博客内容</text>
				<text class="empty-subtext">在上方输入框中写下你的想法吧</text>
			</view>
			
			<!-- 博客列表 -->
			<view 
				v-for="(blog, index) in blogList" 
				:key="blog._id"
				class="blog-item"
				:class="{'fade-in': true, 'expanded': blog.isExpanded}"
				:style="{'animation-delay': index * 0.1 + 's'}"
			>
				<view class="blog-content-wrapper" :class="{'expanded': blog.isExpanded}">
					<view class="dblclick-catcher" @tap="toggleExpand(blog)"></view>
					<div
						class="blog-content"
						:ref="'content-' + blog._id"
						v-html="blog.content"
					></div>
				</view>
				<view class="blog-footer">
					<text class="blog-time">{{formatTime(blog.createTime)}}</text>
					<view class="blog-actions">
						<view class="action-btn edit-btn" @tap.stop="editBlog(blog)">
							<image src="/static/imgs/edit.svg" mode="aspectFit" class="action-icon"></image>
						</view>
						<view class="action-btn history-btn" @tap.stop="viewHistory(blog)">
							<image src="/static/imgs/history.svg" mode="aspectFit" class="action-icon"></image>
						</view>
						<view class="action-btn delete-icon" @tap.stop="confirmDelete(blog)">
							<image src="/static/imgs/delete.svg" mode="aspectFit" class="action-icon"></image>
						</view>
						<view class="action-btn favorite-btn" @tap.stop="toggleFavorite(blog)">
							<image v-if="blog.isFavorite" src="/static/imgs/like_active.svg" mode="aspectFit" class="action-icon"></image>
							<image v-else src="/static/imgs/like.svg" mode="aspectFit" class="action-icon"></image>
						</view>
					</view>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			newBlog: {
				content: '',
				images: []
			},
			blogList: [],
			page: 1,
			pageSize: 10,
			scrollTop: 0,
			isProcessingPaste: false,
			editingBlogId: null, // 当前正在编辑的博客ID
			// 测试数据
			testContents: [
				'今天天气真好，阳光明媚，心情愉悦！',
				'分享一个有趣的小故事：从前有座山，山上有座庙...',
				'最近在学习新的技术，感觉收获很多。',
				'推荐一本好书：《活着》，非常值得一读。',
				'周末去爬山，拍了很多美丽的照片。',
				'今天做了一道新菜，味道不错！',
				'分享一个编程小技巧，希望对大家有帮助。',
				'记录一下今天的所思所想...',
				'生活就像一杯茶，需要慢慢品味。',
				'今天遇到一个有趣的人，聊了很多。'
			],
			lastTap: 0
		}
	},
	onLoad() {
		this.loadBlogs()
	},
	methods: {
		
		// 处理键盘事件，Ctrl+Enter提交
		handleKeyDown(e) {
			// 如果按下的是回车键且同时按下了Ctrl键
			if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
				e.preventDefault(); // 阻止默认的换行行为
				this.submitBlog();
			}
		},

		previewImage(current) {
			uni.previewImage({
				urls: this.newBlog.images,
				current
			});
		},
		
		// 内容变化
		onContentChange(e) {
			this.newBlog.content = e.target.innerHTML;
		},
		
		// 处理编辑器粘贴事件
		async onEditorPaste(e) {
			// 阻止默认粘贴行为
			e.preventDefault();
			
			if (this.isProcessingPaste) return;
			this.isProcessingPaste = true;
			
			const items = e.clipboardData?.items;
			if (!items) {
				this.isProcessingPaste = false;
				return;
			}

			const editor = document.querySelector('.blog-editor');
			const existingImages = new Set([...editor.querySelectorAll('img')].map(img => img.src));
			
			// 保存当前选区
			const selection = window.getSelection();
			const range = selection.getRangeAt(0);

			try {
				for (let i = 0; i < items.length; i++) {
					if (items[i].type.indexOf('image') !== -1) {
						const file = items[i].getAsFile();
						const reader = new FileReader();
						await new Promise((resolve, reject) => {
							reader.onloadend = async (e) => {
								try {
									const uploadResult = await uniCloud.uploadFile({
										filePath: e.target.result,
										cloudPath: `blog/${Date.now()}-${Math.random().toString(36).slice(-6)}.png`,
										cloudPathAsRealPath: true,
										fileType: 'image'
									});

									if (!existingImages.has(uploadResult.fileID)) {
										const img = document.createElement('img');
										img.src = uploadResult.fileID;
										img.style.maxWidth = '100%';

										// 在光标位置插入图片
										range.deleteContents();
										range.insertNode(img);

										// 将光标移动到图片后面
										range.setStartAfter(img);
										range.setEndAfter(img);
										selection.removeAllRanges();
										selection.addRange(range);

										existingImages.add(uploadResult.fileID);
									}
									resolve();
								} catch (error) {
									reject(error);
								}
							};
							reader.readAsDataURL(file);
						});
					}
				}
			} catch (error) {
				console.error('图片上传失败', error);
				uni.showToast({
					title: '图片上传失败',
					icon: 'none'
				});
			} finally {
				this.isProcessingPaste = false;
			}
		},
		
		// 提交博客
		async submitBlog() {
			const editor = document.querySelector('.blog-editor');
			if (!editor.innerHTML.trim()) {
				uni.showToast({
					title: '请输入内容或上传图片',
					icon: 'none'
				});
				return;
			}
			
			try {
				// 获取编辑器中的所有图片
				const images = [];
				const imgElements = editor.querySelectorAll('img');
				imgElements.forEach(img => {
					images.push(img.src);
				});
				
				let action = 'create';
				let data = {
					content: editor.innerHTML,
					images: images
				};
				
				// 如果是编辑现有博客
				if (this.editingBlogId) {
					action = 'update';
					data.id = this.editingBlogId;
				}
				
				// 保存博客内容到数据库
				const result = await uniCloud.callFunction({
					name: 'blog',
					data: {
						action: action,
						data: data
					}
				});
				
				if (result.result.code === 200) {
					uni.showToast({
						title: this.editingBlogId ? '更新成功' : '发布成功',
						icon: 'success'
					});
					// 清空编辑器内容
					editor.innerHTML = '';
					// 重置编辑状态
					this.editingBlogId = null;
					// 重新加载博客列表
					this.page = 1; // 重置到第一页
					this.loadBlogs();
				} else {
					throw new Error(result.result.msg);
				}
			} catch (e) {
				console.error(e);
				uni.showToast({
					title: this.editingBlogId ? '更新失败' : '发布失败',
					icon: 'none'
				});
			}
		},

		async loadBlogs() {
			try {
				const result = await uniCloud.callFunction({
					name: 'blog',
					data: {
						action: 'getList',
						data: {
							page: this.page,
							pageSize: this.pageSize
						}
					}
				})
				
				if (result.result.code === 200) {
					const blogs = result.result.data.map(blog => ({
						...blog,
						isExpanded: false,
						isFavorite: blog.isFavorite || false // 确保每个博客都有isFavorite属性
					}));
					
					if (this.page === 1) {
						this.blogList = blogs;
					} else {
						this.blogList = [...this.blogList, ...blogs];
					}
				} else {
					throw new Error(result.result.msg);
				}
			} catch (e) {
				console.error(e);
				uni.showToast({
					title: '加载失败',
					icon: 'none'
				});
			}
		},

		loadMore() {
			this.page++;
			this.loadBlogs();
		},

		async onRefresh() {
			this.page = 1;
			await this.loadBlogs();
			uni.stopPullDownRefresh();
		},

		formatTime(timestamp) {
			const date = new Date(timestamp);
			return date.toLocaleString();
		},

		deleteImage(index) {
			this.newBlog.images.splice(index, 1);
		},
		
		// 生成时间线数据
		generateTimelineData() {
			const data = [];
			const yearMap = new Map();
			this.blogList.forEach(blog => {
				const date = new Date(blog.createTime);
				const year = date.getFullYear();
				const month = date.getMonth() + 1;
				
				if (!yearMap.has(year)) {
					yearMap.set(year, new Set());
					data.push({
						type: 'year',
						label: year,
						year,
						active: false
					});
				}
				
				const monthSet = yearMap.get(year);
				if (!monthSet.has(month)) {
					monthSet.add(month);
					data.push({
						type: 'month',
						label: month,
						year,
						month,
						active: false
					});
				}
			});
			
			this.timelineData = data;
		},
		
		// 监听滚动更新时间线
		onScroll(e) {
			const scrollTop = e.detail.scrollTop;
			const query = uni.createSelectorQuery();
			this.blogList.forEach(blog => {
				query.select(`#blog-${blog._id}`).boundingClientRect();
			});
			query.exec(res => {
				const rects = res.filter(r => r);
				const currentRect = rects.find(r => r.top >= 0);
				if (currentRect) {
					const blog = this.blogList[rects.indexOf(currentRect)];
					const date = new Date(blog.createTime);
					const year = date.getFullYear();
					const month = date.getMonth() + 1;
					this.timelineData.forEach(item => {
						if (item.type === 'year') {
							item.active = (item.year === year);
						} else if (item.type === 'month') {
							item.active = (item.year === year && item.month === month);
						}
					});
				}
			});
		},
		
		// 滚动到指定年月
		scrollToYearMonth(item) {
			const { year, month } = item;
			const targetBlog = this.blogList.find(blog => {
				const date = new Date(blog.createTime);
				return date.getFullYear() === year && (!month || date.getMonth() + 1 === month);
			});
			
			if (targetBlog) {
				const query = uni.createSelectorQuery();
				query.select(`#blog-${targetBlog._id}`).boundingClientRect();
				query.selectViewport().boundingClientRect();
				query.exec(res => {
					if (res[0] && res[1]) {
						const blogRect = res[0];
						const viewportRect = res[1];
						const scrollTop = blogRect.top - viewportRect.top + this.scrollTop;
						
						// 使用平滑滚动
						this.scrollTop = scrollTop;
						
						// 显示时间线
						this.isTimelineVisible = true;
						
						// 1秒后隐藏时间线
						if (this.scrollTimer) {
							clearTimeout(this.scrollTimer);
						}
						this.scrollTimer = setTimeout(() => {
							this.isTimelineVisible = false;
						}, 1000);
						
						// 高亮对应博文时间
						this.blogList.forEach(blog => blog.timeHighlight = false);
						targetBlog.timeHighlight = true;
						setTimeout(() => {
							targetBlog.timeHighlight = false;
						}, 1000);
					}
				});
			}
		},
		
		// 切换展开/收起状态
		toggleExpand(blog) {
			blog.isExpanded = !blog.isExpanded;
		},
		
		// 编辑博客
		editBlog(blog) {
			// 获取编辑器元素
			const editor = document.querySelector('.blog-editor');
			if (editor) {
				// 将博客内容填充到编辑器中
				editor.innerHTML = blog.content;
				// 滚动到顶部，让用户看到编辑器
				this.scrollTop = 0;
				// 保存当前正在编辑的博客ID，用于后续更新操作
				this.editingBlogId = blog._id;
				
				uni.showToast({
					title: '已加载内容到编辑器',
					icon: 'none'
				});
			}
		},
		
		// 查看编辑历史
		viewHistory(blog) {
			uni.showToast({
				title: '查看历史记录功能开发中',
				icon: 'none'
			});
			// 这里可以实现查看博客的编辑历史记录
			// 需要后端支持存储历史版本
		},
		
		// 确认删除
		confirmDelete(blog) {
			uni.showModal({
				title: '确认删除',
				content: '确定要删除这条博客吗？删除后无法恢复。',
				success: async (res) => {
					if (res.confirm) {
						await this.deleteBlog(blog);
					}
				}
			});
		},
		
		// 删除博客
		async deleteBlog(blog) {
			try {
				const result = await uniCloud.callFunction({
					name: 'blog',
					data: {
						action: 'delete',
						data: {
							id: blog._id
						}
					}
				});
				
				if (result.result.code === 200) {
					uni.showToast({
						title: '删除成功',
						icon: 'success'
					});
					// 从列表中移除已删除的博客
					this.blogList = this.blogList.filter(item => item._id !== blog._id);
				} else {
					throw new Error(result.result.msg);
				}
			} catch (e) {
				console.error(e);
				uni.showToast({
					title: '删除失败',
					icon: 'none'
				});
			}
		},
		
		// 切换收藏状态
		async toggleFavorite(blog) {
			// 切换收藏状态
			const isFavorite = !blog.isFavorite;
			
			try {
				const result = await uniCloud.callFunction({
					name: 'blog',
					data: {
						action: 'updateFavorite',
						data: {
							id: blog._id,
							isFavorite: isFavorite
						}
					}
				});
				
				if (result.result.code === 200) {
					// 更新本地状态
					blog.isFavorite = isFavorite;
					uni.showToast({
						title: isFavorite ? '已收藏' : '已取消收藏',
						icon: 'none'
					});
				} else {
					throw new Error(result.result.msg);
				}
			} catch (e) {
				console.error(e);
				uni.showToast({
					title: '操作失败',
					icon: 'none'
				});
			}
		}
	}
}
</script>

<style lang="scss">
/* 图标样式 */
.action-icon {
  width: 32rpx;
  height: 32rpx;
}

page {
	background: #f5f5f5;
	height: 100vh;
	overflow: hidden;
}


.delete-btn {
	position: fixed;
	right: 30rpx;
	bottom: 290rpx;
	width: 100rpx;
	height: 100rpx;
	background: linear-gradient(135deg, #ffb199 0%, #ff0844 100%);
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 4rpx 20rpx rgba(255, 8, 68, 0.3);
	z-index: 100;
	transition: all 0.3s ease;
	
	&:active {
		transform: scale(0.95);
	}
}

.blog-container {
	min-height: 100vh;
	background: #f5f5f5;
	padding: 20rpx;
	display: flex;
	position: relative;
	height: 100vh;
	box-sizing: border-box;
	justify-content: center;
	
	.blog-list {
		width: 500px;
		height: 100%;
		margin-right: 0;
		box-sizing: border-box;
		position: relative;
		
		&::-webkit-scrollbar {
			width: 6px;
			background-color: transparent;
		}
		
		&::-webkit-scrollbar-thumb {
			background-color: rgba(0, 0, 0, 0.2);
			border-radius: 3px;
		}
		
		&::-webkit-scrollbar-track {
			background-color: transparent;
		}
	}
	
	.timeline {
		position: fixed;
		right: calc(50% - 250px);
		top: 50%;
		transform: translateY(-50%) translateX(250%);
		width: 120rpx;
		height: 60vh;
		padding: 20rpx 0;
		background: rgba(255, 255, 255, 0.95);
		border-radius: 60rpx;
		box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
		backdrop-filter: blur(10px);
		opacity: 0;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		z-index: 99;
		pointer-events: none;
		overflow: hidden;
		
		&.timeline-show {
			transform: translateY(-50%) translateX(150%);
			opacity: 1;
			pointer-events: auto;
		}
		
		.timeline-item {
			padding: 15rpx;
			text-align: center;
			transition: all 0.3s ease;
			position: relative;
			margin: 10rpx 0;
			display: flex;
			flex-direction: column;
			align-items: center;
			cursor: pointer;
			
			&:hover {
				transform: scale(1.1);
				
				.timeline-year,
				.timeline-month {
					color: #ff9a9e;
				}
				
				&::before {
					transform: translate(-50%, -50%) scale(1.2);
					box-shadow: 0 0 10rpx rgba(255, 154, 158, 0.5);
				}
			}
			
			&.active {
				&::before {
					width: 16rpx;
					height: 16rpx;
					background: #ff9a9e;
					box-shadow: 0 0 10rpx rgba(255, 154, 158, 0.5);
				}
				
				.timeline-year,
				.timeline-month {
					color: #ff9a9e;
					font-weight: bold;
				}
			}
		}
	}
}

.blog-item {
	background-color: #fff;
	border-radius: 20rpx;
	padding: 30rpx;
	margin: 20rpx;
	box-shadow: 0 8rpx 30rpx rgba(0,0,0,0.05);
	transform: translateY(20rpx);
	animation: fadeIn 0.5s ease forwards;
	border: 1rpx solid #e8e8e8;


	
	&.editor {
		.editor-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 20rpx;
			
			.editor-title {
				color: #333;
				font-size: 32rpx;
				font-weight: 500;
			}
			
			.close-btn {
				color: #999;
				font-size: 40rpx;
				padding: 10rpx;
				
				&:active {
					color: #ff9a9e;
				}
			}
		}
	}
	
	.blog-content-wrapper {
		position: relative;
		max-height: 200px;
		overflow: hidden;
		transition: max-height 0.3s ease;
		
		&.expanded {
			max-height: none;
		}
		
		.dblclick-catcher {
			position: absolute;
			left: 0; top: 0; right: 0; bottom: 0;
			z-index: 2;
			background: transparent;
		}
		.blog-content {
			position: relative;
			z-index: 1;
			font-size: 28rpx;
			line-height: 1.6;
			color: #333;
			white-space: pre-wrap;
		}
	}
	
	.blog-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 20rpx;
		padding-top: 20rpx;
		height: 60rpx;
		border-top: 1rpx solid #f0f0f0;
		
		.blog-time {
			font-size: 24rpx;
			color: #999;
			transition: color 0.3s;
			&.highlight {
				color: #ff9a9e;
				font-weight: bold;
			}
		}
		
		.blog-actions {
			display: none;
			align-items: center;
			
			.action-btn {
				width: 60rpx;
				height: 60rpx;
				border-radius: 50%;
				display: flex;
				align-items: center;
				justify-content: center;
				margin-left: 10rpx;
				transition: all 0.2s ease;
				background: #f5f5f5;
				cursor: pointer;
				
				.action-icon {
					width: 32rpx;
					height: 32rpx;
				}
				
				&:active {
					transform: scale(0.9);
				}
				
				&.edit-btn {
					&:hover, &:active {
						background: #e3f2fd;
					}
				}
				
				&.history-btn {
					&:hover, &:active {
						background: #e8f5e9;
					}
				}
				
				&.delete-icon {
					&:hover, &:active {
						background: #ffebee;
					}
				}
				
				&.favorite-btn {
					&:hover, &:active {
						background: #fff8e1;
					}
				}
			}
		}
	}
	
	&.slide-in {
		animation: slideIn 0.3s ease forwards;
	}
}

.blog-item:hover {
	.blog-actions {
		display: flex;
	}
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 100rpx 0;
	
	.empty-image {
		width: 300rpx;
		height: 300rpx;
		margin-bottom: 30rpx;
		opacity: 0.5;
	}
	
	.empty-text {
		font-size: 32rpx;
		color: #333;
		margin-bottom: 10rpx;
	}
	
	.empty-subtext {
		font-size: 28rpx;
		color: #999;
	}
}

@keyframes fadeIn {
	from {
		transform: translateY(20rpx);
		opacity: 0;
	}
	to {
		transform: translateY(0);
		opacity: 1;
	}
}

@keyframes slideIn {
	from {
		transform: translateY(-20rpx);
		opacity: 0;
	}
	to {
		transform: translateY(0);
		opacity: 1;
	}
}

// 移动端适配
@media screen and (max-width: 768px) {
	.blog-container {
		padding: 10rpx;
		
		.blog-list {
			width: 100%;
			margin-right: 0;
		}
		
		.timeline {
			width: 80rpx;
			right: 20rpx;
			height: 50vh;
			
			.timeline-item {
				padding: 10rpx;
				
				.timeline-year {
					font-size: 24rpx;
				}
				
				.timeline-month {
					font-size: 20rpx;
				}
			}
		}
	}
	
	.blog-item {
		padding: 20rpx;
	}
	

}

.blog-item.editor {
	margin-bottom: 30rpx;
	animation: slideIn 0.3s ease forwards;
	border: 1.5px solid #e8e8e8;
	transition: border 0.2s;
	
	&:focus-within {
		border: 1.5px solid #ff9a9e;
	}
	
	.editor-content {
		margin: 0;
	}
	
	.blog-editor {
		min-height: 80px;
		width: 100%;
		background: #fafbfc;
		border-radius: 12px;
		padding: 18px 14px;
		font-size: 16px;
		color: #333;
		outline: none;
		transition: background 0.2s;
		box-sizing: border-box;
		overflow-y: auto;
		
		&:focus {
			background: #fff;
		}
		
		&:empty:before {
			content: attr(placeholder);
			color: #999;
		}
	}
}


</style>