const allRoles = {
  cashier: [
    'getProducts', // needs to see products on POS screen
    'getCategories', // needs categories for product filter
    'getUnits', // needs units for display
    'processCheckout', // core cashier action
    'getTransactions', // can view their own transactions only (enforced in service)
    'manageShift', // open and close their own shift
  ],
  owner: [
    'getUsers',
    'manageUsers',
    'processCheckout',
    'manualEntry',
    'getTransactions',
    'manageTransactions',
    'editTransactions',
    'voidTransaction',
    'manageShift',
    'createSupplier',
    'getSuppliers',
    'getReports',
    'getAuditLogs',
    'getStockAdjustment',
    'adjustStock',
  ],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
