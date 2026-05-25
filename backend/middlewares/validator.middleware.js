import Joi from 'joi'

const validate = (schema) => {

    return (req, res, next) => {

        const {error, value} = schema.validate(req.body, {abortEarly: true});

        if(error) {

            //const errors = error.details.map((detail) => [detail.message, detail.path])
            //console.log(errors);

             return res.status(400).json({
                success: false,
                message: "invalid request",
                error: error.details
            })
        }

        req.body = value;
        next();

    }
}

export {validate}