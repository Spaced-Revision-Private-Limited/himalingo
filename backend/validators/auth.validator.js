import Joi from 'joi'

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
})

const signUpSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(16).required()
})


export { loginSchema, signUpSchema }