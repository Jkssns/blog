'use strict';
const db = uniCloud.database()
const blogCollection = db.collection('blogs')

exports.main = async (event, context) => {
	const { action, data } = event
	
	switch (action) {
		case 'createTestData':
			try {
				// 批量插入测试数据
				const result = await blogCollection.add(data)
				return {
					code: 200,
					msg: '创建成功',
					data: result
				}
			} catch (e) {
				return {
					code: 500,
					msg: '创建失败',
					error: e
				}
			}
			
		case 'getList':
			try {
				const { page = 1, pageSize = 10 } = data
				const skip = (page - 1) * pageSize
				
				const result = await blogCollection
					.orderBy('createTime', 'desc')
					.skip(skip)
					.limit(pageSize)
					.get()
				
				return {
					code: 200,
					msg: '获取成功',
					data: result.data
				}
			} catch (e) {
				return {
					code: 500,
					msg: '获取失败',
					error: e
				}
			}
			
		case 'create':
			try {
				const result = await blogCollection.add({
					...data,
					createTime: Date.now()
				})
				
				return {
					code: 200,
					msg: '创建成功',
					data: result
				}
			} catch (e) {
				return {
					code: 500,
					msg: '创建失败',
					error: e
				}
			}
			
		case 'update':
			try {
				const { id, content, images } = data
				
				if (!id) {
					return {
						code: 400,
						msg: '缺少博客ID'
					}
				}
				
				const result = await blogCollection.doc(id).update({
					content,
					images,
					updateTime: Date.now()
				})
				
				return {
					code: 200,
					msg: '更新成功',
					data: result
				}
			} catch (e) {
				return {
					code: 500,
					msg: '更新失败',
					error: e
				}
			}
			
		case 'delete':
			try {
				const { id } = data
				
				if (!id) {
					return {
						code: 400,
						msg: '缺少博客ID'
					}
				}
				
				const result = await blogCollection.doc(id).remove()
				
				return {
					code: 200,
					msg: '删除成功',
					data: result
				}
			} catch (e) {
				return {
					code: 500,
					msg: '删除失败',
					error: e
				}
			}
			
		case 'updateFavorite':
			try {
				const { id, isFavorite } = data
				
				if (!id) {
					return {
						code: 400,
						msg: '缺少博客ID'
					}
				}
				
				const result = await blogCollection.doc(id).update({
					isFavorite: !!isFavorite
				})
				
				return {
					code: 200,
					msg: isFavorite ? '收藏成功' : '取消收藏成功',
					data: result
				}
			} catch (e) {
				return {
					code: 500,
					msg: '操作失败',
					error: e
				}
			}
			
		case 'deleteAll':
			try {
				// 删除所有博客数据
				const result = await blogCollection.remove({})
				
				// 删除所有评论数据
				await db.collection('comments').remove({})
				
				return {
					code: 200,
					msg: '删除成功',
					data: result
				}
			} catch (e) {
				return {
					code: 500,
					msg: '删除失败',
					error: e
				}
			}
			
		default:
			return {
				code: 404,
				msg: '未知操作'
			}
	}
} 