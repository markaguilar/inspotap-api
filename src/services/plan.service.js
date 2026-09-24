const httpStatus = require('http-status');

const ApiError = require('../utils/ApiError');

const { Plan } = require('../models');

export const getAllActivePlans = async () => {
  return Plan.find({ isActive: true }).sort({ price: 1 });
};

export const getPlanByKey = async (key) => {
  const plan = await Plan.findOne({ key, isActive: true });
  if (!plan) throw new ApiError(httpStatus.NOT_FOUND, 'Plan not found');
  return plan;
};

export const getPlanById = async (id) => {
  const plan = await Plan.findById(id);
  if (!plan) throw new ApiError(httpStatus.NOT_FOUND, 'Plan not found');
  return plan;
};

module.exports = { getAllActivePlans, getPlanByKey, getPlanById };
