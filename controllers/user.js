import User from '../models/user.js'
import Product from '../models/product.js'
import { StatusCodes } from 'http-status-codes'
import jwt from 'jsonwebtoken'
import validator from 'validator'

// ：定義一個異步函數create，用於處理用戶註冊請求。
export const create = async (req, res) => {
	try {
		await User.create(req.body)
		res.status(StatusCodes.OK).json({
			success: true,
			message: '註冊成功'
		})
	} catch (error) {
		if (error.name === 'ValidationError') {
			// 驗證錯誤
			// 第一個驗證失敗欄位名稱
			//  Object.keys() 把物件的 key 變成一個陣列 然後取 error.errors 的第一個欄位
			const key = Object.keys(error.errors)[0]
			// 再來取錯誤訊息
			const message = error.errors[key].message
			res.status(StatusCodes.BAD_REQUEST).json({
				success: false,
				message
			})
		} else if (error.name === 'MongoServerError' && error.code === 11000) {
			// 資料重複 unique 錯誤會回傳給使用者
			res.status(StatusCodes.CONFLICT).json({
				success: false,
				message: '帳號已註冊'
			})
		} else {
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				success: false,
				message: '未知錯誤'
			})
		}
	}
}

// 這邊要用 async 因為要遷 jwt 後放資料庫
// 定義一個異步函數login，用於處理用戶登錄請求。
export const login = async (req, res) => {
	try {
		// 使用jwt.sign方法生成一個JWT。這個方法接受三個參數：要加密的payload（在這裡是用戶的ID）、一個秘鑰（在這裡是從環境變量中取得的JWT_SECRET），以及一個選項對象，其中指定了Token的有效期為7天。
		const token = jwt.sign({ _id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7 day' })
		// 將新生成的JWT添加到用戶的令牌列表中。
		req.user.tokens.push(token)
		// 保存用戶資料，包括新的令牌。這一步是異步的，因此使用await關鍵字等待操作完成
		await req.user.save()
		res.status(StatusCodes.OK).json({
			success: true,
			message: '登入成功',
			// 回傳前端會用到的資訊
			result: {
				token,
				account: req.user.account,
				name: req.user.name,
				role: req.user.role,
				cart: req.user.cartQuantity,
				image: req.user.image
			}
		})
	} catch (error) {
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
			success: false,
			message: '未知錯誤'
		})
	}
}

// 更新身分令牌
export const extend = async (req, res) => {
	try {
		// 尋找過期令牌
		const idx = req.user.tokens.findIndex((token) => token === req.token)
		// 生誠心令牌
		const token = jwt.sign({ _id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7 days' })
		// 替換舊令牌
		req.user.tokens[idx] = token
		// 保存用戶信息
		await req.user.save()
		res.status(StatusCodes.OK).json({
			success: true,
			message: '更新登入',
			result: token
		})
	} catch (error) {
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
			success: false,
			message: '未知錯誤'
		})
	}
}

// 返回用戶的個人資訊
// 當使用者登入時，我們只會把登入資料存在 localStorage 裡面，使用者重新整理時，我們會重新回應使用者資料回去
export const profile = (req, res) => {
	try {
		res.status(StatusCodes.OK).json({
			success: true,
			message: '已登入',
			result: {
				// 這裡不需要 token 因為已經在前端了
				account: req.user.account,
				name:req.user.name,
				role: req.user.role,
				cart: req.user.cartQuantity,
				image: req.user.image
			}
		})
	} catch (error) {
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
			success: false,
			message: '未知錯誤'
		})
	}
}

// 將 token 從使用者的陣列移除
export const logout = async (req, res) => {
	try {
		// 過濾令牌：使用filter方法從用戶的令牌列表中刪除與req.token相同的令牌。這一步確保了當前請求的令牌不再被用戶持有。
		// filter() 方法 選擇和 req.token 相同的令牌 並建立一個新的 req.user.tokens，其中包含 token 陣列中所有不等於原本 req.token 的元素。
		req.user.tokens = req.user.tokens.filter((token) => token !== req.token)
		// 將更新後的用戶信息保存回資料庫。這一步是異步的，因此需要使用await關鍵字來等待操作完成。
		await req.user.save()
		res.status(StatusCodes.OK).json({
			success: true,
			message: '以登出'
		})
	} catch (error) {
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
			success: false,
			message: '未知錯誤'
		})
	}
}
// 編輯使用者購物車
export const editCart = async (req, res) => {
	try {
		if (!validator.isMongoId(req.body.product)) throw new Error('ID') //檢查每個 ID 是不是跟傳入的數項相同
		const idx = req.user.cart.findIndex((item) => item.p_id.toString() === req.body.product)
		if (idx > -1) {
			// 如果購物車內有商品，檢查修改後的數量
			const quantity = req.user.cart[idx].quantity + parseInt(req.body.quantity)
			if (quantity <= 0) {
				// 如果購物車數量小於 0 或等於 0 就刪除
				req.user.cart.splice(idx, 1)
			} else {
				// 如果修改後還有就修改
				req.user.cart[idx].quantity = quantity
				req.user.cart[idx].date = req.body.date 
			}
		} else {
			// 如果購物車內沒有商品，檢查商品是否存在
			const product = await Product.findById(req.body.product).orFail(new Error('NOT FOUND'))
			if (!product.sell) throw new Error('SELL')
			req.user.cart.push({
				p_id: product._id,
				quantity: req.body.quantity,
				date: req.body.date // 修改
			})
		}
		await req.user.save()
		res.status(StatusCodes.OK).json({
			success: true,
			message: '',
			result: {
				// 修改
				cartQuantity: req.user.cartQuantity,
				date: req.body.date
			}
		})
	} catch (error) {
		console.log(error);
		
		if (error.name === 'CastError' || error.message === 'ID') {
			res.status(StatusCodes.BAD_REQUEST).json({
				success: false,
				message: '商品 ID 格式錯誤'
			})
		} else if (error.message === 'NOT FOUND') {
			res.status(StatusCodes.NOT_FOUND).json({
				success: false,
				message: '查無商品'
			})
		} else if (error.message === 'SELL') {
			res.status(StatusCodes.BAD_REQUEST).json({
				success: false,
				message: '商品已下架'
			})
		} else if (error.name === 'ValidationError') {
			const key = Object.keys(error.errors)[0]
			const message = error.errors[key].message
			res.status(StatusCodes.BAD_REQUEST).json({
				success: false,
				message
			})
		} else {
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				success: false,
				message: '未知錯誤'
			})
		}
	}
}

export const getCart = async (req, res) => {
	try {
		const result = await User.findById(req.user._id, 'cart').populate('cart.p_id')
		res.status(StatusCodes.OK).json({
			success: true,
			message: '',
			result: result.cart
		})
	} catch (error) {
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
			success: false,
			message: '未知錯誤'
		})
	}
}
