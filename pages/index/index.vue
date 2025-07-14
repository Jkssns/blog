<template>
	<view class="blog-container">
		<!-- 图片预览弹窗 -->
		<view class="image-preview-modal" v-if="showImagePreview" @click="closeImagePreview">
			<image
				class="preview-image" 
				:src="previewImageUrl" 
				mode="aspectFit"
				@click.stop
			></image>
			<view class="close-preview-btn" @click="closeImagePreview">×</view>
		</view>

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
					<view class="editor-toolbar">
						<view class="toolbar-btn image-btn" @click="openImageSelector">
							<image src="/static/imgs/image.svg" mode="aspectFit" class="toolbar-icon"></image>
							<text class="toolbar-text">添加图片</text>
						</view>
						<view class="toolbar-actions">
							<view class="toolbar-btn clear-btn" @click="clearEditor" v-if="newBlog.content || editingBlogId">
								<text class="toolbar-text">清空</text>
							</view>
							<view class="toolbar-btn submit-btn" @click="submitBlog">
								<text class="toolbar-text">{{ editingBlogId ? '更新' : '发布' }}</text>
							</view>
						</view>
					</view>
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
				@click="toggleExpand(blog)"
				:key="blog._id"
				class="blog-item"
				:class="{'fade-in': true, 'expanded': blog.isExpanded}"
				:style="{'animation-delay': index * 0.1 + 's'}"
			>
				<view class="blog-content-wrapper" :class="{'expanded': blog.isExpanded}">
					<div
						@click="toggleExpand(blog)"
						class="blog-content"
						:ref="'content-' + blog._id"
						:id="'blog-content-' + blog._id"
						v-html="blog.content"
					></div>
					<div class="content-mask" @click.stop="toggleExpand(blog)" v-if="!blog.isExpanded && blog.needsMask"></div>
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
						<view class="action-btn favorite-btn" :style="blog.isFavorite ? {display: 'flex!important'} : {}" @tap.stop="toggleFavorite(blog)">
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
			pendingUploads: 0, // 正在上传的图片数量
			showImagePreview: false, // 是否显示图片预览
			previewImageUrl: '' // 预览图片的URL
		}
	},
	onLoad() {
		this.loadBlogs()
	},

		mounted() {
		// 在组件挂载后，初始化编辑器中的图片点击事件
		this.setupEditorImagePreview();
		// 初始化拖放功能
		this.setupEditorDragDrop();
		// 添加CSS动画
		this.addCssAnimations();
	},

	beforeDestroy() {
		// 确保在组件销毁前隐藏所有loading和toast
		uni.hideLoading();
		uni.hideToast();
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

		// 预览编辑器中的图片
		previewEditorImage(current) {
			// 获取编辑器元素
			const editor = document.querySelector('.blog-editor');
			if (!editor) return;
			
			// 获取编辑器中的所有图片URL
			const images = Array.from(editor.querySelectorAll('img')).map(img => img.src);
			if (!images.length) return;
			
			// 调用uni-app的图片预览API
			uni.previewImage({
				urls: images,
				current: current,
				indicator: 'default', // 显示页码指示器
				loop: true // 循环预览
			});
		},

		// 检查内容高度，决定是否需要遮罩层
		checkContentHeight(blog) {
			this.$nextTick(() => {
				const contentEl = document.querySelector(`#blog-content-${blog._id}`);
				if (!contentEl) return;

				// 获取内容实际高度
				const contentHeight = contentEl.scrollHeight;

				// 如果内容高度超过200px，则需要遮罩层
				blog.needsMask = contentHeight > 200;
			});
		},

		// 为博客内容中的图片添加点击事件
		setupImagePreview(blog) {
			// 使用nextTick确保DOM已更新
			this.$nextTick(() => {
				// 获取博客内容元素
				const contentEl = document.querySelector(`#blog-content-${blog._id}`);
				if (!contentEl) return;
				
				// 获取内容中的所有图片
				const images = contentEl.querySelectorAll('img');
				if (!images.length) {
					// 如果没有图片，直接检查内容高度
					this.checkContentHeight(blog);
					return;
				}
				
				// 为每个图片添加点击事件和加载事件
				images.forEach(img => {
					// 移除旧的事件监听器（如果有）
					img.removeEventListener('click', this.handleImageClick);
					
					// 添加新的事件监听器
					img.addEventListener('click', (e) => {
						e.stopPropagation(); // 阻止事件冒泡，防止触发博客展开/收起
						this.previewBlogImages(blog, img.src);
					});
					
					// 添加样式，表明图片可点击
					img.style.cursor = 'zoom-in';
					
					// 添加图片加载完成事件，重新检查内容高度
					img.addEventListener('load', () => {
						this.checkContentHeight(blog);
					});
				});
				
				// 初始检查内容高度
				this.checkContentHeight(blog);
			});
		},

				// 为编辑器中的图片设置样式，但不添加预览功能
		setupEditorImagePreview() {
			// 使用nextTick确保DOM已更新
			this.$nextTick(() => {
				// 获取编辑器元素
				const editor = document.querySelector('.blog-editor');
				if (!editor) return;
				
				// 获取编辑器中的所有图片
				const images = editor.querySelectorAll('img');
				if (!images.length) return;
				
				// 为每个图片设置样式，但不添加预览功能
				images.forEach(img => {
					// 移除所有可能存在的点击事件
					const oldClickHandler = img._clickHandler;
					if (oldClickHandler) {
						img.removeEventListener('click', oldClickHandler);
						img._clickHandler = null;
					}

					// 如果是上传失败的图片，保留点击重试功能
					if (img.dataset.status === 'failed') {
						img.style.cursor = 'pointer';
						img.title = '点击重试上传';
					} else {
						// 移除鼠标悬停效果
						img.style.cursor = 'default';
						img.removeAttribute('title');
					}
				});
				
				// 更新编辑器状态指示
				this.updateEditorStatus();
			});
		},

		// 预览博客中的图片
		previewBlogImages(blog, current) {
			// 获取博客内容元素
			const contentEl = document.querySelector(`#blog-content-${blog._id}`);
			if (!contentEl) return;
			
			// 获取内容中的所有图片URL
			const images = Array.from(contentEl.querySelectorAll('img')).map(img => img.src);
			if (!images.length) return;
			
			// 调用uni-app的图片预览API
			uni.previewImage({
				urls: images,
				current: current,
				indicator: 'number', // 显示页码指示器
				loop: true // 循环预览
			});
		},

				// 内容变化
		onContentChange(e) {
			this.newBlog.content = e.target.innerHTML;
			// 在内容变化后，为编辑器中的图片设置样式
			this.setupEditorImagePreview();
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
			
			// 检查是否有图片
			let hasImages = false;
			for (let i = 0; i < items.length; i++) {
				if (items[i].type.indexOf('image') !== -1) {
					hasImages = true;
					break;
				}
			}

			try {
				for (let i = 0; i < items.length; i++) {
					if (items[i].type.indexOf('image') !== -1) {
						const file = items[i].getAsFile();
						const reader = new FileReader();
						
						// 创建一个唯一ID，用于标识这个图片
						const imageId = `temp-image-${Date.now()}-${Math.random().toString(36).slice(-6)}`;
						
						await new Promise((resolve) => {
							reader.onloadend = (e) => {
								// 立即创建并插入图片预览
								const img = document.createElement('img');
								img.src = e.target.result; // 使用本地数据URL作为预览
								img.id = imageId;
								img.style.maxWidth = '100%';
								img.dataset.status = 'uploading'; // 标记为正在上传
								
								// 添加上传中的视觉提示
								img.style.filter = 'opacity(0.7)';
								img.style.border = '2px dashed #ccc';
								
								// 在光标位置插入图片
								const currentRange = selection.getRangeAt(0);
								currentRange.deleteContents();
								currentRange.insertNode(img);
								
								// 将光标移动到图片后面
								currentRange.setStartAfter(img);
								currentRange.setEndAfter(img);
								selection.removeAllRanges();
								selection.addRange(currentRange);
								
								// 为预览图片添加点击事件
								this.setupEditorImagePreview();
								
								// 异步上传图片
								this.uploadImageAsync(e.target.result, imageId);
								
								resolve();
							};

							reader.readAsDataURL(file);
						});
					} else if (items[i].type === 'text/plain' || items[i].type === 'text/html') {
						// 处理文本粘贴
						items[i].getAsString((text) => {
							// 如果是HTML，直接插入
							if (items[i].type === 'text/html') {
								// 创建临时div来清理HTML
								const tempDiv = document.createElement('div');
								tempDiv.innerHTML = text;
								
								// 插入清理后的HTML
								document.execCommand('insertHTML', false, tempDiv.innerHTML);
							} else {
								// 纯文本，使用insertText命令
								document.execCommand('insertText', false, text);
							}
						});
					}
				}
			} catch (error) {
				console.error('图片处理失败', error);
				uni.showToast({
					title: '图片处理失败',
					icon: 'none'
				});
			} finally {
				this.isProcessingPaste = false;

				// 更新编辑器状态
				this.updateEditorStatus();
			}
		},

		// 异步上传图片
		async uploadImageAsync(dataUrl, imageId) {
			// 增加待上传图片计数
			this.pendingUploads++;

			try {
				// 显示上传进度提示
				const img = document.getElementById(imageId);
				if (!img) {
					this.pendingUploads--;
					return;
				}
				
								// 使用uni-app的方式添加上传中的视觉提示
				img.dataset.uploading = 'true';
				
				// 创建一个包装容器，使其成为相对定位的容器
				const wrapper = document.createElement('div');
				wrapper.id = `${imageId}-wrapper`;
				wrapper.style.position = 'relative';
				wrapper.style.display = 'inline-block';
				
				// 将图片包装在容器中
				img.parentNode.insertBefore(wrapper, img);
				wrapper.appendChild(img);
								// 执行上传（后台上传，但不替换图片地址）
				const uploadResult = await uniCloud.uploadFile({
					filePath: dataUrl,
					cloudPath: `blog/${Date.now()}-${Math.random().toString(36).slice(-6)}.png`,
					cloudPathAsRealPath: true,
					fileType: 'image'
				});
				
				// 上传成功，但保留本地图片显示，只记录云端地址
				if (img) {
					// 不替换src，保留本地图片显示
					// 但在dataset中记录云端地址，用于后续提交
					img.dataset.cloudSrc = uploadResult.fileID;
					img.dataset.status = 'uploaded';
					img.style.filter = '';
					img.style.border = '';
					
					// 移除上传中的标签和包装器
					const label = document.getElementById(`${imageId}-label`);
					if (label) label.remove();
					
					// 将图片从包装器中取出并放回原位置
					const wrapper = document.getElementById(`${imageId}-wrapper`);
					if (wrapper && wrapper.parentNode) {
						wrapper.parentNode.insertBefore(img, wrapper);
						wrapper.remove();
					}
				}
				
				// 重新设置图片点击事件
				this.setupEditorImagePreview();
			} catch (error) {
				console.error('图片上传失败', error);
				
				// 获取图片元素
				const img = document.getElementById(imageId);
				if (!img) {
					this.pendingUploads--;
					return;
				}
				
				// 显示上传失败的视觉提示
				img.style.filter = 'grayscale(100%)';
				img.style.border = '2px solid #ff4d4f';
				img.dataset.status = 'failed';
				
								// 标记图片为上传失败状态
				img.dataset.status = 'failed';

				// 确保有包装器
				let wrapper = document.getElementById(`${imageId}-wrapper`);
				if (!wrapper) {
					wrapper = document.createElement('div');
					wrapper.id = `${imageId}-wrapper`;
					wrapper.style.position = 'relative';
					wrapper.style.display = 'inline-block';
					img.parentNode.insertBefore(wrapper, img);
					wrapper.appendChild(img);
				}
				
				// 使用uni-app的提示功能
								uni.showToast({
					title: '图片上传失败，点击图片重试',
					icon: 'none',
					duration: 2000
				});

				// 添加点击重试功能
				img.onclick = (e) => {
					e.stopPropagation();
					// 重置状态为上传中
					img.dataset.status = 'uploading';
					this.uploadImageAsync(img.src, imageId);
				};
			} finally {
				// 减少待上传图片计数
				this.pendingUploads--;

				// 更新编辑器状态指示
				this.updateEditorStatus();
			}
		},

				// 更新编辑器状态
		updateEditorStatus() {
			// 获取提交按钮元素
			const submitBtn = document.querySelector('.submit-btn');
			if (!submitBtn) return;
			
			// 如果有图片正在上传，禁用提交按钮并显示提示
			if (this.pendingUploads > 0) {
				submitBtn.style.opacity = '0.5';
				submitBtn.style.pointerEvents = 'none';
				
				// 使用uni-app的loading提示
				uni.showLoading({
					title: `正在上传 ${this.pendingUploads} 张图片...`,
					mask: false
				});
			} else {
				// 恢复提交按钮
				submitBtn.style.opacity = '1';
				submitBtn.style.pointerEvents = 'auto';
				
				// 隐藏loading提示
				uni.hideLoading();
			}
		},

		// 设置编辑器的拖放功能
		setupEditorDragDrop() {
			const editor = document.querySelector('.blog-editor');
			if (!editor) return;
			
			// 防止浏览器默认的拖放行为
			editor.addEventListener('dragover', (e) => {
				e.preventDefault();
				e.stopPropagation();
				editor.classList.add('drag-over');
			});
			
			editor.addEventListener('dragleave', (e) => {
				e.preventDefault();
				e.stopPropagation();
				editor.classList.remove('drag-over');
			});
			
			editor.addEventListener('drop', async (e) => {
				e.preventDefault();
				e.stopPropagation();
				editor.classList.remove('drag-over');
				
				// 检查是否有文件被拖放
				if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
					const files = Array.from(e.dataTransfer.files);
					const imageFiles = files.filter(file => file.type.startsWith('image/'));
					
					if (imageFiles.length === 0) {
						uni.showToast({
							title: '只支持拖放图片文件',
							icon: 'none',
							duration: 2000
						});
						return;
					}
					
					// 处理每个图片文件
					for (const file of imageFiles) {
						try {
							// 读取文件为DataURL
							const dataUrl = await new Promise((resolve, reject) => {
								const reader = new FileReader();
								reader.onload = () => resolve(reader.result);
								reader.onerror = reject;
								reader.readAsDataURL(file);
							});
							
							// 创建图片元素并插入到编辑器
							const img = document.createElement('img');
							img.id = `img-${Date.now()}-${Math.random().toString(36).slice(-6)}`;
							img.src = dataUrl;
							img.style.maxWidth = '100%';
							img.style.height = 'auto';
							img.style.margin = '10px 0';
							img.dataset.status = 'uploading';
							
							// 获取光标位置并插入图片
							const selection = window.getSelection();
							if (selection.rangeCount > 0) {
								const range = selection.getRangeAt(0);
								range.insertNode(img);
								
								// 移动光标到图片后面
								range.setStartAfter(img);
								range.setEndAfter(img);
								selection.removeAllRanges();
								selection.addRange(range);
								
								// 确保图片后有一个换行
								const br = document.createElement('br');
								range.insertNode(br);
								range.setStartAfter(br);
								range.setEndAfter(br);
								selection.removeAllRanges();
								selection.addRange(range);
							} else {
								editor.appendChild(img);
								editor.appendChild(document.createElement('br'));
							}
							
							// 上传图片
							this.uploadImageAsync(dataUrl, img.id);
						} catch (error) {
							console.error('处理拖放图片失败', error);
							uni.showToast({
								title: '处理图片失败',
								icon: 'none',
								duration: 2000
							});
						}
					}
					
										// uni-app的提示会自动消失，不需要手动移除
				}
			});
			
			// 添加拖放提示样式
			const style = document.createElement('style');
			style.textContent = `
				.blog-editor.drag-over {
					background-color: rgba(24, 144, 255, 0.1) !important;
					border: 2px dashed #1890ff !important;
				}
			`;
			document.head.appendChild(style);
		},

		// 设置编辑器图片预览功能
		setupEditorImagePreview() {
			const editor = document.querySelector('.blog-editor');
			if (!editor) return;
			
			const images = editor.querySelectorAll('img');
			images.forEach(img => {
				// 跳过上传失败的图片，因为它们有自己的点击重试功能
				if (img.dataset.status === 'failed') return;
				
				// 先移除所有已绑定的事件（防止重复绑定）
				img.onclick = null;
				img.removeEventListener('_previewClick', img._previewClickHandler || (()=>{}));
				
				// 添加新的点击事件用于预览
				const clickHandler = (e) => {
					e.preventDefault();
					e.stopPropagation();
					
					// 设置预览图片URL
					this.previewImageUrl = img.src;
					this.showImagePreview = true;
				};
				img._previewClickHandler = clickHandler;
				img.addEventListener('click', clickHandler);

				// 添加鼠标悬停效果
				img.style.cursor = 'pointer';
				img.title = '点击查看大图';
			});
		},

		// 关闭图片预览
		closeImagePreview() {
			this.showImagePreview = false;
			this.previewImageUrl = '';
		},

		// 更新编辑器状态指示
		updateEditorStatus() {
			const editor = document.querySelector('.blog-editor');
			if (!editor) return;
			
			// 获取编辑器容器
			const editorContainer = editor.closest('.editor');
			if (!editorContainer) return;
			
			// 如果有正在上传的图片，显示状态指示
			if (this.pendingUploads > 0) {
				// 检查是否已存在状态指示器
				let statusIndicator = editorContainer.querySelector('.upload-status-indicator');
				if (!statusIndicator) {
					// 创建状态指示器
					statusIndicator = document.createElement('div');
					statusIndicator.className = 'upload-status-indicator';
					statusIndicator.style.padding = '4px 8px';
					statusIndicator.style.backgroundColor = '#e6f7ff';
					statusIndicator.style.borderRadius = '4px';
					statusIndicator.style.fontSize = '12px';
					statusIndicator.style.color = '#1890ff';
					statusIndicator.style.marginTop = '8px';
					statusIndicator.style.display = 'flex';
					statusIndicator.style.alignItems = 'center';
					
					// 添加到编辑器容器
					editorContainer.appendChild(statusIndicator);
				}
				
				// 更新状态文本
				statusIndicator.innerHTML = `
					<span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #1890ff; border-top-color: transparent; margin-right: 8px; animation: spin 1s linear infinite;"></span>
					正在上传 ${this.pendingUploads} 张图片...
				`;
				
				// 添加旋转动画样式
				if (!document.getElementById('upload-spinner-style')) {
					const style = document.createElement('style');
					style.id = 'upload-spinner-style';
					style.textContent = `
						@keyframes spin {
							0% { transform: rotate(0deg); }
							100% { transform: rotate(360deg); }
						}
					`;
					document.head.appendChild(style);
				}
			} else {
				// 移除状态指示器
				const statusIndicator = editorContainer.querySelector('.upload-status-indicator');
				if (statusIndicator) {
					statusIndicator.remove();
				}
			}
		},

		// 添加CSS动画
		addCssAnimations() {
			// 检查是否已存在动画样式
			if (document.getElementById('blog-animations')) return;
		
			// 创建样式元素
			const style = document.createElement('style');
			style.id = 'blog-animations';
		
			// 添加动画样式
			style.textContent = `
				@keyframes fadeIn {
					from {
						opacity: 0;
						transform: translateY(20px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}

				@keyframes spin {
					0% { transform: rotate(0deg); }
					100% { transform: rotate(360deg); }
				}

				@keyframes pulse {
					0% { transform: scale(1); }
					50% { transform: scale(1.05); }
					100% { transform: scale(1); }
				}

				.fade-in {
					animation: fadeIn 0.5s ease forwards;
				}

				.loading-icon {
					animation: spin 1s linear infinite;
				}

				.pulse {
					animation: pulse 1.5s ease infinite;
				}

				.blog-editor img {
					transition: all 0.3s ease;
				}

				.blog-editor img:hover {
					transform: scale(1.02);
					box-shadow: 0 4px 12px rgba(0,0,0,0.1);
				}
			`;

			// 添加到文档头部
			document.head.appendChild(style);
		},

		// 打开图片选择器
		openImageSelector() {
			// 使用uni-app的选择图片API
			uni.chooseImage({
				count: 9, // 最多可选择的图片数量
				sizeType: ['original', 'compressed'], // 可选择原图或压缩图
				sourceType: ['album', 'camera'], // 可选择性开放访问相册、相机
				success: (res) => {
					// 获取选择的图片临时路径
					const tempFilePaths = res.tempFilePaths;
					
					// 保存当前选区
					const selection = window.getSelection();
					const range = selection.getRangeAt(0);
					const savedRange = range.cloneRange();
					
					// 处理选择的图片
					tempFilePaths.forEach((path, index) => {
						// 创建一个唯一ID，用于标识这个图片
						const imageId = `select-image-${Date.now()}-${Math.random().toString(36).slice(-6)}-${index}`;
						
						// 立即创建并插入图片预览
						const img = document.createElement('img');
						img.src = path; // 使用临时路径作为预览
						img.id = imageId;
						img.style.maxWidth = '100%';
						img.dataset.status = 'uploading'; // 标记为正在上传
						
						// 添加上传中的视觉提示
						img.style.filter = 'opacity(0.7)';
						img.style.border = '2px dashed #ccc';
						
						// 在光标位置插入图片
						const currentRange = savedRange.cloneRange();
						currentRange.deleteContents();
						currentRange.insertNode(img);
						
						// 将光标移动到图片后面
						currentRange.setStartAfter(img);
						currentRange.setEndAfter(img);
						selection.removeAllRanges();
						selection.addRange(currentRange);
						
						// 为预览图片添加点击事件
						this.setupEditorImagePreview();
						
						// 异步上传图片
						this.uploadImageAsync(path, imageId);
					});
				}
			});
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
			
			// 检查是否有正在上传的图片
			const uploadingImages = editor.querySelectorAll('img[data-status="uploading"]');
			if (uploadingImages.length > 0) {
				uni.showModal({
					title: '图片上传中',
					content: `有${uploadingImages.length}张图片正在上传，是否等待上传完成后再发布？`,
					confirmText: '等待上传',
					cancelText: '立即发布',
					success: (res) => {
						if (res.confirm) {
							// 用户选择等待上传完成
							uni.showLoading({
								title: '等待图片上传...',
								mask: true
							});
							
							// 创建一个检查函数，每秒检查一次是否所有图片都已上传完成
							const checkInterval = setInterval(() => {
								const stillUploading = editor.querySelectorAll('img[data-status="uploading"]');
								if (stillUploading.length === 0) {
									// 所有图片已上传完成
									clearInterval(checkInterval);
									uni.hideLoading();
									this.finalizeSubmit();
								}
							}, 1000);
							
							// 设置最长等待时间（30秒）
							setTimeout(() => {
								clearInterval(checkInterval);
								uni.hideLoading();
								uni.showModal({
									title: '上传超时',
									content: '部分图片上传时间过长，您可以选择继续等待或立即发布（未上传完成的图片将显示为本地预览）',
									confirmText: '立即发布',
									cancelText: '继续等待',
									success: (res) => {
										if (res.confirm) {
											this.finalizeSubmit();
										} else {
											// 继续等待，重新开始检查
											this.submitBlog();
										}
									}
								});
							}, 30000);
						} else {
							// 用户选择立即发布
							this.finalizeSubmit();
						}
					}
				});
			} else {
				// 没有正在上传的图片，直接发布
				this.finalizeSubmit();
			}
		},

		// 完成博客提交
		async finalizeSubmit() {
			const editor = document.querySelector('.blog-editor');

			try {
								// 获取编辑器中的所有图片
				const images = [];
				const imgElements = editor.querySelectorAll('img');
				imgElements.forEach(img => {
					// 优先使用云端地址，如果没有则使用本地地址
					const imageUrl = img.dataset.cloudSrc || img.src;
					images.push(imageUrl);
				});
				
				// 处理编辑器内容，替换所有包装器
				let content = editor.innerHTML;
				const tempDiv = document.createElement('div');
				tempDiv.innerHTML = content;
				
				// 处理所有图片包装器
				const wrappers = tempDiv.querySelectorAll('div[id$="-wrapper"]');
				wrappers.forEach(wrapper => {
					const img = wrapper.querySelector('img');
					if (img) {
						wrapper.parentNode.insertBefore(img, wrapper);
						wrapper.remove();
					}
				});
				
				// 移除所有上传标签
				const labels = tempDiv.querySelectorAll('div[id$="-label"]');
				labels.forEach(label => label.remove());
				
				// 清理图片属性
				const allImages = tempDiv.querySelectorAll('img');
				allImages.forEach(img => {
					// 移除状态属性和内联样式
					img.removeAttribute('data-status');
					img.style.filter = '';
					img.style.border = '';
					// 移除可能添加的点击事件处理
					img.removeAttribute('onclick');
				});
				
				let action = 'create';
				let data = {
					content: tempDiv.innerHTML,
					images: images
				};
				
				// 如果是编辑现有博客
				if (this.editingBlogId) {
					action = 'update';
					data.id = this.editingBlogId;
				}
				
				// 显示加载提示
				uni.showLoading({
					title: '保存中...',
					mask: true
				});
				
				// 保存博客内容到数据库
				const result = await uniCloud.callFunction({
					name: 'blog',
					data: {
						action: action,
						data: data
					}
				});
				
				uni.hideLoading();

				console.log('result::: ', result);
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
					
					// 在博客列表加载完成后，为图片添加点击事件并检查内容高度
					this.$nextTick(() => {
						this.blogList.forEach(blog => {
							// 初始化needsMask属性
							blog.needsMask = false;
							this.setupImagePreview(blog);
						});
					});
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

			// 切换展开/收起状态

		// 切换展开/收起状态
		toggleExpand(blog) {
			blog.isExpanded = !blog.isExpanded;
			// 在展开/收起状态变化后，重新设置图片点击事件和检查内容高度
			this.$nextTick(() => {
				this.setupImagePreview(blog);
				// 如果收起状态，需要重新检查是否需要遮罩层
				if (!blog.isExpanded) {
					this.checkContentHeight(blog);
				}
			});
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
					console.log('result::: ', result);
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
		},
		clearEditor() {
			const editor = document.querySelector('.blog-editor');
			if (editor) {
				editor.innerHTML = '';
			}
			this.editingBlogId = null;
			uni.showToast({
				title: '已清空编辑器',
				icon: 'none'
			});
		}
	}
}
</script>
/* 图标样式 */
<style lang="scss">
/* 图片预览模态框样式 */
.image-preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.9);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease;

  .preview-image {
    max-width: 90%;
    max-height: 90%;
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
    animation: scaleIn 0.3s ease;
  }

  .close-preview-btn {
    position: absolute;
    top: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.2);
    color: white;
    font-size: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background-color: rgba(255, 255, 255, 0.3);
      transform: scale(1.1);
    }
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

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

					.content-mask {
						display: none;
					}
				}

				.blog-content {
					position: relative;
					z-index: 1;
					font-size: 28rpx;
					line-height: 1.6;
					color: #333;
					white-space: pre-wrap;
				}

				.content-mask {
					position: absolute;
					left: 0;
					right: 0;
					bottom: 0;
					height: 40rpx;
					background: linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 70%, rgba(255,255,255,1) 100%);
					z-index: 3;
					display: flex;
					align-items: flex-end;
					justify-content: center;
					padding-bottom: 10rpx;
					cursor: pointer;

					&::after {
						content: '点击展开';
						font-size: 24rpx;
						color: #999;
						background: rgba(255, 255, 255, 0.8);
						padding: 4rpx 20rpx;
						border-radius: 30rpx;
					}
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
			display: flex;
			align-items: center;

			.action-btn {
				display: none;
				width: 60rpx;
				height: 60rpx;
				border-radius: 50%;
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

.blog-item:hover .blog-footer .blog-actions .action-btn {
	display: flex;
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
		border-radius: 12px 12px 0 0;
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

		/* 编辑器工具栏样式 */
	.editor-toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12rpx 20rpx;
		background-color: #fafbfc;
		border-radius: 0 0 12px 12px;
		border-top: 1px solid #f0f0f0;

		.toolbar-actions {
			display: flex;
			align-items: center;
			gap: 10rpx;
		}

		.toolbar-btn {
			display: flex;
			align-items: center;
			padding: 12rpx 24rpx;
			border-radius: 8rpx;
			cursor: pointer;
			transition: all 0.2s ease;

			.toolbar-icon {
				width: 40rpx;
				height: 40rpx;
				margin-right: 8rpx;
			}

			.toolbar-text {
				font-size: 28rpx;
			}

			&.image-btn {
				color: #1890ff;
				background-color: rgba(24, 144, 255, 0.1);

				&:active {
					background-color: rgba(24, 144, 255, 0.2);
				}
			}

			&.clear-btn {
				color: #999;
				background-color: rgba(0, 0, 0, 0.05);

				&:active {
					background-color: rgba(0, 0, 0, 0.1);
				}
			}

			&.submit-btn {
				color: white;
				background-color: #ff9a9e;
				padding: 12rpx 36rpx;

				&:active {
					background-color: #ff7c82;
				}
			}
		}
	}
}

/* 这里删除了不再需要的上传状态指示器和拖放提示样式，因为现在使用uni-app的原生提示功能 */

/* 添加旋转动画 */
@keyframes spin {
	0% { transform: rotate(0deg); }
	100% { transform: rotate(360deg); }
}


</style>