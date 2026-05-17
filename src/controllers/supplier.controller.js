const catchAsync = require('../utils/catchAsync');
const pick = require('../utils/pick');

const { supplierService } = require('../services');

const getSuppliers = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  const suppliers = await supplierService.querySuppliers(filter, options);

  res.send(suppliers);
});

module.exports = {
  getSuppliers,
};
