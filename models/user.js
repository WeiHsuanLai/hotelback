// 建立 Schema 因為是物件所以要用 {  }
// Schema 功能是數據架構驗證
import { Schema, model, ObjectId, Error } from 'mongoose'
// validator 用來數據驗證
import validator from 'validator'
// bcrypt 密碼哈希處理
import bcrypt from 'bcrypt'
// 引入管理權限
import UserRole from '../enums/UserRole.js'

// 建立購物車結構
const cartSchema = Schema({
	p_id: {
		type: ObjectId,
		// 使用 ref 跟 product 做連結
		ref: 'products',
		required: [true, '使用者購物車商品必填']
	},
	quantity: {
		type: Number,
		required: [true, '使用者購物車商品數量必填'],
		min: [1, '使用者購物車商品數量不符']
	},
	date: {
		type: [Date] // 修改
	}
})
cartSchema.pre('save', function(next) {
  // 確保 this.date 是一個陣列
  if (Array.isArray(this.date)) {
    this.date = this.date.map(dateStr => {
      const dateUTC = new Date(dateStr);
      // 將日期轉換為 UTC+8 時區
      return new Date(dateUTC.getTime() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
    });
  } else if (typeof this.date === 'string') {
    const dateUTC = new Date(this.date);
    // 將日期轉換為 UTC+8 時區
    this.date = new Date(dateUTC.getTime() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
  }
  next();
});

// 建立使用者結構
const schema = new Schema(
	{
		// 資料欄位名稱
		account: {
			// 設定資料型態
			type: String,
			// required 是用來設定是否為必填 true 為必填
			required: [true, '使用者帳號必填'],
			// 限制文字長度
			minlength: [4, '使用者帳號長度不符'],
			maxlength: [20, '使用者帳號長度不符'],
			// unique: true 表示這個值必須為唯一
			unique: true,
			// isAlphanumeric 方法用於檢查給定的字符串是否只包含字母（不區分大小寫）和數字。如果字符串完全由字母和數字組成，則該方法返回 true；否則，它返回 false。
			validate: {
				validator(value) {
					return validator.isAlphanumeric(value)
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
				// 自訂驗證 function
				// Validator(value) 是 mongoose 的設定, return validator.isEmail(value) 是我們引用的套件
				validator(value) {
					return validator.isEmail(value)
				},
				// 自訂驗證錯誤訊息
				message: '使用者信箱格式錯誤'
			}
		},
		name: {
			type: [String],
			required: [true, '使用者真實姓名必填'],
		}
		,
		// 登入 tokens 身份驗證令牌
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
				return `https://api.multiavatar.com/${this.account}.png`
			}
		}
	},
	{
		// 帳號建立時間
		timestamps: true,
		// 把 __v 去除 versionKey 是為了記錄資料改了幾次
		versionKey: false
	}
)

// Schema.pre() 方法用於註冊一個預保存的中介件，這意味著在每次保存文檔之前，Mongoose 都會執行這個函數
schema.pre('save', function (next) {
	// this 引用正在被保存的文檔。因此，user 變量現在指向這個文檔。
	const user = this
	// isModified(path) 方法檢查指定的路徑（在這個例子中是 'password'）是否在最後一次保存或更新之後被修改過。
	if (user.isModified('password')) {
		if (user.password.length < 4 || user.password.length > 20) {
			// 這行代碼創建了一個新的 ValidationError 實例，用於表示驗證錯誤
			const error = new Error.ValidationError()
			// addError(name, error) 方法用於添加一個錯誤到驗證錯誤對象中
			error.addError('password', new Error.ValidatorError({ message: '使用者密碼長度不符' }))
			// next(error) 函數用於將錯誤傳遞給下一個中介件或終止保存操作。如果在中介件中引發了錯誤，則不應呼叫 next()，以阻止保存操作繼續。
			next(error)
			// return 語句立即退出函數，防止代碼繼續執行到 else 塊
			return
		} else {
			// 如果密碼長度符合要求，則使用 bcrypt.hashSync 方法同步哈希密碼。這一步骤將用戶輸入的明文密碼轉換為哈希值，以增加安全性。
			// bcrypt.hashSync(password, saltRounds) 方法接收兩個參數：要哈希的密碼和塩值的迭代次數。在這個例子中，塩值的迭代次數設為 10
			// bcrypt.hashSync(user.password, 10) 就是用來產生這個「哈希值」的工具。它接受兩個參數：你想要加密的密碼（在這裡是 user.password）
			// ，以及一個數字（在這裡是 10），這個數字決定了用來生成哈希值的「塩值」的迭代次數。塩值是一種隨機數據，用於增加哈希值的獨特性，有助於
			// 防止攻擊者通過預測或暴力破解來猜測原始密碼。
			user.password = bcrypt.hashSync(user.password, 10)
		}
	}
	next()
})

// virtual 建立虛擬字段 （virtual field）
// 虛擬字段不是存儲在 MongoDB 中的實際數據，而是基於其他字段計算得出的值。
// cartQuantity 虛擬字段計算的是用戶購物車中商品的總數量。
// 這裡不能寫箭頭函式，因為箭頭函式不能使用 this，就無法取得使用者的資料
schema.virtual('cartQuantity').get(function () {
	const user = this
	// reduce 方法用於遍歷陣列中的每個元素，並將其累加到一個總計中。在這裡，reduce 用於計算購物車中所有商品的總數量。
	// total 是累加器，初始值設定為 0，也就是 },0 ，代表累加的結果
	// current 是當前陣列元素的值，代表購物車中每個商品的數量。
	return user.cart.reduce((total, current) => {
		return total + current.quantity
	}, 0)
})

// 創建一個名為 'models_users' 的模型，該模型根據提供的 schema 定義來操作 MongoDB 集合，並將這個模型導出，以便在其他模塊中使用。這樣做的好處是，
// 你可以在不同的文件中重用相同的模型定義，而不需要在每個文件中都重新定義。
// 導出模型
// model(collection 名稱 ,schema)
export default model('users', schema)
