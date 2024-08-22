// passport：passport 是一個Node.js中間件，用於身份驗證。
// 它支持多種身份驗證策略，包括OAuth、JWT、Local等。通過使用passport，你可以輕鬆地實現用戶登錄、登出和身份驗證。
import passport from 'passport'
// http-status-codes：這個模塊提供了一個方便的方式來引用HTTP狀態碼常量。使用這個模塊可以使你的代碼更具可讀性和可維護性，因為你不需要記住每個狀態碼的數字。
import { StatusCodes } from 'http-status-codes'
// jsonwebtoken 用於生成和驗證JSON Web Tokens(JWTs)。JWT是一種開放標準（RFC 7519），用於在不安全的環境中安全地傳遞信息的方法。
// 通過使用JWT，你可以在用戶登錄後為他們發出一個令牌，該令牌包含用戶的身份信息和權限。
// 這樣，當用戶再次訪問應用時，他們可以使用該令牌來驗證自己的身份，而無需重新輸入密碼。
import jsonwebtoken from 'jsonwebtoken'

export const login = (req, res, next) => {
  // 這邊會先跑到 passport 的 login 不管成功或失敗 都會執行後面的 ifelse代碼
  passport.authenticate('login', { session: false }, (error, user, info) => {
    if (!user || error) {
      if (info.message === 'Missing credentials') {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: '輸入欄位錯誤'
        })
        return
      } else if (info.message === '未知錯誤') {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: '未知錯誤'
        })
        return
      } else {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: info.message
        })
        return
      }
    }
    req.user = user
    next()
  })(req, res, next)
}

export const jwt = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (error, data, info) => {
    if (error || !data) {
      if (info instanceof jsonwebtoken.JsonWebTokenError) {
        res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: '登入無效'
        })
      } else if (info.message === '未知錯誤') {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: '未知錯誤'
        })
      } else {
        res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: info.message
        })
      }
      return
    }
    req.user = data.user
    req.token = data.token
    next()
  })(req, res, next)
}
