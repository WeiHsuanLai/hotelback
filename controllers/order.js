import Order from '../models/order.js'
import User from '../models/user.js'
import Product from '../models/product.js'
import { StatusCodes } from 'http-status-codes'

export const create = async (req, res) => {
  try {
    // 檢查購物車有沒有東西
    if (req.user.cart.length === 0) throw new Error('EMPTY')
    console.log('req.user', req.user)
  console.log('=========================================');
  console.log('req.user.cart',req.user.cart[0].quantity)
    // console.log(req.user.cart.quantity);
    if (req.user.cart[0].quantity > 0) {
      const findProduct = await Product.findById(req.user.cart[0].p_id)
      // const updatedProduct = await Product.findByIdAndUpdate(
      //   req.user.cart[0].p_id,        // 查找的 ID
      //   { $set: { quantity: findProduct.quantity - req.user.cart[0].quantity } }, // 更新的字段
      //   { runValidators: true, new: true } // 選項: 運行驗證器並返回更新後的文檔
      // ).orFail(new Error('NOT FOUND')); // 如果沒有找到文檔，則拋出錯誤
    }
    if (req.user.cart[0].quantity === 0) {
      
    }
    // 檢查有沒有下架商品
    const user = await User.findById(req.user._id, 'cart').populate('cart.p_id')
    const ok = user.cart.every(item => item.p_id.sell)
    if (!ok) throw new Error('SELL')
    // 建立訂單
    await Order.create({
      user: req.user._id,
      cart: req.user.cart
    })
    // 清空購物車
    req.user.cart = []
    await req.user.save()

    res.status(StatusCodes.OK).json({
      success: true,
      message: ''
    })
  } catch (error) {
    if (error.name === 'EMPTY') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: true,
        message: '購物車是空的'
      })
    } else if (error.name === 'SELL') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: true,
        message: '包含下架商品'
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

export const get = async (req, res) => {
  try {
    const result = await Order.find({ user: req.user._id }).populate('cart.p_id')
    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result
    })
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '未知錯誤'
    })
  }
}

export const getAll = async (req, res) => {
  try {
    const result = await Order.find().populate('user', 'account').populate('cart.p_id')
    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result
    })
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '未知錯誤'
    })
  }
}