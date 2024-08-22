import { Schema, model } from 'mongoose'
const schema = new Schema({
  image: {
    type: String,
    required: [true, '商品圖片必填']
  },
}, {
  timestamps: true,
  versionKey: false
})

export default model('photo', schema)