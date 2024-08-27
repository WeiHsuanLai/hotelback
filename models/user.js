import { Schema, model, ObjectId, Error } from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcrypt';
import UserRole from '../enums/UserRole.js';

// 建立購物車結構
const cartSchema = Schema({
  p_id: {
    type: ObjectId,
    ref: 'products',
    required: [true, '使用者購物車商品必填']
  },
  quantity: {
    type: Number,
    required: [true, '使用者購物車商品數量必填'],
    min: [1, '使用者購物車商品數量不符']
  },
  date: {
    type: [Date]
  }
});

// 將日期轉換為 UTC+8 時區的邏輯
cartSchema.pre('save', function (next) {
  if (!Array.isArray(this.date)) {
    this.date = [this.date];
  }

  this.date = this.date.map(dateStr => {
    const dateUTC = new Date(dateStr);
    return new Date(dateUTC.getTime() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
  });

  next();
});

// 建立使用者結構
const schema = new Schema(
  {
    account: {
      type: String,
      required: [true, '使用者帳號必填'],
      minlength: [4, '使用者帳號長度不符'],
      maxlength: [20, '使用者帳號長度不符'],
      unique: true,
      validate: {
        validator(value) {
          return validator.isAlphanumeric(value);
        },
        message: '使用者帳號格式錯誤'
      }
    },
    password: {
      type: String,
      required: [true, '使用者密碼必填']
    },
    email: {
      type: String,
      required: [true, '使用者信箱必填'],
      unique: true,
      validate: {
        validator(value) {
          return validator.isEmail(value);
        },
        message: '使用者信箱格式錯誤'
      }
    },
    name: {
      type: [String],
      required: [true, '使用者真實姓名必填'],
    },
    tokens: {
      type: [String]
    },
    cart: {
      type: [cartSchema]
    },
    role: {
      type: Number,
      default: UserRole.USER
    },
    image: {
      type: String,
      required: [true, '商品圖片必填'],
      default() {
        return `https://api.multiavatar.com/${this.account}.png`;
      }
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// 密碼哈希處理
schema.pre('save', function (next) {
  const user = this;
  if (user.isModified('password')) {
    if (user.password.length < 4 || user.password.length > 20) {
      const error = new Error.ValidationError();
      error.addError('password', new Error.ValidatorError({ message: '使用者密碼長度不符' }));
      next(error);
      return;
    } else {
      user.password = bcrypt.hashSync(user.password, 10);
    }
  }
  next();
});

// 計算購物車總數量
schema.virtual('cartQuantity').get(function () {
  const user = this;
  return user.cart.reduce((total, current) => {
    return total + current.quantity;
  }, 0);
});

schema.pre('save', async function (next) {
  const user = this;
  
  if (user.isModified('cart')) {
    // 處理購物車
    if (user.cart.length > 0) {
      user.cart.forEach(cartItem => {
        if (cartItem.date.length > 1) {
          cartItem.date.pop(); // 送出前刪除最後一天
        }
      });
    }
  }
  
  next();
});

// // 保存購物車並刪除最後一天
// async function saveUserCart(user) {
//   if (user.cart.length > 0) {
//     user.cart.forEach(cartItem => {
//       if (cartItem.date.length > 1) {
//         cartItem.date.pop(); // 送出前刪除最後一天
//       }
//     });
    
//     await user.save(); // 保存用戶
//   }
// }

// 導出模型
export default model('users', schema);
