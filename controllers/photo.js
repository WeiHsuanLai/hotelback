import { StatusCodes } from 'http-status-codes' 

export const create = async (req, res) => {     
  try {                                         
    req.user.image = req.file.path              
    await req.user.save()                       
    res.status(StatusCodes.OK).json({           
      success: true,
      message: '',
      result :req.file.path
    })
  } catch (error) {
    console.log(error);
    
    if (error.name === 'ValidationError') {
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