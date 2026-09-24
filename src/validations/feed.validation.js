import Joi from 'joi';
import { objectId } from './custom.validation';

// eslint-disable-next-line import/prefer-default-export
const getFeed = {
  query: Joi.object().keys({
    cursor: Joi.string().custom(objectId),
    limit: Joi.number().integer().min(1).max(50),
  }),
};

module.exports = { getFeed };
