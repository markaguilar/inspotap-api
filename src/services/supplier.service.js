const { Supplier } = require('../models');

const querySuppliers = async (filter, options) => {
  const suppliers = await Supplier.paginate(filter, options);
  return suppliers;
};

module.exports = {
  querySuppliers,
};
