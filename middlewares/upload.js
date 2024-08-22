import multer from 'multer'                                           // 從npm安裝的multer庫中導入multer模塊
import { v2 as cloudinary } from 'cloudinary'                         // 從cloudinary庫中導入 v2 版本的 cloudinary 模塊
import { CloudinaryStorage } from 'multer-storage-cloudinary'         // 從multer-storage-cloudinary庫中導入CloudinaryStorage模塊
import { StatusCodes } from 'http-status-codes'                       // 從http-status-codes庫中導入StatusCodes模塊
                                                               
cloudinary.config({                                                   // Cloudinary Node.js 庫中的方法，用于配置 Cloudinary 的基本设置。
  cloud_name: process.env.CLOUDINARY_NAME,                            // 設置Cloudinary的cloud_name環境變量
  api_key: process.env.CLOUDINARY_KEY,                                // 設置Cloudinary的api_key環境變量
  api_secret: process.env.CLOUDINARY_SECRET                           // 設置Cloudinary的api_secret環境變量
})

const upload = multer({
  storage: new CloudinaryStorage({ cloudinary }),                     // 使用 multer 庫的 CloudinaryStorage配置，將文件存儲到 Cloudinary
  fileFilter (req, file, callback) {                                  // 文件篩選函數，決定哪些文件可以被接受
    if (['image/jpeg', 'image/png'].includes(file.mimetype)) {        // 檀於JPEG和PNG圖像文件
      callback(null, true)                                            // 表示接受文件
    } else {
      callback(new Error('FORMAT'), false)                            // 表示拒絕文件，並返回一個格式錯誤的錯誤
    }
  },
  limits: {
    fileSize: 1024 * 1024                                             // 設置最大文件大小為1MB
  }
})


export default (req, res, next) => {                                       // 匯出一個中間件函數
  upload.single('image')(req, res, error => {                         // 使用multer的upload.single方法處理單個文件上傳
    if (error instanceof multer.MulterError) {                             // 如果錯誤是由multer引起的
      let message = '上傳錯誤'                                                // 預設錯誤訊息
      if (error.code === 'LIMIT_FILE_SIZE') {                         // 如果錯誤是因文件大小超限
        message = '檔案太大'                                              // 更改錯誤訊息
      }          
      res.status(StatusCodes.BAD_REQUEST).json({                      // 將錯誤響應返回，狀態碼為400（Bad Request）
        success: false,
        message
      })
    } else if (error) {                                               // 如果錯誤不是由multer引起的
      if (error.message === 'FORMAT') {                               // 如果錯誤是因文件格式不符合要求
        res.status(StatusCodes.BAD_REQUEST).json({                    // 將錯誤響應返回，狀態碼為400（Bad Request）
          success: false,
          message: '檔案格式錯誤'
        })
      } else {                                                        // 其他未知錯誤
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({          // 將錯誤響應返回，狀態碼為500（Internal Server Error）
          success: false,
          message: '未知錯誤'
        })
      }
    } else {                                                          // 如果沒有錯誤，繼續執行下一步中間件
      next()
    }
  })
}
