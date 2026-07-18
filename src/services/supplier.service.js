const httpStatus = require('http-status');

const { Supplier } = require('../models');

const ApiError = require('../utils/ApiError');

const createSupplier = async (body) => {
  const exists = await Supplier.findOne({
    name: { $regex: new RegExp(`^${body.name}$`, 'i') },
  });
  if (exists) {
    throw new ApiError(httpStatus.CONFLICT, `Supplier "${body.name}" already exists.`);
  }
  return Supplier.create(body);
};

const querySuppliers = async (filter = {}, options = {}) => {
  const { page = 1, limit = 20, sortBy = 'name', sortOrder = 'asc' } = options;
  const query = {};

  if (filter.search) query.$text = { $search: filter.search };
  if (filter.isActive !== undefined) query.isActive = filter.isActive;

  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [results, total] = await Promise.all([
    Supplier.find(query).sort(sort).skip(skip).limit(Number(limit)),
    Supplier.countDocuments(query),
  ]);

  return {
    results,
    total,
    page: Number(page),
    limit: Number(limit),
    pages: Math.ceil(total / Number(limit)),
  };
};

/* const querySuppliers = async (filter, options) => {
  const suppliers = await Supplier.paginate(filter, options);
  return suppliers;
}; */

const getSupplierById = async (id) => {
  const supplier = await Supplier.findById(id);
  if (!supplier) throw new ApiError(httpStatus.NOT_FOUND, 'Supplier not found.');
  return supplier;
};

const updateSupplierById = async (id, updateBody) => {
  const supplier = await getSupplierById(id);

  if (updateBody.name && updateBody.name !== supplier.name) {
    const duplicate = await Supplier.findOne({
      name: { $regex: new RegExp(`^${updateBody.name}$`, 'i') },
      _id: { $ne: id },
    });
    if (duplicate) {
      throw new ApiError(httpStatus.CONFLICT, `Supplier "${updateBody.name}" already exists.`);
    }
  }

  Object.assign(supplier, updateBody);
  await supplier.save();
  return supplier;
};

const deleteSupplierById = async (id) => {
  const supplier = await getSupplierById(id);
  supplier.isActive = false;
  await supplier.save();
  return supplier;
};

module.exports = {
  createSupplier,
  querySuppliers,
  getSupplierById,
  updateSupplierById,
  deleteSupplierById,
};
