const Joi = require('joi');

const translateValidationSchema = Joi.object({
  text: Joi.string().trim().min(1).max(1000).required().messages({
    'string.empty': 'Please enter some text to translate.',
    'string.min': 'Please enter some text to translate.',
    'string.max': 'Translation text cannot exceed 1000 characters.',
    'any.required': 'Translation text is required.'
  }),
  targetLanguage: Joi.string().valid('Bhutia', 'Lepcha', 'Nepali').required().messages({
    'any.only': 'Unsupported target language selection.',
    'any.required': 'Target language is required.'
  }),
  mode: Joi.string().valid('chat', 'translate').required(),
  chatId: Joi.string().required(),
  history: Joi.string().allow('') // Accept history strings safely
});

const validateTranslate = (req, res, next) => {
  // Run standard Joi body rules
  const { error } = translateValidationSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const errorMessages = error.details.map(detail => detail.message).join(', ');
    return res.status(400).json({ success: false, error: errorMessages });
  }

  // Prevent user from trying to translate Bhutia script into Bhutia text
  if (req.body.mode === 'translate' && req.body.targetLanguage === 'Bhutia') {
    // Character range \u0F00–\u0FFF catches Tibetan/Bhutia alphabets
    const containsBhutiaScript = /[\u0F00-\u0FFF]/.test(req.body.text);
    if (containsBhutiaScript) {
      return res.status(400).json({
        success: false,
        error: 'The source text is already written in Bhutia script.'
      });
    }
  }

  next();
};

module.exports = validateTranslate;