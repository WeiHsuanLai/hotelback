// 引入passport模組，用於身份驗證。
import passport from 'passport'
// 引入passport-local模組，用於實現本地身份驗證策略。
import passportLocal from 'passport-local'
// 引入passport-jwt模組，用於實現基於JWT的身份驗證策略。
import passportJWT from 'passport-jwt'
// 引入bcrypt模組，用於密碼的哈希和比較。
import bcrypt from 'bcrypt'
// 引入User模型，用於與資料庫中的用戶數據進行交互。
import User from '../models/user.js'

// 本地身份驗證策略（Local Strategy）

// 使用Passport.js的use方法註冊一個新的本地身份驗證策略，命名為'login'。
passport.use('login', new passportLocal.Strategy({
  // 設定在驗證請求中，哪個字段被視為用戶名（username）。
  usernameField: 'account',
  // 設定在驗證請求中，哪個字段被視為密碼（password）。
  passwordField: 'password'
},
// (account, password, done) =>: 這部分定義了函數的參數列表。在Passport.js的本地身份驗證策略中，這些參數通常包括：
// account: 使用者提供的帳號信息，對應於你設定的usernameField。
// password: 使用者提供的密碼。
// done: 一個由Passport.js提供的回調函數，用於通知Passport.js身份驗證過程的結果。你需要根據驗證結果以不同的方式調用這個函數。
async (account, password, done) => {
  try {
    // User.findOne 是 Mongoose 庫中的一個方法，用於在資料庫中尋找滿足特定條件的第一個文件。
    const user = await User.findOne({ account })
    if (!user) {
      // throw new Error('')語句用於拋出一個帶有訊息的錯誤
      throw new Error('ACCOUNT')
    }
    // bcrypt.compareSync(password, user.password)：這是 bcrypt 庫提供的一個同步方法，用於比較兩個密碼是否相同。
    // 第一個參數是要比較的明文密碼（在這裡是 password），第二個參數是要與之比較的密文密碼（在這裡是 user.password）。
    // bcrypt 會自動將第一個參數轉換為相同的哈希格式，然後進行比較。
    if (!bcrypt.compareSync(password, user.password)) {
      throw new Error('PASSWORD')
    }
    // 如果帳號和密碼都正確，調用done函數返回用戶對象，表示身份驗證成功。
    return done(null, user, null)
  }
  // 根據不同的錯誤去處理
  catch (error) {
    console.log(error)
    if (error.message === 'ACCOUNT') {
      return done(null, null, { message: '使用者帳號不存在' })
    } else if (error.message === 'PASSWORD') {
      return done(null, null, { message: '使用者密碼錯誤' })
    } else {
      return done(null, null, { message: '未知錯誤' })
    }
  }
}))

// JWT身份驗證策略（JWT Strategy）
passport.use('jwt', new passportJWT.Strategy({
  // 從請求中提取JWT。
  jwtFromRequest: passportJWT.ExtractJwt.fromAuthHeaderAsBearerToken(),
  // 用於驗證JWT簽名的密鑰或秘鑰。
  secretOrKey: process.env.JWT_SECRET,
  // 當設置為true時，將請求對象（req）作為驗證回調函數的第一個參數傳遞。
  // 如果沒有設定為 true 預設就只有 payload, done 這兩個參數
  passReqToCallback: true,
  // 當設置為true時，在驗證過程中忽略JWT的到期時間
  ignoreExpiration: true
}, async (req, payload, done) => {
  try {
    // payload.exp * 1000：這一步將exp的值從秒轉換為毫秒，因為JavaScript的Date對象使用毫秒作為時間單位。
    const expired = payload.exp * 1000 < new Date().getTime()

    /*
      http://localhost:4000/user/test?aaa=111&bbb=222
      req.originUrl = /user/test?aaa=111&bbb=222
      req.baseUrl = /user
      req.path = /test
      req.query = { aaa: 111, bbb: 222 }
    */
    const url = req.baseUrl + req.path
    // 如果JWT已經過期且URL不匹配'/user/extend'或'/user/logout'，則拋出錯誤。
    if (expired && url !== '/user/extend' && url !== '/user/logout') {
      throw new Error('EXPIRED')
    }

    // 再次從Authorization標頭中提取JWT。
    const token = passportJWT.ExtractJwt.fromAuthHeaderAsBearerToken()(req)
    // 嘗試在資料庫中找到與JWT載荷中的_id相符且擁有匹配提取到的JWT的使用者。
    const user = await User.findOne({ _id: payload._id, tokens: token })
    // 如果找不到這樣的使用者，則拋出錯誤。
    if (!user) {
      throw new Error('JWT')
    }
    // 驗證成功後，返回包含使用者和JWT的結果。
    return done(null, { user, token }, null)
  } catch (error) {
    console.log(error)
    // 根據錯誤類型返回自定義錯誤消息。
    if (error.message === 'EXPIRED') {
      return done(null, null, { message: '登入過期' })
    } else if (error.message === 'JWT') {
      return done(null, null, { message: '登入無效' })
    } else {
      return done(null, null, { message: '未知錯誤' })
    }
  }
}))
